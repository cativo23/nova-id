import { Configuration, FrontendApi } from '@ory/client'
import { logger } from '../utils/logger'

// ZERO TRUST: All requests must go through Oathkeeper
// Frontends cannot directly access Kratos - must use Oathkeeper gateway
const oathkeeperUrl = import.meta.env.VITE_OATHKEEPER_URL || 'http://localhost:4455'

// Use Oathkeeper as the base URL for Kratos Public API
// Oathkeeper routes /self-service/*, /sessions/*, etc. to Kratos
const ory = new FrontendApi(
  new Configuration({
    basePath: oathkeeperUrl, // Route through Oathkeeper, not direct Kratos
    baseOptions: {
      withCredentials: true,
      // Set Accept header to get JSON responses instead of 303 redirects
      headers: {
        'Accept': 'application/json'
      }
    }
  })
)

// BFF base URL: all admin/me calls go to /api/* through the Oathkeeper gateway.
// The gateway validates the Kratos session cookie and mints an id_token JWT for the BFF.
const apiBase = `${oathkeeperUrl}/api`

async function bffRequest(path, options = {}) {
  const res = await fetch(`${apiBase}${path}`, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  })
  if (!res.ok) {
    const body = await res.text()
    const error = new Error(`BFF ${options.method || 'GET'} ${path} → ${res.status}: ${body}`)
    error.response = { status: res.status, data: body }
    throw error
  }
  return res.status === 204 ? null : res.json()
}

export async function checkSession() {
  try {
    logger.log('checkSession - Calling toSession() via Oathkeeper at:', oathkeeperUrl)
    const { data } = await ory.toSession()
    logger.log('checkSession - Session found:', data ? 'Yes' : 'No', data?.identity?.id ? `User: ${data.identity.id}` : '')
    return data
  } catch (error) {
    // 401 is expected when there's no session - don't log as error
    if (error.response?.status === 401) {
      logger.log('checkSession - No session (401) - this is expected when user is not logged in')
      return null
    }
    logger.error('checkSession - Error:', error.response?.status, error.message)
    throw error
  }
}

export async function getLoginFlow(flowId) {
  try {
    const { data } = await ory.getLoginFlow({ id: flowId })
    return data
  } catch (error) {
    throw error
  }
}

export async function createLoginFlow(returnTo = null) {
  try {
    const returnUrl = returnTo || (window.location.origin + '/dashboard')
    logger.log('createLoginFlow - Creating login flow with returnTo:', returnUrl)

    const url = `${oathkeeperUrl}/self-service/login/browser?return_to=${encodeURIComponent(returnUrl)}`
    logger.log('createLoginFlow - Making request to:', url)

    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      mode: 'cors',
      headers: { 'Accept': 'application/json' }
    })

    logger.log('createLoginFlow - Response status:', response.status)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }))
      const error = new Error(errorData.error?.message || errorData.message || `HTTP ${response.status}`)
      error.response = { status: response.status, data: errorData }
      throw error
    }

    const data = await response.json()
    logger.log('createLoginFlow - Login flow created successfully:', data?.id)
    return data
  } catch (error) {
    logger.error('createLoginFlow - Error:', error.response?.status, error.message)

    if (error.message?.includes('CORS') || error.message?.includes('Failed to fetch')) {
      logger.warn('createLoginFlow - CORS? Check Oathkeeper CORS config and network tab.')
    }

    if (error.response?.status === 400 &&
        (error.response?.data?.error?.id === 'session_already_available' ||
         error.response?.data?.error_id === 'session_already_available')) {
      logger.log('createLoginFlow - Session already available')
    }

    throw error
  }
}

export async function updateLoginFlow(flowId, payload) {
  try {
    const { data } = await ory.updateLoginFlow({
      flow: flowId,
      updateLoginFlowBody: payload
    })
    return data
  } catch (error) {
    throw error
  }
}

export async function getRegistrationFlow(flowId) {
  try {
    const { data } = await ory.getRegistrationFlow({ id: flowId })
    return data
  } catch (error) {
    throw error
  }
}

export async function createRegistrationFlow() {
  try {
    const { data } = await ory.createBrowserRegistrationFlow()
    return data
  } catch (error) {
    throw error
  }
}

export async function updateRegistrationFlow(flowId, payload) {
  try {
    const { data } = await ory.updateRegistrationFlow({
      flow: flowId,
      updateRegistrationFlowBody: payload
    })
    return data
  } catch (error) {
    throw error
  }
}

// Auth app base URL for logout/verification (Kratos may return relative or wrong-host URLs)
function getAuthBaseUrl() {
  return import.meta.env.VITE_KRATOS_BROWSER_URL || (import.meta.env.VITE_AUTH_URL || 'http://auth.ory.localhost') + '/auth'
}

// Ensure logout redirect goes to auth app; relative or admin-host URLs cause Vue Router "No match" on admin.
function normalizeLogoutUrl(logoutUrl) {
  if (!logoutUrl) return logoutUrl
  const authBase = getAuthBaseUrl().replace(/\/$/, '')
  if (logoutUrl.startsWith('/')) {
    return `${authBase}${logoutUrl}`
  }
  try {
    const u = new URL(logoutUrl)
    if (u.origin === window.location.origin) {
      return `${authBase}${u.pathname}${u.search}`
    }
  } catch (_) {}
  return logoutUrl
}

export async function logout() {
  try {
    const { data } = await ory.createBrowserLogoutFlow()
    if (data?.logout_url) {
      data.logout_url = normalizeLogoutUrl(data.logout_url)
    }
    return data
  } catch (error) {
    throw error
  }
}

// Recovery flow functions
export async function getRecoveryFlow(flowId) {
  try {
    const { data } = await ory.getRecoveryFlow({ id: flowId })
    return data
  } catch (error) {
    throw error
  }
}

export async function createRecoveryFlow() {
  try {
    const { data } = await ory.createBrowserRecoveryFlow({
      returnTo: window.location.origin + '/login'
    })
    return data
  } catch (error) {
    throw error
  }
}

export async function updateRecoveryFlow(flowId, payload) {
  try {
    const { data } = await ory.updateRecoveryFlow({
      flow: flowId,
      updateRecoveryFlowBody: payload
    })
    return data
  } catch (error) {
    throw error
  }
}

// Settings flow functions
export async function getSettingsFlow(flowId) {
  try {
    const { data } = await ory.getSettingsFlow({
      id: flowId
    })
    return data
  } catch (error) {
    throw error
  }
}

export async function updateSettingsFlow(flowId, payload) {
  try {
    const { data } = await ory.updateSettingsFlow({
      flow: flowId,
      updateSettingsFlowBody: payload
    })
    return data
  } catch (error) {
    throw error
  }
}

// ── BFF Admin User Management ────────────────────────────────────────────────
// All functions below call the BFF /api/admin/users endpoints via the
// Oathkeeper gateway. The gateway validates the Kratos session cookie and
// forwards an id_token JWT to the BFF (no direct Kratos-Admin access).

// List users from the BFF. Returns { users: UserResponseDto[], pagination: {} }.
// The BFF returns a flat array; pagination is handled server-side (no Link header).
export async function listUsers(options = {}) {
  try {
    const { pageSize = 100, searchQuery = '' } = options

    const params = new URLSearchParams()
    params.append('pageSize', pageSize.toString())

    const data = await bffRequest(`/admin/users?${params}`)
    const users = Array.isArray(data) ? data : []

    // Client-side search filter (BFF does not yet expose a search param).
    let filtered = users
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      filtered = users.filter(u => {
        return (
          (u.email || '').toLowerCase().includes(q) ||
          (u.fullName || '').toLowerCase().includes(q) ||
          (u.role || '').toLowerCase().includes(q)
        )
      })
    }

    return {
      identities: filtered,
      pagination: {
        hasNext: false,
        hasPrev: false,
        nextToken: null,
        prevToken: null,
        firstToken: null
      }
    }
  } catch (error) {
    logger.error('Error listing users:', error)
    if (error.response?.status === 401 || error.response?.status === 403) {
      throw new Error('Unauthorized: You do not have permission to list users')
    }
    throw error
  }
}

// Get a single user by ID
export async function getUserById(id) {
  try {
    return await bffRequest(`/admin/users/${id}`)
  } catch (error) {
    logger.error('Error getting user:', error)
    throw error
  }
}

// Create a new user. Payload: { email, fullName, password, role }
export async function createUser(payload) {
  try {
    return await bffRequest('/admin/users', { method: 'POST', body: JSON.stringify(payload) })
  } catch (error) {
    logger.error('Error creating user:', error)
    throw error
  }
}

// Update a user. Payload: { email?, fullName?, role? }
export async function updateUser(id, payload) {
  try {
    return await bffRequest(`/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(payload) })
  } catch (error) {
    logger.error('Error updating user:', error)
    throw error
  }
}

// Set identity state (active | inactive). Inactive identities cannot sign in.
export async function setIdentityState(id, state) {
  if (state !== 'active' && state !== 'inactive') {
    throw new Error('Identity state must be "active" or "inactive"')
  }
  try {
    return await bffRequest(`/admin/users/${id}/state`, { method: 'PUT', body: JSON.stringify({ state }) })
  } catch (error) {
    logger.error('Error setting identity state:', error)
    throw error
  }
}

// Create a recovery link for a user (admin-triggered).
// BFF delegates to Kratos and returns { recovery_link }.
export async function createRecoveryLink(id) {
  try {
    const result = await bffRequest(`/admin/users/${id}/recovery-link`, { method: 'POST' })
    const recoveryLink = result?.recovery_link
    if (!recoveryLink) {
      throw new Error('BFF did not return a recovery_link')
    }
    // Normalise to the shape the view expects.
    const authBase = import.meta.env.VITE_KRATOS_BROWSER_URL || 'http://auth.ory.localhost/auth'
    const recoveryUrl = recoveryLink.startsWith('http')
      ? recoveryLink
      : `${authBase.replace(/\/$/, '')}${recoveryLink.startsWith('/') ? '' : '/'}${recoveryLink}`
    return {
      success: true,
      recovery_link: recoveryLink,
      recovery_url: recoveryUrl,
      recovery_code: null // BFF recovery-link endpoint does not return a code
    }
  } catch (error) {
    logger.error('Error creating recovery link:', error)
    throw error
  }
}

// Delete a user identity
export async function deleteUser(id) {
  try {
    await bffRequest(`/admin/users/${id}`, { method: 'DELETE' })
    return true
  } catch (error) {
    logger.error('Error deleting user:', error)
    throw error
  }
}

// Resend verification email: uses Kratos self-service verification flow (Kratos PUBLIC, not admin).
// Creates a verification flow and submits the user's email so Kratos sends the verification email.
export async function sendVerificationEmail(identityId) {
  const user = await getUserById(identityId)
  const email = user?.email
  if (!email) {
    throw new Error('User has no email')
  }
  const returnTo = import.meta.env.VITE_ADMIN_URL || 'http://admin.ory.localhost'
  const { data: flow } = await ory.createBrowserVerificationFlow({ returnTo })
  const csrfNode = flow?.ui?.nodes?.find(
    n => n.attributes?.name === 'csrf_token' && n.attributes?.type === 'hidden'
  )
  const csrfToken = csrfNode?.attributes?.value
  if (!csrfToken) {
    throw new Error('Could not get verification flow token')
  }
  await ory.updateVerificationFlow({
    flow: flow.id,
    updateVerificationFlowBody: { method: 'code', email, csrf_token: csrfToken }
  })
  return { userEmail: email }
}

// Alias for UI
export { sendVerificationEmail as markEmailAsVerified }
