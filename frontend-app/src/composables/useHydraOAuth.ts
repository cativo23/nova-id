// Hydra OAuth2/OIDC flow for "Login with Nova ID" (test app)
// OAuth must start at the issuer (api.ory.localhost) so Hydra's CSRF cookie domain matches the
// redirect-after-login URL; otherwise Hydra returns "No CSRF value available in the session cookie".
//
// Token-persistence and client-side claim decoding removed (A1.5, ADR-0002).
// role/appRole are now read from /api-test/me under the Kratos cookie session the gateway honors.
// Only the transient PKCE/state/nonce handshake entries remain in sessionStorage.

import type { IdTokenClaims, TokenResponse } from '../types'

function getHydraPublicUrl() {
  if (import.meta.env.VITE_HYDRA_PUBLIC_URL) return import.meta.env.VITE_HYDRA_PUBLIC_URL
  if (typeof window !== 'undefined' && /\.ory\.localhost$/i.test(window.location.hostname)) {
    return 'http://api.ory.localhost'
  }
  if (typeof window !== 'undefined') return window.location.origin + '/api/hydra-public'
  return 'http://localhost:4444'
}

/**
 * Expected id_token issuer (the `iss` claim) — Hydra's configured issuer, which is
 * NOT the same as the proxy base URL used to *reach* Hydra. In production the app
 * calls Hydra via `${origin}/api/hydra-public`, but Hydra issues tokens with
 * `iss: https://id.cativo.dev/`. Configure the real issuer via VITE_OAUTH_ISSUER.
 * Locally (.ory.localhost) the proxy base IS the issuer (http://api.ory.localhost).
 */
function getExpectedIssuer() {
  if (import.meta.env.VITE_OAUTH_ISSUER) return import.meta.env.VITE_OAUTH_ISSUER
  if (typeof window !== 'undefined' && /\.ory\.localhost$/i.test(window.location.hostname)) {
    return 'http://api.ory.localhost'
  }
  // Safety net only — production MUST set VITE_OAUTH_ISSUER (the proxy base is not the issuer).
  return getHydraPublicUrl()
}

const OAUTH_STORAGE_PREFIX = 'nova_id_oauth_'

/** Default clock skew in seconds for id_token exp/iat validation. */
const ID_TOKEN_CLOCK_SKEW_SEC = 60

function generateRandomString(length = 43) {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'
  // Use CSPRNG. Rejection sampling: discard bytes that would introduce modulo bias.
  // charset.length = 66; mask = 0x7f (127) keeps all 66 values within a 7-bit window
  // (66 < 128), guaranteeing a rejection rate below 50% per byte.
  const mask = (1 << Math.ceil(Math.log2(charset.length + 1))) - 1
  let result = ''
  while (result.length < length) {
    const bytes = crypto.getRandomValues(new Uint8Array(length - result.length))
    for (const byte of bytes) {
      const idx = byte & mask
      if (idx < charset.length) result += charset[idx]
    }
  }
  return result
}

async function generateCodeChallenge(verifier: string) {
  const encoder = new TextEncoder()
  const data = encoder.encode(verifier)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

export async function initiateOAuthFlow(clientId: string, redirectUri: string, scopes: string[] = ['openid', 'profile', 'email', 'offline_access']) {
  const codeVerifier = generateRandomString()
  const codeChallenge = await generateCodeChallenge(codeVerifier)
  const state = generateRandomString()
  const nonce = generateRandomString()

  sessionStorage.setItem(OAUTH_STORAGE_PREFIX + 'code_verifier', codeVerifier)
  sessionStorage.setItem(OAUTH_STORAGE_PREFIX + 'state', state)
  sessionStorage.setItem(OAUTH_STORAGE_PREFIX + 'nonce', nonce)
  sessionStorage.setItem(OAUTH_STORAGE_PREFIX + 'client_id', clientId)
  sessionStorage.setItem(OAUTH_STORAGE_PREFIX + 'redirect_uri', redirectUri)

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: scopes.join(' '),
    state,
    nonce,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256'
  })

  window.location.href = `${getHydraPublicUrl()}/oauth2/auth?${params.toString()}`
}

export async function handleOAuthCallback(code: string, state: string): Promise<TokenResponse> {
  const storedState = sessionStorage.getItem(OAUTH_STORAGE_PREFIX + 'state')
  if (state !== storedState) {
    throw new Error('Invalid state parameter - possible CSRF attack')
  }

  const clientId = sessionStorage.getItem(OAUTH_STORAGE_PREFIX + 'client_id')
  const redirectUri = sessionStorage.getItem(OAUTH_STORAGE_PREFIX + 'redirect_uri')
  const codeVerifier = sessionStorage.getItem(OAUTH_STORAGE_PREFIX + 'code_verifier')

  if (!clientId || !redirectUri || !codeVerifier) {
    throw new Error('Missing OAuth parameters - please restart the flow')
  }

  const tokenResponse = await fetch(`${getHydraPublicUrl()}/oauth2/token`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      code_verifier: codeVerifier
    })
  })

  if (!tokenResponse.ok) {
    const errorData = await tokenResponse.json().catch(() => ({})) as { error_description?: string }
    throw new Error(errorData.error_description || `Token exchange failed: ${tokenResponse.statusText}`)
  }

  const tokens = await tokenResponse.json() as TokenResponse

  const storedNonce = sessionStorage.getItem(OAUTH_STORAGE_PREFIX + 'nonce')
  if (tokens.id_token) {
    const claims = decodeIdToken(tokens.id_token)
    validateIdTokenClaims(claims, getExpectedIssuer(), clientId)
    if (storedNonce && claims.nonce && claims.nonce !== storedNonce) {
      sessionStorage.removeItem(OAUTH_STORAGE_PREFIX + 'code_verifier')
      sessionStorage.removeItem(OAUTH_STORAGE_PREFIX + 'state')
      sessionStorage.removeItem(OAUTH_STORAGE_PREFIX + 'nonce')
      sessionStorage.removeItem(OAUTH_STORAGE_PREFIX + 'client_id')
      sessionStorage.removeItem(OAUTH_STORAGE_PREFIX + 'redirect_uri')
      throw new Error('Invalid id_token nonce - possible replay')
    }
  }

  sessionStorage.removeItem(OAUTH_STORAGE_PREFIX + 'code_verifier')
  sessionStorage.removeItem(OAUTH_STORAGE_PREFIX + 'state')
  sessionStorage.removeItem(OAUTH_STORAGE_PREFIX + 'nonce')
  sessionStorage.removeItem(OAUTH_STORAGE_PREFIX + 'client_id')
  sessionStorage.removeItem(OAUTH_STORAGE_PREFIX + 'redirect_uri')

  return tokens
}

export function decodeIdToken(idToken: string): IdTokenClaims {
  const parts = idToken.split('.')
  if (parts.length !== 3) throw new Error('Invalid ID token format')
  return JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
}

/**
 * Normalise an issuer URL for comparison by stripping a trailing slash.
 * Hydra emits the issuer exactly as configured in urls.self.issuer (no trailing slash),
 * but VITE_HYDRA_PUBLIC_URL may vary in local environments. Strip both sides to be safe.
 */
function normaliseIssuer(url: string) {
  return url.replace(/\/$/, '')
}

/**
 * Validate id_token claims (exp, iat, iss, aud) per OIDC. Optional clock skew applied.
 * @param claims - Decoded id_token payload
 * @param expectedIssuer - Exact issuer from Hydra config (e.g. http://api.ory.localhost)
 * @param clientId - OAuth client_id that must appear in aud
 * @param clockSkewSec - Allowed skew in seconds (default 60)
 */
export function validateIdTokenClaims(
  claims: IdTokenClaims,
  expectedIssuer: string,
  clientId: string,
  clockSkewSec: number = ID_TOKEN_CLOCK_SKEW_SEC
) {
  if (!claims || typeof claims !== 'object') throw new Error('Invalid id_token claims')

  const now = Math.floor(Date.now() / 1000)
  if (claims.exp != null) {
    if (now > claims.exp + clockSkewSec) throw new Error('id_token expired')
  }
  if (claims.iat != null) {
    if (now < claims.iat - clockSkewSec) throw new Error('id_token not yet valid (iat in future)')
  }

  // iss validation — normalise both sides to tolerate trailing-slash mismatch
  if (!claims.iss || normaliseIssuer(claims.iss) !== normaliseIssuer(expectedIssuer)) {
    throw new Error(`id_token issuer mismatch: expected "${expectedIssuer}", got "${claims.iss}"`)
  }

  // aud validation — OIDC §2: aud MUST be the client_id (string or array)
  const audList = Array.isArray(claims.aud) ? claims.aud : [claims.aud]
  if (!claims.aud || !audList.includes(clientId)) {
    throw new Error(`id_token audience does not include client "${clientId}"`)
  }
}

