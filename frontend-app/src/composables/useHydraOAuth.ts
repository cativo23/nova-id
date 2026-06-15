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

const OAUTH_STORAGE_PREFIX = 'nova_id_oauth_'

/** Default clock skew in seconds for id_token exp/iat validation. */
const ID_TOKEN_CLOCK_SKEW_SEC = 60

function generateRandomString(length = 43) {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += charset.charAt(Math.floor(Math.random() * charset.length))
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
    validateIdTokenClaims(claims)
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
 * Validate id_token claims (exp, iat) per OIDC. Optional clock skew applied.
 * @param claims - Decoded id_token payload
 * @param clockSkewSec - Allowed skew in seconds (default 60)
 */
export function validateIdTokenClaims(claims: IdTokenClaims, clockSkewSec: number = ID_TOKEN_CLOCK_SKEW_SEC) {
  if (!claims || typeof claims !== 'object') throw new Error('Invalid id_token claims')
  const now = Math.floor(Date.now() / 1000)
  if (claims.exp != null) {
    if (now > claims.exp + clockSkewSec) throw new Error('id_token expired')
  }
  if (claims.iat != null) {
    if (now < claims.iat - clockSkewSec) throw new Error('id_token not yet valid (iat in future)')
  }
}

