# Authentication & RBAC

This document explains how authentication and authorization work in Nova ID, the separation of the platform-level (Keto-based) and application-level (per-app database) authorization layers, and the boundary between the IdP and the demo app.

---

## Architecture overview

Nova ID is a Backend-for-Frontend (BFF) that serves the browser client (`frontend-app`) and other OAuth2 clients. Internally, it is a **modular monolith** with a hard boundary: the **IdP modules** (`admin/`, `me/`, `ory/`, `auth/`) handle central identity and access-control concerns, while the **DemoModule** (`demo/`) handles a sample app's own domain logic. See [ADR-0001](./decisions/0001-idp-vs-demo-app-boundary.md) for the architectural rationale and enforcement.

---

## Authentication vs authorization

| | Authentication | Authorization |
|---|----------------|----------------|
| **Question** | *Who are you?* | *What can you do?* |
| **Mechanism** | Login, sessions, tokens | Roles, permissions, Keto checks, app DB |
| **Example** | Email + password → Kratos session | `platform_admin` → access admin UI; `app_admin` → edit users in demo app |

Nova ID uses **Kratos** for authentication (identity, sessions, passwords). Authorization is **layered** (see below): the IdP uses **Keto** for platform-level and per-app *access* decisions, and each consuming app (including the bundled demo) uses its own database for *domain-level* roles and permissions.

---

## Authentication methods

### Session-based (web)

1. User signs in via Auth UI → Kratos creates a session.
2. Browser stores a session cookie.
3. Requests to Oathkeeper include the cookie.
4. Oathkeeper validates the session with Kratos, then injects `X-User-ID`, `X-User-Email`, `X-User-Role` and forwards to the API.

**Used by:** Auth UI, Admin dashboard, Test app.

### Token-based (OAuth2 / OIDC)

1. Client obtains an access token from **Hydra** (e.g. authorization code or client credentials).
2. Client sends `Authorization: Bearer <token>` to Oathkeeper.
3. Oathkeeper introspects the token with Hydra, then forwards to the API.

**Used by:** Mobile apps, third‑party integrations, SPAs using OAuth2.

---

## Three-layer authorization model

Authorization in Nova ID is layered into three distinct concerns, each with its own store and ownership. See [ADR-0003](./decisions/0003-three-layer-authorization-model.md) for the complete rationale.

| Layer | Lives in | Decides | Enforced by |
|---|---|---|---|
| **1. Platform / IdP** | Keto | Who administers the IdP itself (`platform_admin`, user management) | Oathkeeper + IdP guards |
| **2. Per-app ACCESS** | Keto | May user X reach/use app A? May X administer A's users? | Oathkeeper (per-request gateway check) or Hydra consent (at token issuance) |
| **3. Per-app DOMAIN roles** | Each app's own DB (demo: SQLite) | What may user X do inside app A? (editor/reader, fine-grained permissions) | The app itself |

**The dividing line:** Keto answers *"may you reach/enter X?"*; the app's own database answers *"what may you do once inside X?"*

---

## Platform roles (Layer 1)

Nova ID uses two **platform roles**:

| Role | Purpose |
|------|--------|
| **platform_admin** | Administers the IdP (user management, permission management, admin API routes). |
| **platform_user** | Normal users; no IdP admin access. Application access is determined by Layer 2. |

Platform roles are sourced from **Kratos `metadata_public.role`** (the canonical identity attribute) and reflected in **Keto** as membership in the `Platform:nova#admins` namespace for `platform_admin` users.

Oathkeeper and the IdP's guards enforce platform-role checks. The IdP **mints only the platform `role`** in issued tokens (both ID Token and access token via introspection `ext`), never app-domain roles.

---

## Keto namespaces (Layers 1 & 2)

Permissions are organized in **Ory Permission Language (OPL) namespaces** using ReBAC (relationship-based access control). Keto is the canonical Policy Decision Point (PDP) for all platform-level and per-app access decisions.

### Layer 1: Platform namespace

| Namespace | Purpose |
|-----------|--------|
| **Platform:nova** | Platform admin membership. Example: `Platform:nova#admins@user:<id>`. |

Platform admins are granted permissions like `administer` (permission to manage users and access tuples) via the OPL schema (`config/keto/namespaces.keto.ts`).

### Layer 2: Per-app namespaces

| Namespace | Purpose |
|-----------|--------|
| **App:&lt;appId&gt;** | Per-app access and administration. `App:<appId>#members@user:<id>` grants access to the app; `App:<appId>#admins@user:<id>` grants app-admin permissions (user management). Admins are implicitly members via subject-set rewrite (`admins ⊆ members`). |

The `<appId>` is **the Hydra OAuth2 `client_id`** of that app, so the same identifier keys both Keto membership checks and Hydra token issuance.

### ReBAC pattern example (Layer 1)

```bash
# Grant user access to platform admin
curl -X PUT http://localhost:4467/admin/relation-tuples \
  -H “Content-Type: application/json” \
  -d '{
    “namespace”: “Platform”,
    “object”: “nova”,
    “relation”: “admins”,
    “subject_id”: “user:USER_ID”
  }'
```

### ReBAC pattern example (Layer 2)

```bash
# Grant user access to consume app nova-id-test-app
curl -X PUT http://localhost:4467/admin/relation-tuples \
  -H “Content-Type: application/json” \
  -d '{
    “namespace”: “App”,
    “object”: “nova-id-test-app”,
    “relation”: “members”,
    “subject_id”: “user:USER_ID”
  }'
```

---

## App-level domain roles (Layer 3)

Each consuming app owns its own domain roles and permissions, stored in that app’s database. The demo app (`DemoModule`, per [ADR-0001](./decisions/0001-idp-vs-demo-app-boundary.md)) uses a SQLite `user_roles` table with roles like `app_admin` and `app_user`.

**Important:** The IdP does **NOT** mint app-domain roles in any token. App-level authorization is resolved by the app itself, keyed on the verified user `sub` from the access token. See [ADR-0002](./decisions/0002-idp-does-not-mint-approle.md) for the rationale: the IdP is app-agnostic and does not couple its token schema to every consuming app’s internal role vocabulary.

A forged or stale app-domain-role claim in a JWT cannot satisfy a guard, because the app never reads such a claim — it fetches the authoritative role from its own database on every access decision.

---

## Per-app access enforcement (dual-mode, [ADR-0004](./decisions/0004-per-app-access-enforcement-dual-mode.md))

Per-app access is enforced in **two coexisting modes**, both reading the same Keto source of truth (`App:<appId>#access`).

### Mode A: First-party apps (per-request gateway check)

First-party apps sit behind the Oathkeeper gateway. The gateway performs a **per-request Keto access check** via the `remote_json` authorizer:

1. Oathkeeper authenticates the user (cookie session).
2. The `remote_json` authorizer calls Keto: "does this user have `App:<appId>#access`?"
3. If allowed, the request is forwarded to the app. If denied, the request is rejected at the gateway (403).

This is the **Zero-Trust pattern** — access is re-evaluated on every request and cannot be revoked mid-session.

### Mode B: Third-party apps (consent-time check)

Third-party apps integrate via OAuth2 authorization code flow and never traverse the Oathkeeper gateway. Access is enforced at the **Hydra consent step**:

1. During the OAuth login flow, the BFF’s consent handler (`acceptHydraConsent` in `api/src/app.service.ts`) checks Keto: "does this user have `App:<clientId>#access`?"
2. If a member: consent is accepted, Hydra mints a token, and the user is authenticated to the app.
3. If **not** a member: consent is rejected with the OAuth error `access_denied`, and Hydra never mints a token.

This ensures that only members of the app can obtain a token from Hydra — fail-closed.

### Invariant

Both modes read the **same Keto relation**: `App:<appId>#access`. A single grant/revoke (writing or deleting the tuple) is observed immediately by both modes. No app-domain role claim is ever the source of truth for access; per [ADR-0002](./decisions/0002-idp-does-not-mint-approle.md), the IdP does not mint `appRole`.

---

## Authorization at the API boundary

When a request arrives at the BFF (via Oathkeeper), it carries authenticated identity from Kratos (`X-User-ID`, `X-User-Email`) and the platform `role` from the token. The API uses this to:

1. **Enforce platform-level access:** Guards like `RequireRole('platform_admin')` check the platform `role` claim or a Keto `Platform:nova#admins` membership.
2. **Enforce per-app access:** The Oathkeeper gateway (Mode A) performs the `App:<appId>#access` check before the request reaches the API. The API receives only authenticated, access-granted traffic.
3. **Enforce app-domain roles:** The app (demo: `DemoModule`) fetches its own domain roles from SQLite, keyed on the verified `sub`, and applies its own guards (`AppAdminGuard`, `AppUserGuard`, etc.).

**Example flow (gateway + app):**

```
GET /api-test/logs (Bearer token from OAuth)
  → Oathkeeper: authenticate via Hydra introspection
  → Oathkeeper remote_json: check App:nova-id-test-app#access on this user
  → Keto: user:XYZ member of App:nova-id-test-app#members? Yes
  → API: request forwarded with X-User-ID, role claim
  → demo/logs.controller: fetch appRole from SQLite keyed on sub
  → If appRole == app_admin or platform_admin: return logs. Else: 403.
```

---

## DemoModule boundary

The BFF is a **modular monolith** (one process, explicit module boundaries). All demo-app concerns are quarantined in `DemoModule` (`api/src/demo/`) to preserve a clean IdP logical surface. See [ADR-0001](./decisions/0001-idp-vs-demo-app-boundary.md).

- **Dependency rule (enforced by CI tooling):** IdP modules (`admin/`, `me/`, `ory/`, `auth/`) **MUST NOT** import from demo modules (`roles/`, `logs/`, demo guards, demo interceptors). Demo may import IdP auth primitives only (`AuthenticatedGuard`, verified `request.user`).
- **SQLite ownership:** The demo's `user_roles` table and TypeORM connection live inside `DemoModule`, not in the root `AppModule`. The IdP's composition root owns no demo database.
- **Gateway boundary:** Oathkeeper routes `/api/*` (IdP endpoints) and `/api-test/*` (demo endpoints) to the same container, preserving the option to extract the demo to a separate service later without changing the gateway contract.

---

## Audit notes

- **`keto-read` access:** Querying the Keto relation tuples API (including for audit) is now gated behind the platform `administer` permission (`Platform:nova#admins`). This closes the previously-public `keto-read` browser route.
- **Legacy `kratos-admin` rule:** The pre-A1 Oathkeeper rule that proxies Kratos admin endpoints directly (gated by `Platform:nova#admins`) still exists and still routes its matched sub-paths. It is now complemented by — and superseded *in preference* by — the A1.2 BFF `/api/admin/*` paths, which are guarded via the same `Platform:nova#admins` membership but offer a curated, type-safe API surface. Removing the direct rule is an audit follow-up.
- **Keto unreachable → 500, not 403 (fail-closed by design):** When Keto is down, the `remote_json` authorizer in Oathkeeper cannot reach `http://keto:4466/relation-tuples/check` and returns a connection error. Oathkeeper maps this as an internal error, producing an HTTP 500 response to the client. This is **security-correct**: the request is still denied (fail-closed). A clean 403 cannot be produced without faking the error type — Oathkeeper v25.4.0 error handlers accept only `unauthorized` and `forbidden` in the `when.error` list; `internal_server_error` is not a configurable mapping target. Mapping the connection failure to `forbidden` would mask genuine 5xx errors from upstream services, so it is intentionally not done. The operational consequence: clients behind Oathkeeper will see a 500 when Keto is unavailable, but they are always denied. Ensure Keto has a liveness probe and restarts automatically (see `docker-compose.yml` health checks).
- **Bootstrap chicken-and-egg resolved (`/api/roles/bootstrap*`):** The `POST /api/roles/bootstrap/app-admin` endpoint is a platform-admin action to mint the first Layer-3 `app_admin` in the demo app's SQLite store. It is deliberately **not** guarded by the `App:<appId>#access` Keto gate (which would block a platform_admin who has not yet been provisioned as an App member). Instead it is served by the dedicated `api-roles-bootstrap` Oathkeeper rule, which gates on `Platform:nova#administer` (same relation as `keto-read` / `keto-write`). A platform_admin can call this endpoint without being an App member; all other `/api/roles/*` paths remain gated by `App:nova-id-test-app#access` via the `api-test-app-gate` rule.

  **Authoritative control is in-app, not the gateway.** The bootstrap handler is guarded by `@UseGuards(RoleGuard)` + `@RequireRole('platform_admin')` (`api/src/demo/roles/roles.controller.ts:28-30`), which verifies the `platform_admin` claim on the JWKS-validated id_token. The `roles(?!/bootstrap)` exclusion on the broad `api-test-app-gate` rule is **defense-in-depth only** — it is a raw-URL regexp, so it is bypassable with path tricks (e.g. percent-encoding `/api/roles/%62ootstrap`), which a path-based allowlist cannot fully prevent. This is **not exploitable**: a percent-encoded request reaches the same upstream handler, where the in-app `RoleGuard` re-checks the verified role claim — path encoding cannot change that decision (a non-platform-admin is still denied; a platform-admin via the encoded path is first stopped by `App#access` if not a member). We deliberately do **not** chase encoding variants in the gateway regexp (a fragile allowlist — flagged by automated security review, resolved per its preferred remedy: enforce in the handler). The same reasoning applies to every demo endpoint: each is independently guarded in-app (`AppUserGuard`/`AppAdminGuard`/`RoleGuard`/`checkAccess`), so the Oathkeeper `App#access` gate is always an additional layer, never the sole control.

---

## Live verification status

**A1.4 / A1.5 live verification PASSED (2026-06-14):**
- **API level (5/5):**
  - Cookie session (admin) → `/api-test/me` returns 200 (`role: platform_admin`)
  - Cookie session (admin) → `/api-test/logs` returns 200 — confirms the ADR-0002 platform-role-on-access-token fix (was 403)
  - Cookie session (member `user@nova.test`) → `/api-test/me` returns 200 (per-request Keto check allows)
  - Cookie session (non-member `outsider@nova.test`) → gateway denies with 403 (per-request Keto check)
  - Keto down → gateway denies (fail-closed: the `remote_json` authorizer cannot reach Keto, returns 500 — not a pass-through); restored to 200 after Keto restart
- **Browser OAuth happy-path:**
  - Login flow completes; consent screen presented
  - Accept consent: user authenticated, logs visible
  - One-click logout: session cleared

---

## Architecture decision records

This document is anchored in four Architecture Decision Records. For detailed rationale, constraints, and alternatives, see:

- [ADR-0001](./decisions/0001-idp-vs-demo-app-boundary.md) — Hard internal module boundary between IdP and demo
- [ADR-0002](./decisions/0002-idp-does-not-mint-approle.md) — IdP mints identity + platform role, not app-domain roles
- [ADR-0003](./decisions/0003-three-layer-authorization-model.md) — Three-layer authz: Keto platform + per-app access, plus each app's domain roles
- [ADR-0004](./decisions/0004-per-app-access-enforcement-dual-mode.md) — Dual-mode per-app enforcement (gateway per-request + consent-time)

---

## Next steps

- [Architecture](ARCHITECTURE.md) — System design and request flows  
- [Operations](OPERATIONS.md) — Running services and troubleshooting  
- [Create users](../CREATE_USER_INSTRUCTIONS.md) — Create users and assign roles
