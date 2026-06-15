# ADR-0001: Separate the demo-app backend from the IdP BFF via a hard internal module boundary

- **Status:** Accepted
- **Date:** 2026-06-14
- **Deciders:** Carlos (owner), architecture review
- **Context phase:** A1 (BFF consolidation), forced by A1-plan-2 (OAuth + access gates)

## Context

`api:8080` is a single NestJS 10 deployable (`api/package.json`, `@nestjs/core@^10.3.0`). In
Backend-for-Frontend terms it is the BFF that fronts the self-hosted Ory stack (Kratos, Hydra,
Keto, Oathkeeper) for the browser client `frontend-app`. The BFF pattern's intent is precisely
this: "a separate backend service ... between the frontend client and the backend service" that
handles client-specific orchestration (see Sources — Newman, Microsoft). The problem is not the
pattern; it is that this single BFF currently mixes **two unrelated responsibility groups** in one
module graph:

1. **Central-IdP concerns** (legitimately the IdP's job): Kratos admin user management
   (`api/src/admin/`, Keto-gated via `api/src/guards/platform-manage-users.guard.ts`), Hydra
   login/consent orchestration (`api/src/ory/`), Keto-backed permission resolution
   (`api/src/me/`), and the global `AuthenticatedGuard` (`api/src/guards/authenticated.guard.ts`)
   that verifies the Oathkeeper-minted RS256 `id_token` via JWKS.
2. **Sample-app concerns** (belong to the demo app, not the central IdP): a SQLite `user_roles`
   table + `RolesService` + `RolesController` (`api/src/roles/`) holding application-level roles
   (`app_admin`/`app_user`), `AppAdminGuard` / `AppUserGuard`
   (`api/src/guards/app-admin.guard.ts`, `api/src/guards/app-user.guard.ts`) that read it, a
   `LogsController` access-log viewer (`api/src/logs/`), and the demo `AppController`
   (`api/src/app.controller.ts`) `/me`-style endpoints consumed by `frontend-app`.

The product goal is a **thin, production-grade central IdP**. Group 2 is application-domain logic
for a sample app and has no place in the IdP's logical surface.

**Evidence the two groups are already entangled at the composition root.** The root module wires
both groups together and owns the demo's database:

```ts
// api/src/app.module.ts:14-32 (verified 2026-06-14)
TypeOrmModule.forRoot({
  type: 'sqlite',
  database: 'data/app_roles.db',
  entities: [UserRole],          // a demo-only entity, registered globally
  synchronize: true,             // auto-migrates on every boot — see TypeORM warning in Sources
}),
AuthModule, RolesModule, LogsModule, OryModule, AdminModule, MeModule,
```

`RolesModule`, `LogsModule` (demo) sit in the same `imports` array as `OryModule`, `AdminModule`,
`MeModule` (IdP), and the demo's `UserRole` TypeORM entity is registered at the IdP's
composition root with `synchronize: true`.

**A clean URL seam already exists at the gateway.** Oathkeeper routes `/api/*` (IdP) and
`/api-test/*` (demo, `strip_path: /api-test`) to the same container
(`config/oathkeeper/rules.local.json`: rule `api-test-public` line 394, rule `api-test` line 419).
`frontend-app` calls the demo surface exclusively through `/api-test/*`
(`frontend-app/src/composables/useApiTest.js:2-10` — "Oathkeeper rule: /api-test -> api:8080 ...
/me, /logs, /roles/*"). The boundary is **half-drawn at the gateway; it is not drawn in the
code** — nothing prevents an IdP module from importing `RolesService` tomorrow.

**Constraints.**

- The owner's two-layer authz model is **intentional and must be preserved, not merged**: Keto =
  infrastructure/architecture access authz (e.g. the `Platform:nova#manage_users` check enforced in
  `config/oathkeeper/rules.local.json` and `platform-manage-users.guard.ts`); SQLite `user_roles`
  = the demo app's own internal app-level roles. Merging them would re-introduce the IdP minting
  `appRole`, which ADR-0002 removed.
- This is a **self-hosted IdP plus one sample app**. Per Fowler's *MonolithFirst* and the BFF
  pattern's own "Problems and considerations" (each extra service carries its own lifecycle,
  deployment, and security cost — see Sources), operational simplicity is a first-class
  constraint. Premature extraction into microservices is explicitly out of scope.

## Decision

Keep **one deployable**, but introduce a **hard, one-way internal module boundary** — i.e. adopt
the *modular monolith* shape (one process, explicit modules, controlled dependencies) rather than
either an undifferentiated monolith or premature service extraction.

1. **Quarantine all demo concerns into a self-contained `DemoModule`**: `roles/` (controller,
   service, `UserRole` SQLite entity), `logs/`, the demo `AppController` endpoints (`/me`,
   `/nova-id-session`, `/protected`, `/app-*`), and `AppAdminGuard` / `AppUserGuard`.
2. **Enforce a one-way dependency arrow: `DemoModule → IdP`, never `IdP → DemoModule`.** The IdP
   modules (`admin/`, `me/`, `ory/`, `auth/`) **must not import any symbol from `DemoModule`**.
   `DemoModule` may consume only the IdP-provided auth *primitives* it needs: `AuthenticatedGuard`
   and the verified `request.user`. No IdP module may import `RolesService`, `LogsService`,
   `AppAdminGuard`, `AppUserGuard`, or the `UserRole` entity.
3. **Move SQLite/TypeORM registration out of the root `AppModule` into `DemoModule`.** The IdP's
   composition root must not own a demo database. Register `UserRole` via
   `TypeOrmModule.forFeature` inside `DemoModule`; scope the `forRoot` SQLite connection there too.
4. **Gate `synchronize` to non-production.** Replace the hardcoded `synchronize: true` with
   `synchronize: process.env.NODE_ENV !== 'production'` (default `false`), per the official TypeORM
   production warning (see Sources). Production schema changes go through migrations, not boot-time
   auto-sync.
5. **Retain the `/api/*` vs `/api-test/*` gateway seam as the public contract.** It is the stable
   interface that makes later physical extraction a no-op for `frontend-app`.

This decision is **testable**. It holds if and only if all of the following are mechanically true
in CI (see *Enforcement*):

- No file under `api/src/{admin,me,ory,auth}/**` imports from `api/src/{roles,logs}/**` or from
  the demo `AppController`/`App*Guard`.
- `TypeOrmModule.forRoot(...)` does not appear in `api/src/app.module.ts`.
- No `synchronize: true` literal exists in the codebase.

## Enforcement (how the one-way boundary is mechanically guaranteed)

The boundary is enforced by **tooling in CI, not developer discipline** — directly following
Grzybek's principle that "to enforce architecture we should use the computer as much as possible
and treat code-review as the last line of defense" (see Sources).

- **`dependency-cruiser`** (TypeScript static analysis: "validates [dependencies] against (your
  own) rules" and "reports violated rules") encodes a `forbidden` rule:

  ```js
  // .dependency-cruiser.js (illustrative)
  forbidden: [{
    name: 'idp-must-not-import-demo',
    severity: 'error',
    from: { path: '^api/src/(admin|me|ory|auth)' },
    to:   { path: '^api/src/(roles|logs)' },
  }]
  ```

  This rule fails the build the moment an IdP module imports a demo module, making the violation
  impossible to merge rather than merely discouraged.

- **NestJS module encapsulation** provides a complementary, language-level guard: in NestJS a
  provider is encapsulated within its module and "it is not possible to inject providers ... that
  are not part of the module or exported from another module" (see Sources). Keeping demo
  providers un-exported from `DemoModule` means an IdP module cannot inject `RolesService` even if
  someone tries — the DI container will fail to resolve it. dependency-cruiser catches the import
  at lint time; Nest's container catches injection at wiring time. Defense in depth.

## Alternatives considered

- **A — Keep co-located as-is (status quo):** rejected. Leaves application-domain code and a
  writable, auto-migrating SQLite DB (`synchronize: true`, `api/src/app.module.ts:21`) inside the
  IdP process; puts a demo bug in the central IdP's blast radius; violates the BFF guidance that a
  shared backend serving mixed concerns "results in excessive demand on a single deployable
  resource" (see Sources); fails the production-grade bar.
- **B — One module, rely on code review to keep concerns separate:** rejected. Architecture that
  depends on human vigilance erodes. Grzybek's enforcement guidance (use the computer; code review
  is the *last* line of defense) and the testable criteria above are the whole point of choosing a
  *modular* monolith over an implicit one.
- **C — Extract a distinct `demo-api` service now:** rejected *for now*. It is the correct
  end-state, but a second container, CI lane, and duplicated JWKS-verification setup is
  over-investment for a single sample app whose purpose is to demonstrate the IdP. This is the
  textbook BFF "Problems and considerations" trade-off (more services = more lifecycle,
  deployment, and security overhead) and Fowler's *MonolithFirst* caution against committing to
  service boundaries before they have stabilized (see Sources). This ADR preserves extraction as a
  cheap future move: because `DemoModule` is self-contained and owns its own DB connection,
  extraction becomes a lift-and-shift behind an unchanged Oathkeeper `api-test` rule.
- **D — Delete the demo backend, make `frontend-app` a pure SPA:** rejected. Destroys the demo's
  pedagogical purpose (showing app-owned authz distinct from Keto) and would force the IdP to keep
  minting `appRole` — the opposite of ADR-0002.

## Consequences

**Positive**
- The IdP's logical surface becomes purely identity + Keto authz; demo code is quarantined behind
  an enforced boundary, shrinking the IdP's reasoning and review surface (BFF Security pillar:
  segmentation reduces "lateral movement between backends" — see Sources).
- The Keto-vs-SQLite two-layer authz model is preserved unchanged.
- The demo DB and its risky `synchronize` behavior leave the IdP composition root; production no
  longer auto-mutates schema on boot.
- Extraction to a standalone `demo-api` service later becomes a mechanical lift-and-shift behind a
  stable gateway contract.
- One container, one pipeline — no new operational surface added now (BFF operational-cost
  consideration respected).

**Negative**
- Runtime isolation is **not physical**: a demo fault (e.g. SQLite lock, unhandled exception, CPU
  spin) can still affect the IdP process, because they share one Node runtime. This is the
  accepted residual risk of deferring Alternative C; revisit if the demo grows or gains untrusted
  inputs.
- Requires maintaining the dependency-cruiser rule (and its CI step) as the load-bearing guarantee
  of the boundary. If that check is removed or skipped, the boundary silently degrades to
  convention.

**Neutral**
- `frontend-app` is unaffected; it already calls `/api-test/*` exclusively
  (`frontend-app/src/composables/useApiTest.js`).
- Some auth glue (e.g. re-exporting `AuthenticatedGuard` for `DemoModule` to consume) is shared
  code that both modules touch; this is intentional and is the *only* sanctioned coupling.

## Trade-offs

Correctness and a clean, mechanically-enforced logical boundary are prioritised now, while
deferring the operational cost of physical service isolation until the demo justifies it. The
single shared process is the accepted cost of that deferral, bounded by the explicit
revisit-trigger above.

## Sources

- [Backends for Frontends pattern — Sam Newman](https://samnewman.io/patterns/architectural/bff/) — the originating definition of the BFF pattern this `api/` service implements; basis for treating it as a per-frontend backend rather than a general-purpose one.
- [Backends for Frontends pattern — Microsoft Azure Architecture Center](https://learn.microsoft.com/en-us/azure/architecture/patterns/backends-for-frontends) — authoritative restatement of BFF; supports the "shared backend serving mixed concerns becomes a bottleneck" problem statement, the "each extra service carries its own lifecycle/deployment/security cost" consideration (Alternative C), and the Security-pillar segmentation rationale.
- [MonolithFirst — Martin Fowler](https://martinfowler.com/bliki/MonolithFirst.html) — supports deferring service extraction: "You shouldn't start a new project with microservices"; service boundaries are hard to get right up front and cheaper to refactor inside one deployable (Alternative C).
- [Modular Monolith: A Primer — Kamil Grzybek](https://www.kamilgrzybek.com/blog/posts/modular-monolith-primer) — defines the modular-monolith shape (one system "designed in a modular way") and the loose-coupling/strong-cohesion goal for inter-module dependencies that this ADR's one-way arrow embodies.
- [Modular Monolith: Architecture Enforcement — Kamil Grzybek](https://www.kamilgrzybek.com/blog/posts/modular-monolith-architecture-enforcement) — supports the *Enforcement* section: "use the computer as much as possible and treat code-review as the last line of defense" (motivates the dependency-cruiser CI gate over manual review).
- [NestJS — Modules](https://docs.nestjs.com/modules) — supports the encapsulation guard: NestJS encapsulates providers within their module; a provider is not injectable into another module unless explicitly exported. Keeping demo providers un-exported makes cross-boundary injection fail at DI wiring time.
- [dependency-cruiser — sverweij/dependency-cruiser](https://github.com/sverweij/dependency-cruiser) — the named tool for the mechanical one-way boundary: it "validates [dependencies] against (your own) rules" and "reports violated rules," enabling a `forbidden` rule that fails CI when an IdP module imports a demo module.
- [TypeORM — Data Source Options (`synchronize`)](https://typeorm.io/docs/data-source/data-source-options/) — supports gating `synchronize` to non-prod: "Indicates if database schema should be auto created on every application launch. Be careful with this option and don't use this in production - otherwise you can lose production data."

## References (repo)

- `api/src/app.module.ts:14-32` (root module; SQLite `synchronize: true`; demo + IdP modules co-imported)
- `api/src/roles/`, `api/src/logs/`, `api/src/app.controller.ts`, `api/src/guards/app-admin.guard.ts`, `api/src/guards/app-user.guard.ts` (demo surface to be moved into `DemoModule`)
- `api/src/admin/`, `api/src/me/`, `api/src/ory/`, `api/src/auth/`, `api/src/guards/authenticated.guard.ts`, `api/src/guards/platform-manage-users.guard.ts` (IdP surface; must not import demo)
- `config/oathkeeper/rules.local.json` (rule `api-test-public` line 394, rule `api-test` line 419, `protected-api`)
- `frontend-app/src/composables/useApiTest.js:2-10` (frontend calls `/api-test/*` exclusively)
- Supersedes/refines: 3-layer roles model in `../PLAN_BUCKET_A.md:12-15`, `../AUDIT_FINDINGS.md`; relates to ADR-0002 (removal of IdP-minted `appRole`)
