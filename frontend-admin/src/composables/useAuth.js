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

// Helper function to make requests to Kratos Admin API through Oathkeeper
async function kratosAdminRequest(endpoint, options = {}) {
  // Oathkeeper rule matches /admin/* paths and forwards them to Kratos Admin API
  // Kratos Admin API endpoints are at /admin/* (e.g., /admin/identities)
  // We call Oathkeeper at the same path, and it forwards to Kratos
  // This works because Oathkeeper forwards the matched path as-is
  const url = `${oathkeeperUrl}${endpoint}`
  
  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  })
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: response.statusText }))
    const error = new Error(errorData.error?.message || errorData.message || `HTTP ${response.status}`)
    error.response = { status: response.status, data: errorData }
    throw error
  }
  
  // Handle empty responses
  const contentType = response.headers.get('content-type')
  if (contentType && contentType.includes('application/json')) {
    return await response.json()
  }
  return null
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

// Parse Link header from Kratos response for pagination
function parseLinkHeader(linkHeader) {
  if (!linkHeader) return {}
  
  const links = {}
  const parts = linkHeader.split(',')
  
  for (const part of parts) {
    const section = part.split(';')
    if (section.length !== 2) continue
    
    const url = section[0].trim().replace(/<(.*)>/, '$1')
    const rel = section[1].trim().replace(/rel="(.*)"/, '$1')
    
    // Extract page_token from URL
    const urlObj = new URL(url, 'http://dummy.com')
    const pageToken = urlObj.searchParams.get('page_token')
    
    links[rel] = {
      url,
      pageToken
    }
  }
  
  return links
}

// List users from Kratos Admin API (via Oathkeeper) with pagination support
export async function listUsers(options = {}) {
  try {
    const { pageToken = null, pageSize = 100, searchQuery = '' } = options
    
    // Build query parameters
    const params = new URLSearchParams()
    params.append('page_size', pageSize.toString())
    if (pageToken) {
      params.append('page_token', pageToken)
    }
    
    // Make request and capture response with headers
    const url = `${oathkeeperUrl}/admin/identities?${params}`
    const response = await fetch(url, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }))
      const error = new Error(errorData.error?.message || errorData.message || `HTTP ${response.status}`)
      error.response = { status: response.status, data: errorData }
      throw error
    }
    
    const data = await response.json()
    const identities = Array.isArray(data) ? data : (data?.data || [])
    
    // Parse Link header for pagination
    const linkHeader = response.headers.get('link')
    const links = parseLinkHeader(linkHeader)
    
    // Filter by search query if provided (client-side filtering)
    let filteredIdentities = identities
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filteredIdentities = identities.filter(identity => {
        const email = identity.traits?.email?.toLowerCase() || ''
        const fullName = identity.traits?.full_name?.toLowerCase() || ''
        const role = identity.metadata_public?.role?.toLowerCase() || ''
        return email.includes(query) || fullName.includes(query) || role.includes(query)
      })
    }
    
    return {
      identities: filteredIdentities,
      pagination: {
        hasNext: !!links.next,
        hasPrev: !!links.prev,
        nextToken: links.next?.pageToken,
        prevToken: links.prev?.pageToken,
        firstToken: links.first?.pageToken
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
export async function getUserById(identityId) {
  try {
    return await kratosAdminRequest(`/admin/identities/${identityId}`)
  } catch (error) {
    console.error('Error getting user:', error)
    throw error
  }
}

// Set identity state (active | inactive). Inactive identities cannot sign in.
export async function setIdentityState(identityId, state) {
  if (state !== 'active' && state !== 'inactive') {
    throw new Error('Identity state must be "active" or "inactive"')
  }
  try {
    const currentIdentity = await getUserById(identityId)
    return await kratosAdminRequest(`/admin/identities/${identityId}`, {
      method: 'PUT',
      body: JSON.stringify({
        schema_id: currentIdentity.schema_id,
        traits: currentIdentity.traits,
        state
      })
    })
  } catch (error) {
    logger.error('Error setting identity state:', error)
    throw error
  }
}

// Update user identity
export async function updateUser(identityId, traits) {
  try {
    // First get the current identity to preserve other fields
    const currentIdentity = await getUserById(identityId)
    
    // role is admin-only: it lives in metadata_public (Admin-API-writable), not user traits.
    const { role: traitRole, rank: traitRank, ...traitFields } = traits
    const incomingRole = traitRole ?? traitRank
    const body = {
      schema_id: currentIdentity.schema_id,
      traits: {
        ...currentIdentity.traits,
        ...traitFields
      },
      state: currentIdentity.state
    }
    if (incomingRole != null) {
      body.metadata_public = { ...(currentIdentity.metadata_public || {}), role: incomingRole }
    }
    const updatedIdentity = await kratosAdminRequest(`/admin/identities/${identityId}`, {
      method: 'PUT',
      body: JSON.stringify(body)
    })

    return updatedIdentity
  } catch (error) {
    logger.error('Error updating user:', error)
    throw error
  }
}

// Create a new user identity
export async function createUser(traits, password = null) {
  try {
    // Get the default schema ID (usually 'default' or from the identity schema)
    // We'll use 'default' as it's the standard Kratos schema ID
    const schemaId = 'default'
    
    // role is admin-only: set via metadata_public (Admin API), not user-editable traits
    const role = traits.role ?? 'platform_user'

    const payload = {
      schema_id: schemaId,
      traits: {
        email: traits.email,
        full_name: traits.full_name
      },
      metadata_public: { role }
    }
    
    // If password is provided, add credentials
    if (password) {
      payload.credentials = {
        password: {
          config: {
            password: password
          }
        }
      }
    }
    
    const newUser = await kratosAdminRequest('/admin/identities', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
    
    return newUser
  } catch (error) {
    logger.error('Error creating user:', error)
    throw error
  }
}

// Create a recovery code/link for a user (admin-triggered)
// Kratos config uses recovery "use: code" so we must call /admin/recovery/code (not /admin/recovery/link)
// The code endpoint returns both recovery_link and recovery_code; we use recovery_link for the UI
export async function createRecoveryLink(identityId, expiresIn = '1h') {
  try {
    // Get user info for display
    const user = await getUserById(identityId)
    const userEmail = user?.traits?.email
    
    if (!userEmail) {
      throw new Error('User email not found')
    }
    
    logger.log('Creating recovery link for:', userEmail)
    
    // Use admin recovery CODE endpoint (required when Kratos recovery flow is "use: code")
    const recoveryLinkResponse = await kratosAdminRequest('/admin/recovery/code', {
      method: 'POST',
      body: JSON.stringify({
        identity_id: identityId,
        expires_in: expiresIn
      })
    })
    
    const recoveryLink = recoveryLinkResponse.recovery_link
    const recoveryCode = recoveryLinkResponse.recovery_code
    
    if (!recoveryLink) {
      throw new Error('Failed to create recovery link')
    }
    
    logger.log('Recovery link created successfully', { recovery_code: recoveryCode })
    
    // Build full recovery URL (Kratos may return a path; prepend auth base URL if needed)
    const authBase = import.meta.env.VITE_KRATOS_BROWSER_URL || 'http://auth.ory.localhost/auth'
    const recoveryUrl = recoveryLink.startsWith('http') ? recoveryLink : `${authBase.replace(/\/$/, '')}${recoveryLink.startsWith('/') ? '' : '/'}${recoveryLink}`
    
    return {
      success: true,
      message: `Recovery link created for ${userEmail}`,
      recovery_link: recoveryLink,
      recovery_url: recoveryUrl,
      recovery_code: recoveryCode ?? null
    }
  } catch (error) {
    logger.error('Error creating recovery link:', error)
    throw error
  }
}

// Resend verification email: use Kratos self-service verification flow (no new tab).
// Creates a verification flow and submits the user's email so Kratos sends the verification email.
export async function sendVerificationEmail(identityId) {
  const identity = await getUserById(identityId)
  const email = identity?.traits?.email
  if (!email) {
    throw new Error('User has no email in traits')
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

// Delete user identity
export async function deleteUser(identityId) {
  try {
    await kratosAdminRequest(`/admin/identities/${identityId}`, {
      method: 'DELETE'
    })
    return true
  } catch (error) {
    logger.error('Error deleting user:', error)
    throw error
  }
}
