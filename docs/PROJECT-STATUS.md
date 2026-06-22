# Nova ID — Project Status

> Single source of truth for current production state, phase history, and open items.
> Last updated: 2026-06-21.

---

## Current state

Nova ID **v1.2.0** is live in production. The identity platform runs on four public subdomains:
`id.cativo.dev` (IdP gateway / OIDC issuer), `auth.cativo.dev` (login/consent/registration UI),
`admin.cativo.dev` (platform-admin dashboard), and `app.cativo.dev` (demo relying party). Deployment
is fully automated via tag-triggered GitHub Actions → Docker Hub → pull-based CD on the production
host (`scripts/deploy-prod.sh`). The Ory stack (Kratos, Hydra, Keto, Oathkeeper) runs on Postgres
with TLS via Traefik. The demo OAuth2 relying-party E2E flow is verified at `app.cativo.dev`.

---

## Phase history

All phases are complete as of v1.2.0.

| Phase | Scope | PRs |
|-------|-------|-----|
| **A0 — Security foundations** | Close 4 admin-escalation paths, rotate JWKS, `ory:protected` on role trait, `keto-write` authz, dead-config cleanup, `ranks`→OPL migration | #25, #26, #27 |
| **A1 — BFF consolidation** | Move Ory admin calls behind NestJS BFF (`/v1/admin/*`), generated `@nova-id/api-client`, fix Hydra login-flow, ADRs 0001–0005 | #28, #29, #30, #31 |
| **A2 — Hardening** | DTOs/validation, throttler, helmet, API versioning (`/v1`), OpenAPI split (public+admin), CORS allowlist, Postgres audit, frontend logger, Mode-A authz fix, BFF guard, access-log `@LogAccess` decorator, OAuth2-client CRUD via BFF | #33, #34, #35, #36, #40, #41, #42, #43, #44, #47, #58, #60 |
| **Demo RP** | Demo relying-party app (`app.cativo.dev`), E2E OAuth2 PKCE flow, demo-api service | #51, #53, #54, #55, #57 |
| **B1 / B2 — Manual deploy** | Production infrastructure bootstrap, Traefik TLS, Postgres multi-DB, first-admin provisioning | (manual; logged in `docs/superpowers/DEPLOY-LOG-B2.md`) |
| **B3 — Automated CD** | Registry-first release workflow, per-PR image build gate, pull-based deploy scripts, GitHub Actions tag-triggered CD, production runbook | #61, #62, #63, #64, #65 |

---

## Open items / follow-ups

| # | Item | Status |
|---|------|--------|
| [#20](https://github.com/cativo23/nova-id/issues/20) | Kratos session lifespan hardened — fix in progress, PR #66 | In flight |
| [#23](https://github.com/cativo23/nova-id/issues/23) | `docs/HYDRA_SETUP.md` stale domains (`oidc.cativo.dev`, `gateway.cativo.dev`) | Fixed in this PR |
| [#24](https://github.com/cativo23/nova-id/issues/24) | `frontend-admin` router guards have no timeout/fallback on permission check | Deferred |
| — | Rate limiting: `ThrottlerModule` in NestJS + Oathkeeper rate limits | Backlog |
| — | Keto write-protection: `keto-write` rule needs `administer` authz check | Backlog |
| — | Observability: metrics for failed logins / authz errors | Backlog |

---

## Security checklist (living)

See [`docs/SECURITY_REPORT.md`](./SECURITY_REPORT.md) for the full report. Summary of still-open items:

- Rate limiting not yet implemented (NestJS `ThrottlerModule` + Oathkeeper).
- Keto write-protection rule lacks `remote_json` admin authz.
- Observability / metrics for security events not yet configured.

All P0 items (admin escalation paths, JWKS rotation, secrets hygiene, CORS, CSP/HSTS, audit logging, token logging, PKCE, open redirect, Kratos-admin direct route) are resolved. See `SECURITY_REPORT.md` for PR references.

---

## Roles model (summary)

Nova ID implements a **three-layer authorization model** defined in ADR-0002 and ADR-0003 and enforced by Oathkeeper (PEP) + Keto (PDP):

| Layer | Lives in | Decides | Enforced by |
|-------|----------|---------|-------------|
| **Platform** | Keto (nova-id) | Who administers the IdP itself | Oathkeeper + BFF guards |
| **Per-app ACCESS** | Keto (nova-id) | Can user X consume / administer app Y? | Oathkeeper (per-request Keto check) |
| **Per-app DOMAIN** | Each app's own DB | Editor / reader / viewer inside the app | The app itself |

Keto is the source of truth for the platform and per-app access layers. `Platform:nova#administer@user:<id>` = platform admin. `App:<appId>#access@user:<id>` = may consume the app; `App:<appId>#administer@user:<id>` = may administer that app's users. Per-app domain roles (editor/reader/etc.) live in each app's own DB and are never stored in Keto. See [`docs/AUDIT_FINDINGS.md`](./AUDIT_FINDINGS.md) (historical) for the full rationale and validation.
