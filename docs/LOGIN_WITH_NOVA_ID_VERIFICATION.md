# "Login with Nova ID" — Industry Standard Verification

This document verifies that the **Login with Nova ID** flow in the test app follows OAuth 2.0 and OpenID Connect (OIDC) industry standards, and documents the current implementation.

---

## 1. Industry standards (summary)

| Standard | Requirement | Purpose |
|----------|-------------|---------|
| **RFC 6749** (OAuth 2.0) | Authorization Code flow | Exchange authorization code for tokens at token endpoint (no tokens in URL). |
| **RFC 7636** (PKCE) | `code_verifier` + `code_challenge` (S256) | Protect public clients from authorization code interception. |
| **RFC 8252** | Use browser for auth (no embedded WebView) | Test app uses full redirect → compliant. |
| **OIDC Core** | `response_type=code`, scopes `openid`, `profile`, `email` | Identity and profile. |
| **OIDC / BCP** | `state` parameter | CSRF protection on callback. |
| **OIDC / BCP** | `nonce` in auth request, echoed in `id_token` | Replay protection for ID token. |
| **OIDC / BCP** | `redirect_uri` in auth and token request | Must match client registration exactly. |
| **RFC 9700** (OAuth 2.0 Security BCP) | PKCE for public clients, validate redirect_uri | Aligns with above. |

---

## 2. Current test app implementation

### 2.1 Entry point and configuration

- **App.vue**: `startOAuth()` calls `initiateOAuthFlow(oauthClientId, oauthRedirectUri)`.
- **Client ID**: `VITE_NOVA_ID_CLIENT_ID` or `'nova-id-test-app'`.
- **Redirect URI**: `(VITE_APP_URL || window.origin)/callback` (e.g. `http://app.ory.localhost/callback`, `http://localhost:5175/callback`).
- **Hydra URL**: `VITE_HYDRA_PUBLIC_URL` or derived from origin (e.g. `/api/hydra-public`).

### 2.2 Authorization request (`useHydraOAuth.js` → `initiateOAuthFlow`)

| Requirement | Implementation | Status |
|-------------|----------------|--------|
| **response_type=code** | Sent in auth URL params | ✅ |
| **client_id** | Passed and sent | ✅ |
| **redirect_uri** | Passed and sent (must match Hydra client config) | ✅ |
| **scope** | `openid profile email offline_access` | ✅ |
| **state** | Random string (RFC 6749 charset), stored in sessionStorage, validated on callback | ✅ CSRF |
| **code_challenge** | SHA-256 of code_verifier, base64url (no padding) | ✅ PKCE (RFC 7636) |
| **code_challenge_method** | `S256` | ✅ |
| **nonce** | Random string, stored; validated in id_token after token exchange (OIDC replay protection) | ✅ |

Code verifier: 43 chars from `A-Za-z0-9-._~` (RFC 7636). Stored in sessionStorage and cleared after token exchange.

### 2.3 Callback and token exchange

| Requirement | Implementation | Status |
|-------------|----------------|--------|
| **Validate state** | Callback compares `state` query param to stored state; rejects on mismatch | ✅ |
| **Token request** | POST to `/oauth2/token`, `application/x-www-form-urlencoded` | ✅ |
| **grant_type** | `authorization_code` | ✅ |
| **code** | From callback query | ✅ |
| **redirect_uri** | Same value as in auth request (from sessionStorage) | ✅ |
| **client_id** | From sessionStorage | ✅ |
| **code_verifier** | From sessionStorage, then cleared | ✅ |
| **Single-use code** | Hydra invalidates code; callback handles "already used" (e.g. back button) | ✅ |

### 2.4 Client registration (Hydra)

- **scripts/setup-hydra-test-app-client.sh**:
  - `redirect_uris`: fixed list (e.g. `http://app.ory.localhost/callback`, `http://localhost:5175/callback`).
  - `token_endpoint_auth_method`: `none` (public client).
  - `pkce_required`: `true`.
  - `grant_types`: `authorization_code`, `refresh_token`.
  - `response_types`: `code`.
  - `scope`: `openid profile email offline_access`.

Redirect URIs are server-side configured; the app only sends one of these. ✅

### 2.5 Token storage and usage

- **Storage**: Access token and id_token stored in **sessionStorage** under a prefixed key. **Refresh token stored in memory only** (not in sessionStorage) per OAuth 2.0 Security BCP; it is lost on page reload.
- **Usage**: Access token sent as `Authorization: Bearer` to the test API; Oathkeeper introspects it. User/role come from `/me` (and optionally from id_token claims for fallback). On 401, the app attempts **token refresh** once using the in-memory refresh_token, then retries the request.
- **ID token**: Decoded in the frontend for display/fallback; **exp and iat validated** via `validateIdTokenClaims()` (OIDC-style). No signature verification in the SPA; backend (Oathkeeper/Hydra) validates tokens on API calls. ✅

### 2.6 Callback page (`Callback.vue`)

- Reads `code` and `state` from query; validates `state` before calling `handleOAuthCallback`.
- Handles OAuth error params; treats "already used" / invalid_grant as “already signed in” and redirects to `/`.
- On success: stores tokens, clears OAuth params from sessionStorage, redirects to `/`.

---

## 3. Gaps and recommendations

### 3.1 Nonce (OIDC) — implemented

- **Standard**: OIDC recommends sending a `nonce` in the authorization request and validating that the `id_token` contains the same `nonce` to prevent replay.
- **Current**: `nonce` is generated, stored in sessionStorage, sent in the auth request, and validated against the `id_token` claim after token exchange. If the nonce does not match, the flow rejects with "Invalid id_token nonce - possible replay".
- **Status**: ✅ Implemented in `useHydraOAuth.js` (initiateOAuthFlow + handleOAuthCallback).

### 3.2 Token storage — implemented

- **Standard**: OAuth 2.0 Security BCP (e.g. RFC 9700) suggests considering risks of storing refresh tokens in browser storage.
- **Current**: **Refresh token is stored in memory only** (module-level variable in `useHydraOAuth.js`); it is **not** written to sessionStorage. Access token and id_token remain in sessionStorage. On page reload, refresh_token is lost and the user must log in again when the access token expires.
- **Token refresh**: When the app receives 401 on `/me`, it calls `refreshAccessToken(clientId)` once; on success it retries `/me`. If refresh fails or is not available, tokens are cleared and the user is shown as logged out.
- **Status**: ✅ Implemented.

### 3.3 ID token validation in the SPA — implemented

- **Standard**: OIDC expects clients to validate id_token (signature, iss, aud, exp, nonce, etc.).
- **Current**: Frontend validates **exp** and **iat** via `validateIdTokenClaims(claims)` (with configurable clock skew). Used after decoding id_token in the callback (nonce check), in fallback role/display logic (App.vue, Home.vue, Logs.vue), and in the debug panel. Nonce is validated in the callback. Signature verification remains on the backend (Oathkeeper/Hydra).
- **Status**: ✅ Implemented.

---

## 4. Summary table

| Area | Standard / BCP | Test app | Status |
|------|----------------|----------|--------|
| Flow | Authorization Code (OAuth 2.0 + OIDC) | Yes | ✅ |
| PKCE | code_verifier + S256 code_challenge | Yes | ✅ |
| State | Random, stored, validated on callback | Yes | ✅ |
| redirect_uri | Sent in auth and token; fixed in Hydra | Yes | ✅ |
| Client type | Public client, token_endpoint_auth_method: none | Yes | ✅ |
| Scopes | openid, profile, email, offline_access | Yes | ✅ |
| Token exchange | POST, code + code_verifier + redirect_uri | Yes | ✅ |
| Nonce | Recommended for OIDC id_token replay protection | Sent in auth request; validated in id_token on callback | ✅ |
| Token storage | sessionStorage for access/id; refresh in memory only | refresh_token not in sessionStorage; refresh on 401 | ✅ |
| ID token claims | Validate exp, iat (OIDC) | validateIdTokenClaims() used in callback and UI | ✅ |
| Token refresh | Use refresh_token on 401 | refreshAccessToken(); used in refreshAuth on /me 401 | ✅ |
| Backend validation | Oathkeeper introspects access token | Yes | ✅ |

**Conclusion:** The "Login with Nova ID" flow in the test app follows OAuth 2.0 and OIDC industry standards: Authorization Code + PKCE (S256), state (CSRF), nonce (id_token replay protection), redirect_uri validation, and public client configuration. It aligns with RFC 6749, RFC 7636 (PKCE), and OIDC Core / BCP.
