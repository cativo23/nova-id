// Hydra OAuth2/OIDC flow for "Login with Nova ID" (test app)
// OAuth must start at the issuer (api.ory.localhost) so Hydra's CSRF cookie domain matches the
// redirect-after-login URL; otherwise Hydra returns "No CSRF value available in the session cookie".

function getHydraPublicUrl() {
  if (import.meta.env.VITE_HYDRA_PUBLIC_URL) return import.meta.env.VITE_HYDRA_PUBLIC_URL
  if (typeof window !== 'undefined' && /\.ory\.localhost$/i.test(window.location.hostname)) {
    return 'http://api.ory.localhost'
  }
  if (typeof window !== 'undefined') return window.location.origin + '/api/hydra-public'
  return 'http://localhost:4444'
}

const OAUTH_STORAGE_PREFIX = 'nova_id_oauth_'
/** Refresh token kept in memory only (not in sessionStorage) per OAuth 2.0 Security BCP. */
let inMemoryRefreshToken = null

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

async function generateCodeChallenge(verifier) {
  const encoder = new TextEncoder()
  const data = encoder.encode(verifier)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

export async function initiateOAuthFlow(clientId, redirectUri, scopes = ['openid', 'profile', 'email', 'offline_access']) {
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

export async function handleOAuthCallback(code, state) {
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
    const errorData = await tokenResponse.json().catch(() => ({}))
    throw new Error(errorData.error_description || `Token exchange failed: ${tokenResponse.statusText}`)
  }

  const tokens = await tokenResponse.json()

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

export function decodeIdToken(idToken) {
  const parts = idToken.split('.')
  if (parts.length !== 3) throw new Error('Invalid ID token format')
  return JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
}

/**
 * Validate id_token claims (exp, iat) per OIDC. Optional clock skew applied.
 * @param {object} claims - Decoded id_token payload
 * @param {number} [clockSkewSec=60] - Allowed skew in seconds
 */
export function validateIdTokenClaims(claims, clockSkewSec = ID_TOKEN_CLOCK_SKEW_SEC) {
  if (!claims || typeof claims !== 'object') throw new Error('Invalid id_token claims')
  const now = Math.floor(Date.now() / 1000)
  if (claims.exp != null) {
    if (now > claims.exp + clockSkewSec) throw new Error('id_token expired')
  }
  if (claims.iat != null) {
    if (now < claims.iat - clockSkewSec) throw new Error('id_token not yet valid (iat in future)')
  }
}

export function getStoredTokens() {
  try {
    const raw = sessionStorage.getItem(OAUTH_STORAGE_PREFIX + 'tokens')
    if (!raw) return null
    const stored = JSON.parse(raw)
    if (inMemoryRefreshToken != null) stored.refresh_token = inMemoryRefreshToken
    return stored
  } catch {
    return null
  }
}

/**
 * Persist tokens. refresh_token is stored in memory only (not in sessionStorage) per BCP.
 */
export function setStoredTokens(tokens) {
  inMemoryRefreshToken = tokens.refresh_token ?? inMemoryRefreshToken
  const toStore = {
    access_token: tokens.access_token,
    id_token: tokens.id_token,
    expires_in: tokens.expires_in,
    token_type: tokens.token_type
  }
  sessionStorage.setItem(OAUTH_STORAGE_PREFIX + 'tokens', JSON.stringify(toStore))
}

export function clearStoredTokens() {
  inMemoryRefreshToken = null
  sessionStorage.removeItem(OAUTH_STORAGE_PREFIX + 'tokens')
}

/**
 * Refresh access token using in-memory refresh_token. Public client (no secret).
 * @param {string} clientId - OAuth client_id
 * @returns {Promise<object>} New token set
 */
export async function refreshAccessToken(clientId) {
  if (!inMemoryRefreshToken) throw new Error('No refresh token available (restart login)')
  const res = await fetch(`${getHydraPublicUrl()}/oauth2/token`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: inMemoryRefreshToken,
      client_id: clientId
    })
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error_description || `Refresh failed: ${res.statusText}`)
  }
  const tokens = await res.json()
  setStoredTokens(tokens)
  return tokens
}

export function getAccessToken() {
  const tokens = getStoredTokens()
  return tokens?.access_token ?? null
}
