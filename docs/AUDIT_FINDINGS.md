> ⚠️ Historical. This phase/audit is complete as of v1.2.0 — see [PROJECT-STATUS.md](./PROJECT-STATUS.md) for current status.

# Nova ID — Consolidated Audit Findings

> Result of a 5-component investigation (Kratos, Hydra, Keto, Oathkeeper, Integration/Deploy)
> against official Ory v25.4.0 docs + Zero-Trust/OAuth best practices, compared to the repo.
> Branch audited: `develop`. **The live config files are `rules.local.json` / `rules.production.json`**
> — `access-rules.yml` and `oathkeeper.config.yaml` are NEVER loaded (see Theme 1).

## 4 trivial paths to `platform_admin` (fix first)

| # | Path | Root cause | Component |
|---|------|------------|-----------|
| 1 | User writes their own admin relation tuple | `keto-write` rule uses `authorizer: allow` (only checks session, not role) | Keto / Oathkeeper |
| 2 | User does `PUT /self-service/settings` with `traits.role: platform_admin` | `role` trait is NOT `"ory:protected": true` in `identity.schema.json` | Kratos |
| 3 | Direct request to `localhost:8080` with header `X-User-Id: <uuid>` | API port 8080 host-bound + guard trusts the header unconditionally | Integration / Oathkeeper |
| 4 | Forge a signed id_token | **RSA private key committed to git** (`config/oathkeeper/id_token.jwks.json`); public key also hardcoded in `authenticated.guard.ts:14` | Oathkeeper |

Paths 1–3 are doable by any logged-in user from the browser console. Path 4 by anyone with repo access. **The JWKS keypair must be rotated** in any environment where it was used.

## Cross-cutting themes (why it "felt wrong")

**Theme 1 — Dead config creates false confidence.**
- `access-rules.yml` + `oathkeeper.config.yaml` are never loaded (docker-compose runs `oathkeeper.${ENV}.yml` → `rules.local.json` / `rules.production.json`). Fixes applied to `access-rules.yml` (per old SECURITY_CODE_REVIEW) never ran.
- `keto.config.yaml` is never loaded either (only `keto.${ENV}.yml`).
- Config `version:` keys are wrong: Kratos `v0.13.0`, Hydra `v2.2.0` — binaries are `v25.4.0`. Risk of silently-ignored keys / validation errors.
- `scripts/generate-env.sh` emits stale/wrong vars (see Theme 3).

**Theme 2 — Zero-Trust header-trust model is broken (3 ways).** The API trusting `X-User-*` is only safe if it's unreachable except via Oathkeeper. But:
- API is on the `ory-internal` network → can call Kratos/Hydra/Keto directly, bypassing the gateway (`docker-compose.yml:228-230`).
- API port 8080 is host-bound in dev AND prod (prod has no `api: ports: []` override) (`docker-compose.yml:217`).
- Oathkeeper does not strip inbound `X-User-*` on `noop`-mutator routes; the API CORS even lists `X-User-Id`/`X-User-Rank` in `allowedHeaders` (`api/src/main.ts:16`).

**Theme 3 — Secrets hygiene.**
- JWKS private key committed (Path 4).
- Kratos secrets hardcoded as YAML fallback (`PLEASE-CHANGE-ME-I-AM-VERY-INSECURE`, `32-LONG-SECRET-NOT-SECURE-AT-ALL`) in `kratos.config.yaml` + `kratos.local.yml`.
- `generate-env.sh:52` emits `HYDRA_SECRETS_SYSTEM` but everything else reads `HYDRA_SYSTEM_SECRET` → Hydra boots with no system secret if that `.env` is used.
- Missing Kratos `secrets.default` and `secrets.pagination`.

**Theme 4 — Role is fragmented across 3 stores + half-done migration.**
- `traits.role` (Kratos, user-editable → Path 2) + `ranks`/`roles` (Keto, what the check actually queries) + `app_role` (SQLite NestJS roles module).
- `ranks` is LEGACY; `roles` is the intended target (migration half-done — code/scripts/rules still say `ranks`).
- The live `kratos-admin` rule checks `users#view_users` while admin gating uses `ranks` → **admin authz may be broken right now** (namespace mismatch).

**Theme 5 — Keto is in legacy mode.** Namespaces declared as YAML `name/id`, not OPL (`namespaces.keto.ts`). No schema enforcement, no computed permissions / inheritance. Dead `roles` namespace (id 5) declared but unused; `keto.config.yaml` namespace list diverges from env files. Bug: `frontend-app/src/composables/useKeto.js:236` references undefined `ketoWriteUrl` → `removeUserFromRole` throws.

**Theme 6 — Production routing URLs broken.** Kratos `ui_url` (login/settings/registration) and Hydra `urls.login`/`consent`/`logout` point to wrong domain/paths (`api.cativo.dev` vs `auth.cativo.dev`, missing `/auth/` prefix) → 404 in prod. Logout points to the login page.

**Theme 7 — Hydra login-flow code is incorrect.** `api/src/app.service.ts`: uses a `session` field in the login-accept body (not a real Hydra API field — belongs in consent-accept as `session.id_token`; login-accept uses `context`); never calls `GET .../login?login_challenge` before accept (no `skip` handling); trusts browser-supplied `grant_access_token_audience`.

## Per-component highlights

**Kratos:** P0 Path 2 (`role` not protected). P1: config version mismatch; prod `ui_url` paths wrong; secrets hardcoded as fallback; missing `revoke_active_sessions` recovery hook; missing `clients.http.disallow_private_ip_ranges` (SSRF). P2: account enumeration (`notify_unknown_recipients` unset); 30-day session; missing `default`/`pagination` secrets. ✅ Correct: network segmentation intent, prod ports closed, `require_verified_address`, recovery via `code`, privileged session 15m, `leak_sensitive_values:false` in prod.

**Hydra:** P0 Theme 7 (the `session` field + no GET-before-accept), `internal-hydra-admin` noop, `HYDRA_ADMIN_URL` routes API→Oathkeeper→Hydra. P1: access/id token in `sessionStorage`; id_token missing `iss`/`aud` validation (`useHydraOAuth.js:134`); `vue-test-client` is a confidential client used as SPA; admin-port CORS enabled; prod login/consent URL domain mismatch; logout→login. ✅ Correct: PKCE S256 + state + nonce; refresh token in-memory; consent accept via backend; admin not exposed in prod; reasonable TTLs.

**Keto:** P0 Path 1 (`keto-write` allow) + all 3 frontends ship Keto WRITE code (`createRelation`/`deleteRelation`/`assignUserToRole`). P1: legacy YAML namespaces (no OPL); dead `roles` namespace; dead `keto.config.yaml`; `frontend-app/useKeto.js:236` ReferenceError; memory DSN wipes tuples on restart with no auto-seed. P2: lowercase-plural namespace naming; UI-only fine-grained checks (Oathkeeper only checks `view_users`). ✅ Correct: subject-set RBAC pattern, `remote_json` on protected routes, ports not exposed in prod, correct check-response handling.

**Oathkeeper:** P0: `access-rules.yml`/`oathkeeper.config.yaml` never loaded; JWKS private key in git; API port 8080 bypass; `internal-hydra-admin` noop; `users` vs `ranks` namespace mismatch in `kratos-admin`. P1: prod `oauth2_introspection.token_from.sources` is an invalid config key; id_token issuer (`http://api.local/`) ≠ guard default (`http://localhost:4455/`) with no `OAUTH_ISSUER` set in compose; `keto-write`/`hydra-admin` allow; 3 divergent rule files. ✅ Correct: `cookie_session` config (`subject_from: identity.id`), introspection→admin port, prod `log.level:info`+`verbose:false`.

**Integration/Deploy:** P0: API on `ory-internal`; API port not closed in prod; `internal-hydra-admin` noop; Kratos secrets hardcoded; `HYDRA_SECRETS_SYSTEM` vs `HYDRA_SYSTEM_SECRET`; `keto-write` allow. P1: `HYDRA_ADMIN_URL` via Oathkeeper not direct; frontends use direct `localhost:4433`; Kratos `base_url` localhost in base; Hydra prod URLs; Postgres 5432 exposed in base compose. P2: courier in-process (`--watch-courier`); over-privileged `ory_user`; `generate-env.sh` out of sync; CORS on both Hydra + Oathkeeper. ✅ Correct: separate DBs + users per service, migration one-shot jobs, prod port discipline for Ory, Traefik+TLS, cookie domain `.cativo.dev`.

## Roles model (DECIDED — centralized, ReBAC in Keto)

nova-id is a **multi-tenant identity platform**: apps are tenants that SHARE one Kratos identity pool, and the IdP centralizes identity AND per-app authorization (not pure thin-authn). Rationale: app admins must perform Kratos identity operations (add/remove/edit/recovery) on their app's users, and Kratos lives in the IdP — so the IdP must know who is an app admin to gate those ops. Therefore app roles live in the IdP's Keto, NOT in each app's DB.

nova-id's job = **identity + ACCESS control** (authn + who-can-consume-which-app + who-administers-each-app's-users). It is NOT thin-authn-only, and NOT total centralized authz — it's the access-control plane. Each app does its own FINE-GRAINED domain authorization in its own DB.

**Three layers:**
| Layer | Lives in | Decides | Enforced by |
|---|---|---|---|
| Platform | Keto (nova-id) | who administers the IdP | Oathkeeper + guards |
| Per-app ACCESS | **Keto (nova-id)** | can X consume app1? can X administer app1's users? | **Oathkeeper** (gates every request to app1 via Keto check) |
| Per-app DOMAIN | **each app's own DB** (MySQL/etc.) | editor / reader / viewer inside the app | the app itself |

Relationship-scoped (ReBAC / Zanzibar), **Keto is the source of truth for the platform + access layers:**
- `Platform:nova#admin@user:x` = `platform_admin` (administers whole IdP) vs `platform_user`.
- `App:<appId>#user@user:x` = may consume/make requests to that app (Oathkeeper enforces at the gateway). `App:<appId>#admin@user:x` = consume + administer that app's users (Kratos identity ops via the IdP). A `platform_user` can be admin of app1 and user of app2 simultaneously.
- App membership IS the `App:<appId>#user` relation — that's how Oathkeeper knows who may reach each app.
- An "app" = a Hydra OAuth2 client + a Keto `App:<appId>` object. Registering an app = create its Hydra client + Keto relations.
- nova-id does NOT store per-app domain roles (editor/reader) — those live in each app's own DB; the app maps the identity (+ membership claim from the token) to its own roles.
- `traits.role` becomes non-authoritative (mark `ory:protected`, admin-managed, denormalized convenience only).
- The IdP's internal SQLite `app_role` module held a FLAT global app_admin/app_user → **superseded by Keto per-app relations** (it was an internal store, not "the apps' DBs").
- Finish `ranks`→`roles` migration; fix the `users`/`ranks` namespace mismatch; move to OPL (`namespaces.keto.ts`) with `App` / `Platform` / `User` namespaces.

**Shared-identity boundary (sub-decision, still open):** identities are global, so an app_admin acting on a shared person needs limits. Recommended: app_admin may manage MEMBERSHIP (add/remove the `App#user` relation), trigger recovery, and edit app-scoped data; but editing GLOBAL traits (email/name) and DELETING the person entirely = `platform_admin` only (editing globals affects every app the person is in). Recovery is itself a hijack vector (admin → recovery → password reset → takes the global identity across all apps) → gate per-app + audit heavily. Enforce this whitelist at the BFF (never expose `PATCH /admin/identities/{id}` global-trait edits or `DELETE /identities` to app_admin).

### Validation (architect + standards research, 2026-06-02)

**Verdict: sound, recognized best practice.** The model is a composition of established patterns: **BeyondCorp / Zero-Trust IAP** (Oathkeeper as the central access proxy in front of all apps — its stated design), **PEP/PDP split** (Oathkeeper=PEP, Keto=PDP; XACML lineage), **centralized-authn / decentralized-authz**, **ReBAC / Google Zanzibar** (Keto), and **multi-tenant shared identity pool** (Auth0 "Organizations"). The coarse-access-at-the-center / fine-grained-domain-at-each-app split is explicitly recommended by Auth0, Ping Identity, AuthZed, Permit.io, Lindbakk. Keto+Oathkeeper is the right Ory-native tool for it.

**Runtime consumption — TWO models coexist (decided; this is the industry norm — Ory/Auth0/Keycloak all do both):**

| App type | How it consumes nova-id | Where per-app access is enforced |
|---|---|---|
| **First-party** (apps the operator deploys/controls) | Deployed BEHIND Oathkeeper (upstream reachable only via the gateway, never exposed directly) | Oathkeeper checks the Keto access relation **per request** + injects `X-User-*`; the app trusts the identity and does its own domain authz. BeyondCorp IAP. |
| **Third-party** (e.g. Acme, independent infra) | Registers as a Hydra **OAuth2 client**, runs Authorization Code + PKCE, validates the JWT itself via Hydra's public JWKS. **Its backend is NOT behind Oathkeeper.** | The **consent app** checks Keto membership **at token-issuance time** and accepts (emit token + `app:member` scope/claims) or rejects (`PUT /admin/oauth2/auth/requests/consent/reject`, `error: access_denied`, no token issued). |

- **Keto is the source of truth for access in BOTH** — gateway checks it per-request (first-party); the consent app checks it at issuance (third-party).
- The boundary is **operator-controlled infrastructure**: if nova-id deploys/routes it → behind Oathkeeper; if it's someone else's backend → OAuth2 consumer, gated at consent.
- Hydra has **no native Keto hook** — the consent app (the login/consent flow, currently in the BFF and implemented incorrectly per Theme 7) is the policy enforcement point for third-party token issuance and MUST do the Keto membership check. Fixing this is part of A1.
- Third-party recipe: register Hydra client → store membership in Keto (`App:<clientId>#member@user:x`) → consent app checks Keto, accept/reject, embed `app:member` scope + role claims in `session.access_token`/`session.id_token` → Acme validates `aud`/`scope`/claims via JWKS.

**Operational requirements this model imposes (must land before relying on it):**
- **Fail-CLOSED:** if Keto is unreachable or the tuple is absent → DENY. Today it's fail-OPEN (`authorizer: allow` on live rules) with Keto on `memory` DSN → move Keto to Postgres + seed-on-boot + run HA before flipping to fail-closed.
- **Stale-permission gap:** Keto has no zookie/ZedToken consistency token → revocation can lag a cached decision. Mitigate with short cache TTL + event-driven invalidation on role change.
- **Boundary ADR (anti-drift):** write an explicit ADR defining what lives in Keto (coarse access) vs each app (fine domain), or teams drift toward putting fine-grained logic in Keto.
- **App onboarding is a 2-system write** (Hydra client + Keto `App` object) → idempotent BFF Action with reconcile/cleanup; offboarding revokes the client AND deletes the `App:<appId>#*` tuples.
- **Audit is load-bearing:** every membership grant/revoke, recovery trigger, global-trait edit = append-only audit event (actor, action, app_id, target, ts).

**Optional future complements (not now):** Cerbos as a per-app fine-grained authz sidecar (documented Ory integration); SCIM 2.0 if apps need user provisioning/sync (provisioning, not authz). UMA 2.0 and OAuth2 scopes alone are NOT substitutes.

**Pitfalls to watch (cited research):** SPOF (gateway down → all apps down), per-request latency, stale permissions, fail-open misconfig, authorization sprawl, SCIM/JIT provisioning lag.

## Reordered plan

- **A0 — Security/foundations (NEW, do first):** close the 4 admin paths (rotate JWKS, `ory:protected` on `role`, `keto-write` admin check, close port 8080 / remove API from `ory-internal`); consolidate dead config (one live rule set; fix `version:`; secrets via env, no fallback); finish `ranks`→`roles` + unify role model in Keto (OPL).
- **A1 — BFF consolidation:** move privileged Ory calls (Kratos Admin, Keto, Hydra tokens) behind the NestJS API; `/api/admin/*` with its own Oathkeeper Keto-check rule; one generated `@nova-id/api-client` (tagged namespaces); fix the Hydra login-flow code (Theme 7).
- **A2 — Hardening:** DTOs/validation, throttler, helmet, API versioning, OpenAPI (two docs: public + admin-gated), CORS allowlist, recover/finish the `logs/` audit module.
- **B — Deploy (later):** TLS, secrets manager, prod DB/Redis HA, monitoring, K8s/Traefik, etc.

---
*Generated from parallel component audits. Severity reflects best-practice deviation, not exploitability in a specific deployment.*
