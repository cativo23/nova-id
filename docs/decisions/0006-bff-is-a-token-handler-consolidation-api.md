# ADR-0006: The server tier is a shared token-handler / IdP consolidation API, not a per-frontend BFF

- **Status:** Accepted
- **Date:** 2026-06-17
- **Deciders:** Carlos (owner), architecture review (4-agent adversarial panel + go/no-go validation)
- **Context phase:** Post-A2 (after hardening PRs #33–#36), reviewing the shape of the `api/` tier
- **Relates to:** [ADR-0001](0001-idp-vs-demo-app-boundary.md), [ADR-0003](0003-three-layer-authorization-model.md), [ADR-0004](0004-per-app-access-enforcement-dual-mode.md), [ADR-0005](0005-generated-api-client-and-workspace.md)

## Context

The `api/` NestJS tier sits between the three Vue SPAs (`frontend-auth`, `frontend-admin`,
`frontend-app`) and the Ory stack (Kratos / Hydra / Keto / Oathkeeper). It has been referred to
internally as "the BFF". After A2 hardening closed, the question was raised explicitly: **is this a
good pattern, and is "BFF" even the right name for it?** A 4-agent adversarial panel (defender,
red-team, standards-grounded, pragmatist) was run, followed by a go/no-go validation agent. The
panel converged; this ADR records the decision so it is not re-litigated from memory.

Two facts about the runtime shape force the question:

1. **The browser holds no tokens.** A SPA never sees an OAuth access/refresh token or the Kratos
   session in JS-readable form. The flow is: the SPA calls the same-origin gateway seam (`/api`,
   `withCredentials: true` → sends the Kratos session cookie,
   `packages/api-client/src/mutator/custom-instance.ts:5-11`); Oathkeeper authenticates the cookie
   and **mints a short-lived RS256 `id_token` JWT** via its `id_token` mutator
   (`config/oathkeeper/oathkeeper.local.yml:128-132`, `jwks_url` →
   `id_token.jwks.json`); the BFF then **verifies that JWT against Oathkeeper's JWKS** (RS256 +
   issuer + `sub` presence) on every request
   (`api/src/guards/authenticated.guard.ts:12,38-58,83-100`). This is the *token-handler* security
   property: the token-handling and token-verifying component is server-side; the browser is a
   confidential-client-free cookie holder.

2. **A server component is structurally unavoidable.** Several operations cannot live in a browser:
   Kratos **Admin** identity CRUD, Hydra **login/consent accept** (`api/src/app.service.ts`,
   `acceptHydraConsent`), and Keto **writes** (membership grants). Even an adversarial red-team
   tasked with eliminating the server tier conceded these must be server-side. The only real design
   question is therefore *what to call the tier and how broad its remit is*, not *whether it exists*.

The naming tension: Sam Newman's "Backend for Frontend" pattern is canonically **one BFF per
frontend experience**, shaping responses for a single client. Our `api/` tier is instead **one
shared tier serving all three SPAs** with a thin, mostly-uniform IdP surface (~10 endpoints), and
it self-describes in code as an *"Ory consolidation layer"* (`api/src/main.ts:67-68`). Calling it
"BFF" is therefore half-accurate: it has the BFF *security* property (token-handler) but not the
BFF *cardinality* (per-frontend).

## Decision

**The `api/` tier is a shared *token-handler / IdP consolidation API*, and we adopt that as its
precise name.** "BFF" remains acceptable shorthand for the **security property** (browser holds no
tokens; a server component handles and verifies them), but the canonical description is:

- **Token-handler** — per the IETF `draft-ietf-oauth-browser-based-apps` / Curity token-handler
  pattern: the browser is cookie-authenticated, the server mints (at the gateway) and verifies (at
  the BFF) the JWT, and no token reaches JS.
- **IdP consolidation API** — a single shared server tier that consolidates the Ory control-plane
  operations (Kratos Admin, Hydra consent, Keto writes/checks) behind one authenticated,
  same-origin seam for all first-party SPAs. It is **not** one-BFF-per-frontend.

The shared-not-per-frontend shape is an **accepted variant**, valid because the three SPAs share a
near-identical IdP experience and the typed, tags-split client (ADR-0005) already gives each SPA
interface-level isolation without a separate backend.

### Switch trigger

Revisit this decision and split out a dedicated backend **only if** a frontend (most likely
`frontend-app`) becomes a real product application needing its own non-Ory domain backend. At that
point the per-frontend BFF cardinality may become justified for that app; the IdP consolidation API
stays as-is for the IdP surface.

## Alternatives considered

- **Gateway-only (no server tier; Oathkeeper does everything).** Rejected — structurally
  impossible. Kratos Admin CRUD, Hydra consent accept, and Keto writes require an authenticated
  server caller; a reverse proxy cannot originate them. (Same conclusion ADR-0004 reached for the
  third-party consent flow.)

- **One BFF per frontend (canonical Newman).** Rejected for now — 3× the backend surface,
  deployment, and auth wiring for three SPAs that consume a near-identical IdP API. ADR-0005's
  tags-split generated client already isolates each SPA's *interface* against the shared backend, so
  the per-frontend split would buy little today. Kept as the documented switch trigger above.

- **Ory Network (managed) instead of self-hosting the consolidation tier.** Rejected — the project
  is explicitly self-hosted (the whole premise of nova-id); a managed control plane contradicts
  that constraint.

- **Serverless functions for the IdP operations.** Rejected — the operations need internal-network
  access to Ory admin ports and a persistent connection pool (the audit Postgres connection,
  ADR-style separation from the demo SQLite); per-invocation functions fit poorly and add cold-start
  and connection-churn cost for no benefit at this scale.

- **tRPC / GraphQL as the SPA↔BFF wire format.** Neutral, not adopted — a different transport over
  the same tier; it changes the wire format, not the architectural decision. The REST + generated
  client (ADR-0005) is already in place.

## Consequences

### Positive

- **Shared name, shared mental model.** "Token-handler / IdP consolidation API" describes both what
  it secures (no browser tokens) and what it consolidates (the Ory control plane), removing the
  recurring "is this really a BFF?" confusion.
- **Browser attack surface minimised.** No access/refresh token in the SPA = no token exfiltration
  via XSS; the cookie is `httpOnly` and the JWT lives only between gateway and BFF.
- **One tier to harden.** A2's hardening (helmet, throttler, audit, versioning) applies once, not
  three times.

### Negative

- **Shared tier = shared blast radius.** A bug or outage in the consolidation API affects all three
  SPAs at once. Mitigation: the tier is thin and well-tested (78/78 BFF tests); the switch trigger
  exists if one frontend's needs diverge enough to warrant isolation.
- **"BFF" shorthand persists in code/comments.** We keep it for the security property but must not
  let it imply per-frontend cardinality. Mitigation: this ADR is the canonical reference; `main.ts`
  already says "consolidation layer".

### Neutral

- The decision is descriptive of the system as already built (A0–A2); it formalises an existing
  shape rather than mandating new work. No code change ships with this ADR.

## Trade-offs

We prioritise a single, well-hardened, single-source-of-truth IdP seam over the response-shaping
benefit of per-frontend BFFs. We accept a shared blast radius as the cost, bounded by keeping the
tier thin and by an explicit switch trigger should a frontend become a product app in its own right.

## Sources

Decision-grounding repo references (verified in-tree):

- `packages/api-client/src/mutator/custom-instance.ts:5-11` — same-origin `/api` gateway client,
  `withCredentials: true` (cookie → gateway), no token in the browser.
- `config/oathkeeper/oathkeeper.local.yml:116,128-132` — Oathkeeper `id_token` mutator mints the
  RS256 JWT from the cookie session, signed via `id_token.jwks.json`.
- `api/src/guards/authenticated.guard.ts:12,19-20,38-58,83-100` — the BFF verifies every request's
  Bearer JWT against the Oathkeeper JWKS (RS256 + issuer + mandatory `sub`).
- `api/src/main.ts:67-68` — the tier self-describes as "Self-hosted central IdP BFF — Ory
  consolidation layer".
- `api/src/app.service.ts` (`acceptHydraConsent`) — Hydra consent accept/reject, a structurally
  server-side operation.
- ADR-0001 (boundary), ADR-0004 (per-app access enforcement / token-handler-adjacent gateway+consent
  PEPs), ADR-0005 (tags-split generated client giving per-SPA interface isolation).

External authoritative sources:

- Sam Newman — *Backend For Frontend* pattern:
  <https://samnewman.io/patterns/architectural/bff/> (canonical one-BFF-per-frontend definition;
  basis for classifying ours as a shared variant).
- IETF — *OAuth 2.0 for Browser-Based Applications* (`draft-ietf-oauth-browser-based-apps`):
  <https://datatracker.ietf.org/doc/html/draft-ietf-oauth-browser-based-apps> (the token-handler /
  BFF architecture for SPAs; browser holds no tokens).
- Curity — *The Token Handler Pattern*:
  <https://curity.io/resources/learn/the-token-handler-pattern/> (cookie front-channel + server-side
  token handling, the security property this tier implements).
- NIST SP 800-207, *Zero Trust Architecture*:
  <https://csrc.nist.gov/pubs/sp/800/207/final> (layered PEPs; cited in ADR-0004).
- RFC 9700, *Best Current Practice for OAuth 2.0 Security*:
  <https://datatracker.ietf.org/doc/rfc9700/> (first-party vs third-party trust classes; token
  exposure minimisation).
