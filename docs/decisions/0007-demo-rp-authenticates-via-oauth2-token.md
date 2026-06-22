# ADR-0007: The demo relying-party authenticates via its OAuth2 token (invokes ADR-0006's switch trigger)

- **Status:** Accepted
- **Date:** 2026-06-22
- **Deciders:** Carlos (owner), OAuth architect review
- **Invokes switch trigger of:** [ADR-0006](0006-bff-is-a-token-handler-consolidation-api.md) — for `frontend-app` specifically
- **Relates to:** [ADR-0001](0001-idp-vs-demo-app-boundary.md), [ADR-0006](0006-bff-is-a-token-handler-consolidation-api.md)

## Context

### ADR-0006's switch trigger has fired for `frontend-app`

ADR-0006 establishes the **token-handler / IdP consolidation API** pattern for the first-party SPAs
(`frontend-auth`, `frontend-admin` ↔ the `api/` IdP consolidation API). That pattern is correct and
remains in force for those SPAs: the browser holds no tokens, the Kratos session cookie flows to the
gateway, Oathkeeper mints a short-lived id_token JWT, and the BFF verifies it server-side.

ADR-0006's "Switch trigger" section reads:

> Revisit this decision and split out a dedicated backend **only if** a frontend (most likely
> `frontend-app`) becomes a real product application needing its own non-Ory domain backend. At that
> point the per-frontend BFF cardinality may become justified for that app; the IdP consolidation API
> stays as-is for the IdP surface.

**That trigger has fired.** In PRs #53/#54, `frontend-app` was extracted from the shared IdP surface
into a standalone OAuth2 Relying Party with its own backend (`demo-api`). It is no longer a
first-party SPA calling the IdP consolidation API; it is a third-party-style demo OAuth2 RP calling
a separate resource server. The correct credential model for a real OAuth2 RP is its own access
token — not the Kratos SSO cookie the user established with the Authorization Server.

**This ADR applies ONLY to the demo RP path (frontend-app + /api-test/\* Oathkeeper rules +
demo-api).** The first-party `/api/v1/*` rules and first-party SPAs correctly keep the
`cookie_session` / token-handler pattern per ADR-0006 and are unchanged.

### The deny-consent bug

The architecture that survived the extraction had a fatal correctness flaw: **`frontend-app`
discarded the OAuth2 access token after the PKCE callback and relied on the Kratos session cookie
for all `/api-test/*` calls.** The Oathkeeper `api-test` rule authenticated via `cookie_session`
(primary) with `oauth2_introspection` as fallback.

Consequence: **denying consent rejected the OAuth2 grant but the Kratos session cookie persisted.**
Because the RP's authentication decision was based on the cookie (not the token), denying consent had
no effect on the RP's "logged in" state — the user still saw the dashboard and could call all
protected `/api-test/*` endpoints. The OAuth2 grant was decorative; it played no role in access
control.

This violates the core OAuth2 principle that a Relying Party's access to a resource server MUST be
gated on a valid grant, not on a session the user established with the Authorization Server for an
unrelated purpose.

### Claims propagation (verified pre-fix — clean swap)

Switching the gateway from `cookie_session` to `oauth2_introspection` is a **clean swap** because the
BFF already injects the necessary claims into `session.access_token` at consent time
(`api/src/app.service.ts` — `email`, `name`, `role`, `app_access: true`). Hydra introspection returns
these under `ext`. The Oathkeeper `id_token` mutator template already has the `Extra.ext.*` fallback
branch (both `oathkeeper.local.yml` and `oathkeeper.production.yml`). No BFF or demo-api changes are
required.

### The `required_scope: [oauth2]` mismatch (found during fix)

The production Oathkeeper config had `required_scope: [oauth2]` on the `oauth2_introspection`
authenticator. The `nova-id-test-app` OAuth client's allowed scopes are
`openid profile email offline_access` — no `oauth2` scope — so Oathkeeper would have rejected all
tokens at introspection. The `required_scope` gate was removed; the Keto authorizer
(`App:nova-id-test-app#access`) is the correct and sufficient access gate.

## Decision

**The demo RP (`frontend-app` + `demo-api`) authenticates its API calls via its OAuth2 access token,
not the Kratos session cookie.**

Concretely:
1. `handleOAuthCallback` stores the access token in sessionStorage after a successful PKCE exchange.
2. `Home.vue` gates the authenticated dashboard on the presence of a stored access token. No token =
   unauthenticated, regardless of any active Kratos session.
3. All `/api-test/*` calls send `Authorization: Bearer <access_token>`. `credentials: 'include'` is
   removed from those calls so the Kratos cookie is not sent.
4. The Oathkeeper `api-test` rule (in both `rules.local.json` and `rules.production.json`) uses
   `oauth2_introspection` as the sole authenticator. The local-only `api-test-app-gate` rule gets the
   same treatment. `cookie_session` is removed from these demo-RP rules.
5. On deny/error callback, the stored access token is cleared to ensure the user is not authenticated.

**The token-handler pattern of ADR-0006 remains the decision for the first-party SPAs**
(`frontend-auth` / `frontend-admin` ↔ `api/` IdP consolidation API). Their Oathkeeper rules, the
BFF `authenticated.guard.ts`, and the shared API client are all unchanged.

The Kratos cookie retains its role for the IdP's own routes (login/consent UI, BFF endpoints). It is
not used to authenticate demo RP API calls.

## Consequences

**Positive**
- Denying consent now correctly leaves the user unauthenticated at the demo RP.
- The RP's auth state is tied to its OAuth2 grant — the standard OAuth2/OIDC model.
- Cookie scope is narrowed: the Kratos SSO cookie is no longer the credential for a third-party RP's
  APIs.
- The `required_scope` misconfiguration is corrected, making the production gateway match the actual
  client's token capabilities.
- ADR-0006's switch trigger is exercised cleanly: the first-party pattern remains intact; only the
  extracted demo RP changes.

**Negative**
- The access token is stored in sessionStorage. This is appropriate for a demo RP but should be
  replaced with a token-handler/BFF pattern for any production RP (per ADR-0006).
- Refreshing the page clears sessionStorage → user must re-authenticate. Acceptable for a demo; a
  production RP would use refresh tokens via the BFF.

**E2E verification required (post-deploy)**
1. **Allow flow**: complete login + consent → dashboard appears, `/api-test/me` returns user data.
2. **Deny flow**: complete login → deny consent → Callback shows error, redirect to `/` shows
   unauthenticated landing (NOT the dashboard).
3. **Token-only gate**: clear Kratos cookie in DevTools, keep access token in sessionStorage → API
   calls still succeed.
4. **Cookie-only gate (negative)**: clear access token from sessionStorage, keep Kratos cookie →
   API calls return 401 from Oathkeeper.

## Implementation references

- `frontend-app/src/composables/useHydraOAuth.ts` — `handleOAuthCallback` stores access token; new
  `getStoredAccessToken`/`clearStoredAccessToken` helpers
- `frontend-app/src/views/Home.vue` — dashboard gated on stored token; Bearer auth on all
  `/api-test/*` calls
- `frontend-app/src/views/Callback.vue` — clears stored token on deny/error
- `config/oathkeeper/rules.local.json` — `api-test` and `api-test-app-gate` rules (the local config
  has both): `oauth2_introspection` only
- `config/oathkeeper/rules.production.json` — `api-test` rule only (production has no separate
  `api-test-app-gate`; the single `api-test` rule covers the whole `/api-test/` namespace):
  `oauth2_introspection` only
- `config/oathkeeper/oathkeeper.production.yml` — removed `required_scope: [oauth2]`
