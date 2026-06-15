# ADR-0002: The IdP does not mint the `appRole` claim; the demo app owns its app-level roles

- **Status:** Accepted
- **Date:** 2026-06-14
- **Deciders:** Carlos (owner), architecture review
- **Context phase:** A1 (BFF consolidation), forced by A1-plan-2 (OAuth + access gates)
- **Relates to:** [ADR-0001](0001-idp-vs-demo-app-boundary.md)

## Context

nova-id is a central Identity Provider built on **Ory Hydra v25.4.0** (OAuth 2.0 / OIDC
Authorization Server), Ory Kratos (identity store), Ory Keto (ReBAC authorization), and Ory
Oathkeeper (identity-aware proxy). It is designed to serve **many** consuming applications, of
which the bundled demo app is the first.

### The two-layer authorization model (per ADR-0001)

| Layer | Owner | Store | Concept | Example values |
|---|---|---|---|---|
| **Platform / infrastructure** | IdP (nova-id) | Kratos `metadata_public.role` + Keto ReBAC | who you are on the *platform*, and what platform/app *access* you hold | `role: platform_admin`; `App:<appId>#access` |
| **Application domain** | Each consuming app | the app's own store (demo: SQLite `user_roles`) | what you may do *inside that one app* | `appRole: app_admin` / `app_user` |

These layers are intentionally separate (ADR-0001). The platform layer is app-agnostic; the
application layer is private to each app.

### What the code does today (the layering violation)

`AppService.acceptHydraLogin` and `acceptHydraConsent` inject `appRole` into Hydra's consent
**`session.id_token`** object:

- `api/src/app.service.ts:189` — `appRole: user.appRole` in the login-accept `session.id_token`.
- `api/src/app.service.ts:216` — `appRole: user.appRole` in the consent-accept `session.id_token`.

In Ory Hydra, **any data placed under `session.id_token` when accepting a consent request is copied
into the issued ID Token (and the UserInfo response); any data placed under `session.access_token`
is copied into the access token and surfaced on introspection under the `ext` field**
([Ory Hydra — custom session data](#sources); the Hydra introspection response marshals its `Extra`
field as the JSON key `ext` — [ory/hydra oauth2 package](#sources)). So today `appRole` reaches a
client **only** through the ID Token, and the access-token / introspection path has no role at all.

The downstream consequences are visible in the rest of the stack:

- **Oathkeeper id_token mutator already refuses to carry `appRole`.** Its claims template mints only
  `email`, `name`, and `role`, where `role` is read from the Kratos cookie path
  `.Extra.identity.metadata_public.role` or the introspection path `.Extra.ext.role`
  (`config/oathkeeper/oathkeeper.local.yml:135-137`). No `appRole` claim exists in the minted JWT.
- **The `/api-test/logs` 403 for Bearer callers.** Because the consent session populates only
  `session.id_token` (and never `session.access_token`), the access token / introspection `ext`
  carries **no `role` and no `appRole`**. An OAuth Bearer caller therefore arrives at the guard with
  neither — and is denied.
- **Dual-source ambiguity in the guards.** `AppAdminGuard` reads `user.appRole` from the JWT
  *first*, then falls back to the SQLite store
  (`api/src/guards/app-admin.guard.ts:24-27`); `logs.controller.ts:17` does the same
  (`user.appRole || await this.rolesService.getAppRole(...)`). An app-domain authorization decision
  thus depends on a claim the IdP should never have owned, and trusts it ahead of the app's own
  source of truth.

Having the central IdP sign an **app-domain** role into its tokens is a layering violation on three
counts: (1) the IdP would have to model every consuming app's internal role vocabulary; (2) the
issued-token schema would change every time a new app is onboarded; and (3) it inverts the standard
boundary between **authentication** (the IdP's job) and **application authorization** (the resource
server / app's job). OIDC Core 1.0 defines the ID Token as "a security token that contains Claims
about the Authentication of an End-User" whose `aud` "MUST contain the OAuth 2.0 client_id of the
Relying Party" — i.e. an authentication artifact for the client, not a carrier of one app's internal
RBAC ([OIDC Core §2](#sources)).

## Decision

**The IdP stops minting `appRole` in any token (ID Token or access token).**

- The IdP mints only:
  1. **Identity** claims (`sub`, `email`, `name`).
  2. The **platform `role`** (sourced from Kratos `identity.metadata_public.role` — an
     infrastructure-layer concept), carried on **both** token paths so it is available to OIDC
     clients (ID Token) *and* to OAuth Bearer / resource-server callers (access token →
     introspection `ext`).
  3. Keto-derived **platform/app *access* facts** (e.g. the `App:<appId>#access` membership added at
     consent) — coarse-grained, app-agnostic access, not app-domain roles.
- Each consuming app **resolves its own `appRole`** from its own store, keyed on the verified `sub`.
  The demo backend (`DemoModule`, per ADR-0001) reads `appRole` from its SQLite `user_roles` table.
  App-level authorization decisions are made by the app, from the app's own data — **never** read
  from an IdP-issued claim.

### Testable assertions

This decision is satisfiable and verifiable:

1. No issued ID Token or access token (nor introspection `ext`) contains an `appRole` claim, for any
   client — grep the consent session bodies and an introspection capture.
2. The access-token path carries the platform `role`: an OAuth Bearer call to `/api-test/logs`
   succeeds for a `platform_admin`, because Oathkeeper reads `role` from introspection `ext`
   (`oathkeeper.local.yml:137`, `.Extra.ext.role`).
3. The guards have a **single** source for `appRole` (SQLite); a forged or stale `appRole` JWT claim
   cannot satisfy a guard, because the guard never reads one.

## Alternatives considered

- **Keep minting `appRole`, just move it from `session.id_token` to `session.access_token`.**
  Rejected. It would fix the `/api-test/logs` 403 symptom (the role would reach introspection `ext`)
  but entrench the layering violation: the IdP still owns an app-domain concept and the token schema
  still changes per app. RFC 9068 §2.2.3.1 does permit `roles`/`groups`/`entitlements` in a JWT
  access token — **but only as attributes meaningful for the resource(s) named in `aud`**
  ([RFC 9068](#sources)). An app's private `appRole` is meaningful only to that one app; placing it
  in a token the IdP issues for an unbounded set of audiences violates the audience-scoping
  intent. The platform `role`, by contrast, *is* an IdP-resource attribute and legitimately belongs
  on the IdP-issued token.

- **Merge the per-app SQLite roles into Keto.** Out of scope and explicitly rejected by the owner.
  The platform/infra layer (Keto) and the application-domain layer (SQLite) stay separate
  (ADR-0001). Collapsing them would re-create the same coupling from the opposite direction.

## Consequences

**Positive**

- **Clean layering and standard boundary.** The IdP owns authentication + infra authorization
  (Keto); each app owns its application authorization (its own store). This matches the OAuth/OIDC
  separation of an Authorization Server from a Resource Server's local authorization logic
  ([OIDC Core §2](#sources), [RFC 9700 §2.3 least privilege](#sources)).
- **Stable, app-agnostic token schema.** Onboarding a new app requires **no** change to the IdP
  token contract. Tokens stay minimal, which RFC 8725 (JWT BCP) and RFC 9700 favour — fewer claims,
  clearer purpose, smaller blast radius on leakage ([RFC 8725](#sources), [RFC 9700](#sources)).
- **Single source of truth for `appRole`.** The app's store is authoritative; a stale or forged
  `appRole` claim can never satisfy a guard because no guard reads one.
- **Audience hygiene preserved.** Keeping app-domain authz out of the IdP token keeps the IdP free to
  audience-restrict its access tokens to the resources it actually fronts, per RFC 9068 / RFC 9700 /
  RFC 8725 audience guidance ([RFC 9068](#sources), [RFC 9700](#sources), [RFC 8725](#sources)).

**Negative**

- The app backend performs a store lookup per request that needs `appRole`. It already does this on
  the fallback path; this change removes the JWT shortcut. Negligible at demo scale, and cacheable if
  ever needed.
- `frontend-app` can no longer derive `appRole` by decoding the ID Token client-side. It calls the
  demo `/api-test/me` endpoint instead (which it already does). Trusting a server lookup over a
  client-decoded claim is the more correct posture anyway — clients must not make authorization
  decisions from ID Token contents ([OIDC Core §2](#sources)).

**Neutral**

- The platform `role` claim and the planned Keto `App:<appId>#access` consent gate are unaffected;
  both are infra-layer and remain the IdP's responsibility.

## Trade-offs

The `/api-test/logs` 403 is resolved **not** by adding `appRole`, but by carrying the **platform
`role`** on the access-token path. Concretely: add `role` to the consent `session.access_token`
object so Hydra surfaces it on introspection under `ext`; Oathkeeper already reads
`.Extra.ext.role` into the minted JWT `role` claim (`oathkeeper.local.yml:137`), so a Bearer caller
finally arrives at the guard with a usable platform `role`. The demo then derives `app_admin` from
its own SQLite store and treats `platform_admin` from the platform `role` claim as the infra-level
override. **App-correctness and a stable token contract are prioritised over the convenience of a
single all-in-one token.**

## Implementation references

- `api/src/app.service.ts` (login/consent accept bodies — remove `appRole`; add platform `role` to
  `session.access_token` so it reaches introspection `ext`).
- `api/src/guards/app-admin.guard.ts`, `api/src/guards/app-user.guard.ts`,
  `api/src/logs/logs.controller.ts` (drop the JWT `appRole` branch; SQLite becomes sole source).
- `config/oathkeeper/oathkeeper.local.yml` / `oathkeeper.production.yml` (id_token mutator — keep
  `role` on the introspection/`ext` path; do **not** add `appRole`).
- `frontend-app/src/composables/useHydraOAuth.js`, `frontend-app/src/views/Logs.vue` (stop reading
  `appRole` from the decoded ID Token; rely on the backend lookup).

## Sources

- [Ory Hydra — custom session data / consent](https://www.ory.com/docs/hydra/guides/custom-session-data) —
  data set under `session.id_token` at consent-accept lands in the ID Token (and UserInfo); data set
  under `session.access_token` lands in the access token and is returned on introspection. (Page is
  the current ory.com home for Hydra session customization; the `ory.sh` path 301-redirects here.)
- [Ory Hydra — OAuth 2.0 token introspection](https://www.ory.com/docs/hydra/guides/oauth2-token-introspection) —
  introspection (RFC 7662) lets a resource server retrieve `active`, `sub`, `scope`, and session
  data for an access token.
- [ory/hydra `oauth2` Go package](https://pkg.go.dev/github.com/ory/hydra/oauth2) — the introspection
  response's `Extra` field is JSON-marshalled as `ext`; supports that custom `session.access_token`
  claims surface under `ext`, which Oathkeeper reads as `.Extra.ext.role`.
- [OpenID Connect Core 1.0 — §2 ID Token](https://openid.net/specs/openid-connect-core-1_0.html) —
  the ID Token is "a security token that contains Claims about the Authentication of an End-User";
  its `aud` "MUST contain the OAuth 2.0 client_id of the Relying Party." Supports: ID Token =
  authentication artifact for the client, not a carrier of app-internal RBAC.
- [RFC 9068 — JWT Profile for OAuth 2.0 Access Tokens](https://www.rfc-editor.org/rfc/rfc9068.html) —
  §2.2.3.1 permits `roles`/`groups`/`entitlements` claims, but scope strings "MUST have meaning for
  the resources indicated in the `aud` claim"; `typ` SHOULD be `at+jwt`. Supports: authorization
  claims in an access token must be scoped to the audience/resource that owns them.
- [RFC 8725 — JSON Web Token Best Current Practices](https://datatracker.ietf.org/doc/html/rfc8725) —
  when an issuer serves more than one relying party, JWTs MUST carry `aud` and relying parties MUST
  validate it; explicit typing (`typ`) recommended to prevent cross-purpose confusion. Supports:
  audience restriction and keeping tokens narrowly purposed.
- [RFC 9700 — OAuth 2.0 Security Best Current Practice](https://datatracker.ietf.org/doc/html/rfc9700) —
  access tokens SHOULD be audience-restricted to a specific resource server; token privileges SHOULD
  be the minimum required (§2.3 least privilege). Supports: not overloading IdP tokens with another
  app's authorization data; minimal, audience-scoped tokens.
