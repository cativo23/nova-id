> ⚠️ Historical. This phase/audit is complete as of v1.2.0 — see [PROJECT-STATUS.md](./PROJECT-STATUS.md) for current status.

# Bucket A — Finish the nova-id Code: Roadmap (A0 → A1 → A2)

> Phased roadmap for "finish the IdP code" (no deploy). Companion to `docs/AUDIT_FINDINGS.md`
> (findings + locked roles/access model). Branch: `develop`. **A0 is the priority** — it closes
> real privilege-escalation holes and removes dead/contradictory config the rest builds on.
> Each phase below should get its own detailed bite-sized/TDD execution plan when picked up
> (per the writing-plans skill scope-check); this document is the roadmap + acceptance criteria.

**Goal:** Bring the nova-id code to a coherent, secure state implementing the decided model —
identity + access-control plane (Oathkeeper PEP + Keto PDP), BFF consolidation, and hardening.

**Decided model (see AUDIT_FINDINGS.md "Roles model"):** 3 layers — Platform & per-app ACCESS in
Keto (ReBAC), per-app DOMAIN in each app's own DB. Two runtime modes coexist: first-party apps
behind Oathkeeper (per-request Keto check), third-party apps consume via OAuth2 (Keto check at the
consent step). Keto is the source of truth for access in both.

**Tech stack:** Ory v25.4.0 (Kratos/Hydra/Keto/Oathkeeper), NestJS (BFF, TypeORM), Vue 3 SPAs,
Postgres, Redis (to add), Docker Compose.

---

## Current status (updated 2026-06-17)

| Phase | Status | Where |
|---|---|---|
| **A0 — Security & foundations** | ✅ **DONE / merged** | develop (PRs #25 admin-paths, #26 config-hygiene, #27 keto-opl) |
| **A1 — BFF consolidation** | ✅ **DONE / merged** | develop (PR #28 BFF core, #29 OAuth/access gates, #30 followups, #31 api-client + pnpm workspace + SPAs→TS) |
| **A2 — Hardening** | 🔜 **NEXT** (some items partially landed during A1 — see reconciliation) | — |
| **B — Deploy** | ⛔ out of scope / **not planned yet** | future bucket (outline below) |

**A2 reconciliation (verified on develop 2026-06-17 — only the remaining work counts):**
- A2.1 DTOs — *partial*: IdP controllers (admin/me/app hydra-accept) fully typed; **remaining**: 5 `@Body() any` + inline-literal bodies in `api/src/demo/**`, and a shared `AuthenticatedUser` type for `@GetUser() any`.
- A2.2 throttler — `@nestjs/throttler@^6.5.0` installed, **unwired**.
- A2.3 helmet — `helmet@^8.1.0` installed, **unwired**.
- A2.4 versioning — **not done**; adding `/v1` ripples to Oathkeeper `strip_path`, the generated client `baseURL`, and SPA paths (coordinated change — decision pending).
- A2.5 OpenAPI — *partial*: single ungated `/docs`; needs public-vs-admin split + gating.
- A2.6 audit — *partial*: `LoggingInterceptor`/`LogsService` live in `DemoModule`, file-backed (append) **but** in-memory lossy cap (`slice(-1000)`), `@LogAccess` opt-in only on RolesController; **no IdP-level append-only audit** of admin mutations (membership grant/revoke, recovery, trait edits). Design decision pending (home + store + scope).
- A2.7 demo cleanup — *partial*: demo `PUT/DELETE /:id` now guarded ✅; **remaining**: M1 boundary inversion below + thin demo bodies.
- A2.8 frontend hygiene — *partial*: `useKeto.js` removed ✅; **remaining**: ~29 raw `console.*` across SPAs (some log full OAuth/Kratos error objects → PHI/secret risk).
- **M1 (from A1 review):** `api/src/app.controller.ts` imports `AppUserGuard` from `demo/guards/` for the hydra-accept routes — IdP→demo boundary inversion; should rely on the global auth guard + the in-handler Keto gate.
- **Legacy `kratos-admin` gateway rule (A0 deferral):** `config/oathkeeper/rules.{local,production}.json` still route `/api/admin/identities|sessions|recovery` **directly to Kratos:4434**, bypassing the BFF `/api/admin/*` + its `PlatformManageUsersGuard` (overlaps `protected-api`, order favors the bypass). Close it.

---

## Phase ordering & dependencies

```
A0 (security + foundations)  ──▶  A1 (BFF consolidation)  ──▶  A2 (hardening)
   must land first;              depends on A0's coherent       depends on A1's
   the rest sits on a            config + Keto/OPL model        endpoints existing
   fail-open, drifting base
```
- A0 is a hard prerequisite: do NOT build the per-app access layer on a fail-open base with dead config and 3 admin-escalation paths.
- Within A0, the JWKS-key rotation + closing the 4 admin paths are the highest priority.

---

## Phase A0 — Security & foundations

**Phase goal / done when:** the 4 admin-escalation paths are closed; only one live, coherent
Oathkeeper rule set exists; secrets come from env with no insecure fallback; Keto runs on Postgres,
fail-closed, with an OPL schema (`Platform`/`App`/`User`) and the `ranks`→`roles` migration finished;
a fresh clone builds and `npm test` passes for the API.

### A0.1 — Rotate & externalize the leaked JWKS keypair (P0, path 4)
- Files: `config/oathkeeper/id_token.jwks.json` (remove from git + rotate), `api/src/guards/authenticated.guard.ts:14` (remove `DEFAULT_PUBLIC_KEY` fallback), `.env.example`, `.gitignore`.
- Tasks: generate a fresh RSA keypair; load it via mounted secret/env (not committed); gitignore the key file; make the guard require `OAUTH_PUBLIC_KEY`/JWKS URL (throw at boot if missing — no fallback); document that any environment that used the old key is compromised and must rotate.
- Done when: no private key in git; guard has no hardcoded key; API refuses to start without the configured key/issuer.

### A0.2 — Make `traits.role` non-authoritative (P0, path 2)
- Files: `config/kratos/identity.schema.json` (add `"ory:protected": true` to `role`), the Oathkeeper id_token mutators / Keto checks that read role.
- Tasks: protect the `role` trait so users can't set it via the settings flow; ensure authorization decisions read Keto, not the trait; role assignment only via Admin API (later, BFF admin endpoint).
- Done when: a settings-flow attempt to set `traits.role=platform_admin` is rejected by Kratos.

### A0.3 — Gate Keto writes; remove browser write paths (P0, path 1)
- Files: the LIVE rules `config/oathkeeper/rules.local.json` + `rules.production.json` (`keto-write` rule), frontend `useKeto.js` (×3).
- Tasks: add a `remote_json` authorizer to `keto-write` requiring an admin permission (e.g. `Platform:nova#admin` / `manage_permissions`) — OR remove the public keto-write route entirely and route all tuple writes through a guarded BFF endpoint (preferred). Remove `createRelation`/`deleteRelation`/`assignUserToRole`/`removeUserFromRole` from all three frontend `useKeto.js`.
- Done when: a non-admin authenticated session cannot write a Keto tuple via any route; browsers have no Keto-write code.

### A0.4 — Close the API direct-access bypass (P0, path 3)
- Files: `docker-compose.yml` (api `ports` + `networks`), `docker-compose.production.yml` (add `api: ports: []`), `api/src/main.ts` (CORS), `api/src/guards/authenticated.guard.ts`.
- Tasks: stop host-binding port 8080 (only Oathkeeper reachable); remove `api` from the `ory-internal` network OR keep it only for the documented internal Hydra-admin call and harden that path; CORS allowlist instead of `origin:true`; drop `X-User-*` from `allowedHeaders` (gateway-injected only); ensure Oathkeeper strips inbound `X-User-*`.
- Done when: a direct request to the API with a forged `X-User-Id` (not via Oathkeeper) cannot authenticate.

### A0.5 — Consolidate dead/duplicated Oathkeeper config
- Files: `config/oathkeeper/{access-rules.yml, oathkeeper.config.yaml}` (dead — never loaded), `rules.local.json`, `rules.production.json`, `oathkeeper.local.yml`, `oathkeeper.production.yml`.
- Tasks: pick ONE source of truth for rules; delete or clearly archive the dead `access-rules.yml`/base config so nobody edits inert files; remove the `internal-hydra-admin` noop rule and `hydra-direct`; fix `oauth2_introspection.token_from.sources` invalid key in prod; set `OAUTH_ISSUER` in compose to match the id_token mutator issuer; reconcile the local/prod rule drift.
- Done when: there is one live rule file per env, no `noop`/`allow` on admin routes, and issuer matches end-to-end.

### A0.6 — Fix config version mismatches & secrets hygiene
- Files: `config/kratos/*.yml`, `config/hydra/*.yml`, `config/keto/*.yml`, `scripts/generate-env.sh`, `.env.example`.
- Tasks: set config `version:` to match v25.4.0 schema; remove hardcoded secret fallbacks (`PLEASE-CHANGE-ME...`) → env-only; fix `generate-env.sh` `HYDRA_SECRETS_SYSTEM`→`HYDRA_SYSTEM_SECRET`; add Kratos `secrets.default` + `secrets.pagination`; add `clients.http.disallow_private_ip_ranges: true`.
- Done when: configs validate against v25.4.0; no insecure literal secret can be the active value; `generate-env.sh` output boots the stack.

### A0.7 — Keto: Postgres + fail-closed + OPL schema + ranks→roles
- Files: `config/keto/*.yml`, new `config/keto/namespaces.keto.ts` (OPL), `config/oathkeeper/rules.*.json` (authorizers), `scripts/setup-all-permissions.sh`, `docker-compose*.yml`.
- Tasks: move Keto off `memory` DSN to Postgres (local too, or a seeded init) so tuples survive restart; add seed-on-boot; switch the access layer to **fail-closed** (deny when Keto is unreachable / tuple absent); author OPL `namespaces.keto.ts` with `User`, `Platform` (relation `admin`), `App` (relations `admin`, `user`; `admin` permits `user`); finish `ranks`→`roles` cutover across scripts + Oathkeeper payloads; fix the `users`/`ranks` namespace mismatch in the `kratos-admin` rule; remove the dead `roles` (id 5) YAML namespace.
- Done when: Keto persists across restart; OPL schema loads; all rules/scripts use the unified namespaces; an Oathkeeper Keto check actually passes for a seeded admin.

### A0.8 — Recover/finish the `logs/` module so the repo builds (already cherry-picked)
- Files: `api/src/logs/*` (present on develop now), confirm `npm ci && npm run build && npm test` works on a fresh clone.
- Tasks: verify the module compiles; the `.gitignore` fix is already in; (audit-noted improvement: file-backed reads instead of in-memory `slice(-1000)` is deferred to A2 audit work).
- Done when: a clean `git clone` of develop builds and tests green.

---

## Phase A1 — BFF consolidation

**Phase goal / done when:** browsers no longer call Ory Admin/Keto/Hydra-tokens directly; the NestJS
API is the single place that talks to Ory; admin operations are behind `/api/admin/*` with a Keto
gate; the Hydra login/consent flow is correct and enforces per-app access via Keto; a generated API
client (tagged) is consumed by the frontends.

### A1.1 — Ory wrapper services (the "mozos")
- Create: `api/src/ory/kratos-admin.service.ts`, `keto.service.ts`, `hydra.service.ts` (+ module). Each wraps one Ory API; unit tests mock the wrapper, not `fetch`.
- Done when: no controller calls Ory with raw `fetch`/axios; wrappers have unit tests.

### A1.2 — Admin user-management endpoints (Kratos Admin behind the BFF)
- Create: `/api/admin/users` controller (list/get/create/update/delete/recovery) using `KratosAdminService`, guarded by a Keto admin check; `/api/admin/*` gets its own Oathkeeper rule with `remote_json` Keto authorizer.
- Move out of frontend: remove all Kratos-admin functions from `frontend-auth/useAuth.js` (keep only self-service); `frontend-admin` consumes the new endpoints.
- Enforce the shared-identity boundary: app_admin → membership + recovery only; global-trait edit + delete person → platform_admin only.
- Done when: browsers no longer hit `/admin/identities`; admin ops require the right Keto relation.

### A1.3 — Resolved permission endpoint
- Create: `GET /api/v1/me/permissions` returning the resolved permission set (via `KetoService`); retire `usePermissionCache.js`; `frontend-admin` gates UI on the set.
- Done when: frontend does one call, no longer knows Keto exists.

### A1.4 — Fix the Hydra login/consent flow + per-app access gate (Theme 7 + third-party access)
- Files: `api/src/app.controller.ts` + `app.service.ts` (the hydra-accept-login/consent handlers).
- Tasks: call `GET /admin/oauth2/auth/requests/login` before accept, handle `skip`; move user claims out of the (invalid) login-`session` field — use `context` on login-accept and `session.id_token`/`access_token` on consent-accept; stop trusting browser-supplied `grant_access_token_audience` (read it from the consent request); **add the Keto membership check at consent** — accept (embed `app:member` scope + role claims) or `reject` with `access_denied` if not a member.
- Done when: a non-member of an app is denied a token at consent; member tokens carry the membership claim; the flow matches Ory's documented login/consent contract.

### A1.5 — First-party app access enforcement (per-request)
- Files: Oathkeeper rules for first-party app routes.
- Tasks: per-app route rules with a `remote_json` Keto check for `App:<appId>#user`; Oathkeeper injects identity; remove `frontend-app`'s sessionStorage OAuth path or convert it to consume via the BFF.
- Done when: a first-party app request is allowed only if the caller has the `App#user` relation.

### A1.6 — Generated API client (tagged)
- Tasks: install `@nestjs/swagger`; tag endpoints (`auth`/`app`/`admin`); generate `@nova-id/api-client` from the OpenAPI; frontends import their tagged namespace. (Single client, segmented by tag — not separate packages.)
- Done when: frontends call the API only via the generated client; no hand-written Ory calls remain in the browser.

---

## Phase A2 — Hardening

**Phase goal / done when:** the API has input validation, rate limiting, security headers, versioning,
OpenAPI (public + admin-gated), a tight CORS allowlist, and an append-only audit trail; 0 P0/P1 from
the audit remain open.

### A2.1 — DTOs + validation
- Replace every `@Body() body: any` with a `class-validator` DTO; `ValidationPipe` already wired in `main.ts`.

### A2.2 — Rate limiting
- Wire `@nestjs/throttler` (installed) in `app.module.ts`; per-user/IP limits; document gateway-level limiting.

### A2.3 — Security headers
- Wire `helmet` (installed) in `main.ts`.

### A2.4 — API versioning
- `enableVersioning` (`/v1`); migrate the frontend client base path together with A1.6.

### A2.5 — OpenAPI (two docs)
- Public doc (auth + app tags) + admin doc (admin tag) gated behind the same admin authz; do not expose the admin spec publicly.

### A2.6 — Audit trail (load-bearing)
- Make `LoggingInterceptor`/`LogsService` an append-only audit (actor, action, app_id, target, ts) covering membership grant/revoke, recovery trigger, global-trait edits; frontend `useAuditLog.js` becomes READ-only (no POST). Fix the in-memory `slice(-1000)` read truncation (read from file/DB).

### A2.7 — Demo cleanup
- Thin the throwaway `AppController`/`AppService` demo endpoints; add guards to the unguarded `PUT/:id` and `DELETE/:id` (or remove them).

### A2.8 — Frontend hygiene
- Remove `console.log` with IDs/URLs in production builds; fix `frontend-app/useKeto.js:236` ReferenceError (or delete with the write-path removal in A0.3).

---

## Bucket B — Deploy & operate (future; NOT planned yet)

Out of scope for "finish the code." No detailed plan exists yet — this is the outline for when deployment is picked up:
- **Transport & ingress:** TLS/certs, Traefik (or equivalent) prod ingress, blue-green/canary.
- **Secrets & config:** secrets manager (not env files), key rotation automation.
- **Data tier:** prod Postgres HA + backups; Redis (HA) for sessions/throttling.
- **Observability:** monitoring/metrics, centralized logging, alerting, tracing.
- **Orchestration:** K8s/Helm/Terraform (IaC), service mesh.
- **Email:** managed email provider + SPF/DKIM/DMARC.
- **Future complements (not core):** Cerbos per-app sidecar (richer per-app policy), SCIM provisioning.

## Acceptance for "Bucket A done"
- 0 open P0/P1 from `docs/AUDIT_FINDINGS.md`.
- Fresh clone of `develop` builds + `npm test` green for the API.
- No browser code talks to Ory Admin / Keto / holds Hydra tokens.
- Per-app access enforced (first-party: gateway+Keto; third-party: consent+Keto).
- DTOs, throttler, helmet, versioning, OpenAPI, append-only audit in place.
