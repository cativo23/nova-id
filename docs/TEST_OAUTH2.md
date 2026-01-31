# Testing OAuth2 "Login with Nova ID" (Test App)

## Prerequisites

- Stack running: `docker compose -f docker-compose.yml -f docker-compose.local.yml up -d`
- OAuth client for the test app registered in Hydra
- **CORS**: Only Oathkeeper adds CORS (Hydra `serve.public.cors.enabled: false`). If both added it, the browser would see duplicate `Access-Control-Allow-Origin` and block the token request.

## 1. Register the Test App OAuth Client

The app sends `redirect_uri = (VITE_APP_URL || window.origin)/callback`. Hydra must have that **exact** URL in the client's `redirect_uris` (no trailing slash).

From the project root (stack up; Hydra admin exposed via docker-compose.local):

```bash
HYDRA_ADMIN_URL=http://localhost:4445 ./scripts/setup-hydra-test-app-client.sh
```

This registers redirect URIs: `http://app.ory.localhost/callback`, `http://localhost:5175/callback`.

**Verificar el cliente (redirect URIs):**

```bash
HYDRA_ADMIN_URL=http://localhost:4445 ./scripts/verify-hydra-oauth-client.sh
```

Confirma que la URL donde abres la app coincida con una redirect URI (ej. abres `http://app.ory.localhost` → debe existir `http://app.ory.localhost/callback`).

## 2. Probar el flujo OAuth2 en el navegador

1. Abre la **Test App** por la misma URL que usaste al registrar: **http://app.ory.localhost** o **http://localhost:5175**.
2. Click **"Login with Nova ID"** (home or nav). You are redirected to Hydra's login (Kratos).
3. Inicia sesión con un usuario existente (o créalo en la auth UI).
4. En la pantalla de consent de Hydra, aprueba los scopes.
5. Vuelves a la test app en `/callback?code=...&state=...`, luego a `/`. Deberías ver tu usuario y los endpoints.
6. Si en `/callback` ves error (ej. "invalid redirect_uri" o "request_forbidden"): ejecuta `./scripts/verify-hydra-oauth-client.sh` y comprueba que la redirect URI de la app esté en la lista. La app usa `(VITE_APP_URL || origin)/callback`; si abres por `http://app.ory.localhost` debe ser `http://app.ory.localhost/callback` (sin barra final).
7. **Probar API con token:** en la test app, **Try** en **GET /api/nova-id-session** (o **GET /api/protected**). La petición va con `Authorization: Bearer <access_token>`; Oathkeeper hace introspección e inyecta `X-User-ID`, etc.

## 3. How the API Handles OAuth2

The API was **not** changed for OAuth2. It already supports:

1. **Header-based auth**: `X-User-ID`, `X-User-Email`, `X-User-Role` set by Oathkeeper after it validates either:
   - a **Kratos session cookie** (`cookie_session`), or  
   - a **Bearer token** via **Hydra token introspection** (`oauth2_introspection`).

2. **JWT-based auth (optional)**: If the request has a Bearer token signed by Oathkeeper's id_token mutator (e.g. another frontend flow), the API can validate it. The test app's "Login with Nova ID" flow does **not** use that path; it uses header-based auth after Oathkeeper introspection.

So for "Login with Nova ID":

- Test app gets tokens from Hydra (OAuth2 code flow).
- Test app calls `/api/*` with `Authorization: Bearer <access_token>`.
- Oathkeeper's **protected-api** rule:
  - Tries `cookie_session` (no cookie → skip).
  - Tries `oauth2_introspection` → calls Hydra's `/oauth2/introspect` → on success uses Subject and Extra to fill the mutator's template.
  - Header mutator sends `X-User-ID`, `X-User-Email`, `X-User-Role` to the API.
- The API only sees those headers and treats the request as authenticated; it does not need to validate the Bearer token.

## 4. Quick Curl Sanity Checks

Public endpoint (no auth):

```bash
curl -s http://localhost:4455/api/health | jq .
```

Protected without auth (expect 401):

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:4455/api/protected
# 401
```

Protected with a real Bearer token (after logging in via the test app, you can copy `access_token` from sessionStorage key `nova_id_oauth_tokens` and run):

```bash
TOKEN="<paste_access_token_here>"
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:4455/api/nova-id-session | jq .
```

If Oathkeeper introspection and the mutator are correct, this returns the "You are signed in with Nova ID" payload and user data.

---

## 5. Why "logged in" when CORS failed on `/callback`?

If the **token exchange** failed (e.g. CORS error on `POST api.ory.localhost/oauth2/token`), you could still see "logged in" on the test app home because the app uses **two** ways to decide if you're authenticated:

1. **OAuth tokens** in `sessionStorage` (`nova_id_oauth_tokens`). If present → OAuth session, Bearer token is used for API calls.
2. **Kratos session** via `GET /api/sessions/whoami` with cookies. If that returns 200 → session-based "logged in".

During "Login with Nova ID" you sign in with **Kratos** on `auth.ory.localhost`. Kratos sets a **session cookie**. When you land on `app.ory.localhost/callback` (or go back to home after the CORS error), that cookie is often sent to `app.ory.localhost/api/sessions/whoami` (same parent domain or shared cookie). So `checkSession()` succeeds even though the OAuth token exchange failed. The app then shows "logged in" **via Kratos session**, not via OAuth tokens. API calls from the home would use the session cookie, not a Bearer token.

When the OAuth flow **completes** correctly, tokens are stored and `isOAuthSession` is true; the UI and API calls use the Bearer token and the data from the `id_token`.

---

## 6. How to verify the OAuth2 flow worked

After a successful "Login with Nova ID" → consent → redirect to home:

| Check | What to do |
|-------|------------|
| **Session storage** | DevTools → Application → Session Storage → `http://app.ory.localhost` → key `nova_id_oauth_tokens`. Should contain `access_token`, `id_token`, `refresh_token`, `expires_in`. |
| **Home shows OAuth user** | "User Information" (email, name, role) comes from the **id_token**, not from Kratos whoami. You should see your real email/name. |
| **API with Bearer token** | Click **Try** on **GET /api/nova-id-session** or **GET /api/protected**. The request sends `Authorization: Bearer <access_token>`. Response should include your user (e.g. `user.email`, `user.id`). |
| **Network tab** | On `/callback`, there must be a **POST** to `http://api.ory.localhost/oauth2/token` with **200** and a JSON body with `access_token`, `id_token`, etc. |
| **Logout and repeat** | Logout, then "Login with Nova ID" again. Full flow should work and you should land on home with user info and working "Try" on protected endpoints. |

If all of the above pass, the OAuth2 flow is working end-to-end.

---

## 7. Why no cookies when calling the API with OAuth?

When you use "Login with Nova ID", you end up with **tokens** in `sessionStorage` and, as a side effect, a **Kratos session cookie** (you logged in on auth.ory.localhost during the flow). The test app is written so that **API calls use only the Bearer token**, not that cookie:

- For requests that have an `access_token`, the app uses `credentials: 'omit'`. That way it sends **only** `Authorization: Bearer <token>` and **no** cookies.
- Oathkeeper then uses **oauth2_introspection** (Bearer) and does not use **cookie_session**. That matches the OAuth2 model: the client authenticates with the token, not with a session cookie.

If the app sent cookies as well (`credentials: 'include'`), Oathkeeper could authenticate via **cookie_session** first and the request would be treated as session-based, not token-based. To keep OAuth and “token-only” behaviour clear, the test app sends no cookies when it has an OAuth token.

---

## 8. Consent and session (email / role) for token-only requests

For **User Information**, **Logs**, and **admin-demo** to work when the app uses **only** the Bearer token (no cookie), Oathkeeper must get `X-User-Email` and `X-User-Role` from Hydra's introspection. That only works if the consent **session** sent to Hydra contains `email` and `role`.

- The **consent UI** (frontend-auth) does **not** call Hydra's accept-consent directly. It calls **`POST /api/hydra-accept-consent`** with `{ consent_challenge, grant_scope }` and `credentials: 'include'`.
- The request hits the **protected-api** rule with the **Kratos cookie** (user is on auth after login). Oathkeeper runs **cookie_session**, injects `X-User-*`, and forwards to the API.
- The API reads email/role from those headers and calls Hydra's accept-consent with **`session: { email, role }`**. Hydra stores that and returns it on token introspection.
- When the test app later calls `/api/me`, `/api/logs`, or `/api/admin-demo` with **only** the Bearer token, Oathkeeper uses **oauth2_introspection**; the mutator reads `Extra.session.email` / `Extra.session.role` and sets `X-User-Email` / `X-User-Role`. The API and UI then have the correct user and role.

So: **consent must be submitted from the same host where the user has the Kratos cookie** (typically `auth.ory.localhost`), so `/api/hydra-accept-consent` is called with that cookie and the API can send session to Hydra.
