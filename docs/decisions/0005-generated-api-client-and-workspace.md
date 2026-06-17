# ADR-0005: Generate a typed, tags-split TanStack Query client and distribute it as a pnpm workspace package

- **Status:** Accepted
- **Date:** 2026-06-15
- **Deciders:** Carlos (owner), architecture review
- **Context phase:** A1 (BFF consolidation), A1-plan-3 (typed API client + workspace)
- **Relates to:** [ADR-0001](0001-idp-vs-demo-app-boundary.md), [ADR-0004](0004-per-app-access-enforcement-dual-mode.md)

## Context

Nova ID has three browser SPAs — `frontend-auth`, `frontend-admin`, and `frontend-app` — that all
consume the NestJS BFF (`api:8080`) behind the Oathkeeper gateway. Until now each SPA hand-rolled
its own `fetch()` calls. This produced three concrete problems:

1. **Duplication.** The same endpoint was wired up by hand in two or three apps, each with its own
   URL strings, header setup, and error handling. A change to a BFF route meant editing every SPA.
2. **No types.** Request and response shapes were untyped (`any`/`unknown` at the boundary). A
   renamed field or changed status code surfaced only at runtime, in the browser, often after
   shipping.
3. **Drift.** Nothing tied the client code to the BFF's actual contract. The hand-written calls
   could (and did) silently diverge from what the BFF served. There was no compile-time signal when
   the backend changed.

The BFF already exposes an OpenAPI surface (NestJS + `@nestjs/swagger`), so the contract exists as
machine-readable data. The forces at play:

- We want a **single source of truth** for the client: the contract the BFF actually publishes, not
  three hand-maintained copies.
- We want **end-to-end type safety** so a backend contract change is caught at compile time in every
  SPA, not at runtime.
- We must **not** let the demo app's surface leak into the IdP client. Per
  [ADR-0001](0001-idp-vs-demo-app-boundary.md) the demo (`/api-test/*`) is a quarantined concern; an
  IdP client must expose only IdP operations.
- The SPAs all authenticate **same-origin via the Oathkeeper gateway using the Kratos session
  cookie** — the browser never holds a Bearer token (consistent with
  [ADR-0004](0004-per-app-access-enforcement-dual-mode.md) Mode A). The client transport must reflect
  that: one place that sets `withCredentials` and the `/api` base path, not per-call boilerplate.
- Server state (lists, entities fetched from the BFF) needs caching, deduplication, and
  invalidation. Re-implementing that per SPA is wasteful and error-prone.

## Decision

**Generate a typed, tags-split [TanStack Query](https://tanstack.com/query/latest/docs/framework/vue/overview)
client with [orval](https://orval.dev/docs/guides/vue-query/) from a tag-filtered OpenAPI spec, and
distribute it as a [pnpm workspace](https://pnpm.io/workspaces) package `@nova-id/api-client`
consumed as TypeScript source.**

1. **Codegen with orval (v8.17.0), `@tanstack/vue-query` (v5.100.9) target, over axios.** orval reads
   the BFF's OpenAPI spec and emits typed query/mutation hooks plus TypeScript models. Output is
   **tags-split** — one file per OpenAPI tag — so consumers import only the slice they use.

2. **A custom axios mutator owns the transport.** `src/mutator/custom-instance.ts` configures one
   axios instance with `baseURL: '/api'` and `withCredentials: true`. Every generated call goes
   same-origin through the Oathkeeper gateway and carries the Kratos session cookie; the browser
   never sees or sets a Bearer token. This keeps the client aligned with the cookie-session model of
   [ADR-0004](0004-per-app-access-enforcement-dual-mode.md) (Mode A) and centralises transport
   concerns in exactly one place.

3. **Distributed as a pnpm workspace package, consumed as TS source.** The generated code lives in
   `packages/api-client` as `@nova-id/api-client`; the SPAs depend on it via `workspace:*`. There is
   **no build step** for the package — the SPAs' Vite build transpiles the TypeScript source
   directly. This keeps the toolchain simple and avoids a stale published artifact.

4. **The spec is tag-filtered to the IdP surface (boundary enforcement).** The BFF's export script
   `api/scripts/generate-openapi.ts` boots Nest and writes `api/openapi.json` **filtered to only the
   operations tagged `admin`, `me`, and `auth`**. Demo endpoints (`/api-test/*`, untagged) are dropped
   from the spec and therefore can never reach the generated client. This makes the
   [ADR-0001](0001-idp-vs-demo-app-boundary.md) boundary enforced *at the spec level* — by
   construction, not by convention. `frontend-app` keeps its `/api-test/*` demo calls separate and
   outside the IdP client.

5. **Commit the contract, gitignore the generated code, drift-check in CI.** The source contract
   `api/openapi.json` **is committed** — its PR diff is the human-reviewable record of contract
   changes. The generated client (`packages/api-client/src/generated/`, `src/model/`) is **gitignored**
   and regenerated on demand via `pnpm client:gen`. CI runs an `openapi:verify` step that regenerates
   the spec and fails on `git diff --exit-code`, catching any drift between the BFF and the committed
   contract. This follows the validated "commit the contract, generate the client in the build"
   practice (see Sources).

6. **No Pinia.** Server state is owned by TanStack Query (caching, invalidation, deduplication).
   There is no client-state requirement that TanStack Query does not cover, so a separate state
   library is deliberately not adopted now.

## Alternatives considered

- **Keep hand-written `fetch()` clients per SPA.** Rejected — this is the status quo that caused the
  duplication, lack of types, and drift described in *Context*. It scales linearly worse with each
  new endpoint and each new SPA.
- **`openapi-typescript` (types only).** Rejected — it generates types from the spec but no hooks or
  fetching layer, so each SPA would still hand-write calls and wire its own caching. Solves the
  typing problem but not the duplication or server-state problems.
- **tRPC.** Rejected — tRPC couples the client to the *server's internal* TypeScript types and RPC
  procedures rather than a published REST contract. Nova ID is a REST BFF sitting behind an
  OAuth2/OIDC gateway and serving third-party clients; an OpenAPI contract is the right interface
  boundary, and tRPC would not fit third-party consumers or the gateway model.
- **Plain generated axios functions (no query hooks).** Rejected — typed call functions without
  TanStack Query give us no caching, no request deduplication, and no declarative invalidation; each
  SPA would re-implement server-state management.
- **Adopt Pinia for server state.** Rejected — server state belongs in TanStack Query, which is
  purpose-built for it (staleness, background refetch, cache invalidation). Pinia is a client-state
  store; there is no client-state need yet, so adding it now is premature.

## Consequences

### Positive

- **Type-safe end-to-end.** Request/response shapes are generated from the BFF's own contract;
  consumers get full TypeScript types and IDE completion at the call site.
- **Contract drift caught at compile time and in CI.** A backend contract change that is regenerated
  produces changed types; any SPA still using the old shape fails to compile. The `openapi:verify` CI
  step independently fails if the committed `openapi.json` no longer matches the BFF.
- **Single source of truth.** One contract (`api/openapi.json`), one generated client, consumed by
  all three SPAs. A route change is made once in the BFF and flows out via regeneration.
- **Boundary enforced by construction.** Because the spec is tag-filtered, demo endpoints cannot be
  generated into the IdP client — the [ADR-0001](0001-idp-vs-demo-app-boundary.md) boundary holds at
  the spec level, not by reviewer vigilance.
- **Transport centralised.** Cookie-session + same-origin `/api` base is configured once in the
  mutator, keeping the client consistent with [ADR-0004](0004-per-app-access-enforcement-dual-mode.md).
- **Simple toolchain.** Workspace TS source means no build/publish step for the client package; Vite
  transpiles it directly.

### Negative

- **A codegen step now exists.** Developers must run `pnpm client:gen` after a backend contract change
  (and CI enforces it). The generated client is not hand-editable; changes go through the spec.
- **A QueryClient provider per SPA.** Each SPA must mount the TanStack Query provider and manage its
  QueryClient configuration.
- **Generated code must be regenerated on backend change.** The generated directory is gitignored, so
  a fresh checkout or a backend change requires regeneration before the SPAs typecheck/build — the
  contract is committed, but the client artifact is not.

### Neutral

- The package is consumed as `workspace:*` source; physical packaging/publishing (versioned npm
  artifact) is deferred until an external consumer needs it.

## Trade-offs

We prioritise a single typed source of truth and compile-time contract safety over the zero-tooling
simplicity of hand-written calls. We accept a codegen step and a regenerate-on-change obligation as
the cost of eliminating duplication and drift. Committing the contract while gitignoring the
generated client keeps PR diffs focused on the *contract* change (the meaningful unit) rather than
on mechanically regenerated output, with the `openapi:verify` CI check guaranteeing the two stay in
sync.

## Sources

External authoritative sources (verified):

- orval — Vue Query guide: <https://orval.dev/docs/guides/vue-query/> (tags-split output and the
  `@tanstack/vue-query` client target).
- orval — Custom axios instance: <https://orval.dev/docs/guides/custom-axios> (custom mutator that
  configures a single axios instance — basis for the cookie-session `baseURL: '/api'` /
  `withCredentials` mutator).
- TanStack Query (Vue) — Overview: <https://tanstack.com/query/latest/docs/framework/vue/overview>
  (server-state caching, deduplication, and invalidation — the rationale for choosing it over plain
  generated functions and over Pinia for server state).
- pnpm — Workspaces: <https://pnpm.io/workspaces> (`workspace:*` protocol for consuming the local
  `@nova-id/api-client` package as source).
- "Generating frontend API clients from OpenAPI" — Oddbird:
  <https://www.oddbird.net/2024/04/03/generating-frontend-api-clients-from-openapi/> (commit the
  OpenAPI contract; generate the client in the build).
- "Autogenerating clients with FastAPI and GitHub Actions" — PropelAuth:
  <https://www.propelauth.com/post/autogenerating-clients-with-fastapi-and-github-actions> (CI drift
  check: regenerate and fail on diff — basis for `openapi:verify`).

## References (repo)

- `api/scripts/generate-openapi.ts` — boots Nest and writes `api/openapi.json` tag-filtered to
  `admin`/`me`/`auth` (spec-level boundary enforcement).
- `api/openapi.json` — the committed source contract.
- `packages/api-client` — the `@nova-id/api-client` workspace package (orval output:
  `src/generated/`, `src/model/` gitignored).
- `packages/api-client/src/mutator/custom-instance.ts` — custom axios mutator
  (`baseURL: '/api'`, `withCredentials: true`).
- `frontend-auth`, `frontend-admin`, `frontend-app` — SPAs consuming `@nova-id/api-client` via
  `workspace:*`; `frontend-app` keeps `/api-test/*` demo calls separate.
- Relates to ADR-0001 (demo/IdP boundary), ADR-0004 (cookie-session dual-mode enforcement).
</content>
</invoke>
