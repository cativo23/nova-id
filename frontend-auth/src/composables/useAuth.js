import { Configuration, FrontendApi } from '@ory/client'

// ZERO TRUST: All requests must go through Oathkeeper
// Frontends cannot directly access Kratos - must use Oathkeeper gateway
const oathkeeperUrl = import.meta.env.VITE_OATHKEEPER_URL || 'http://localhost:4455'

// Use Oathkeeper as the base URL for Kratos Public API
// Oathkeeper routes /self-service/*, /sessions/*, etc. to Kratos
const ory = new FrontendApi(
  new Configuration({
    basePath: oathkeeperUrl, // Route through Oathkeeper, not direct Kratos
    baseOptions: {
      withCredentials: true
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
    const { data } = await ory.toSession()
    return data
  } catch (error) {
    if (error.response?.status === 401) {
      return null
    }
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
    const { data } = await ory.createBrowserLoginFlow({
      returnTo: returnUrl
    })
    return data
  } catch (error) {
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

export async function logout(returnTo = null) {
  try {
    const params = returnTo ? { returnTo } : {}
    const { data } = await ory.createBrowserLogoutFlow(params)
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

// Verification flow functions
export async function getVerificationFlow(flowId) {
  try {
    const { data } = await ory.getVerificationFlow({ id: flowId })
    return data
  } catch (error) {
    throw error
  }
}

export async function createBrowserVerificationFlow(returnTo = null) {
  try {
    const returnUrl = returnTo || (window.location.origin + '/verification')
    const { data } = await ory.createBrowserVerificationFlow({
      returnTo: returnUrl
    })
    return data
  } catch (error) {
    throw error
  }
}

export async function updateVerificationFlow(flowId, payload) {
  try {
    const { data } = await ory.updateVerificationFlow({
      flow: flowId,
      updateVerificationFlowBody: payload
    })
    return data
  } catch (error) {
    throw error
  }
}

// Error flow: fetch user-facing error details by id (for /error?id=...)
export async function getFlowError(id) {
  try {
    const { data } = await ory.getFlowError({ id })
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

// List users from Kratos Admin API (via Oathkeeper)
export async function listUsers() {
  try {
    // Kratos Admin API: use per_page without page parameter for best results
    // If page is needed, start with page_size and page_token for pagination
    const params = new URLSearchParams({ per_page: '250' })
    const data = await kratosAdminRequest(`/admin/identities?${params}`)
    // Kratos returns an array directly
    return Array.isArray(data) ? data : (data?.data || [])
  } catch (error) {
    console.error('Error listing users:', error)
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

// Update user identity
export async function updateUser(identityId, traits) {
  try {
    // First get the current identity to preserve other fields
    const currentIdentity = await getUserById(identityId)
    
    const updatedIdentity = await kratosAdminRequest(`/admin/identities/${identityId}`, {
      method: 'PUT',
      body: JSON.stringify({
        schema_id: currentIdentity.schema_id,
        traits: {
          ...currentIdentity.traits,
          ...traits
        },
        state: currentIdentity.state
      })
    })
    
    // Role sync moved to the BFF admin API (A1.3 — /me/permissions endpoint).
    // No Keto writes from the frontend.
    
    return updatedIdentity
  } catch (error) {
    console.error('Error updating user:', error)
    throw error
  }
}

// RBAC: Sync user's rank membership in Keto based on their rank in Kratos
// This ensures permissions are automatically updated when rank changes
export async function syncRankPermissions(userId, newRank) {
  // Permission writes moved to the BFF admin API (A1). Direct browser Keto writes were removed in A0.3.
  throw new Error('Permission writes moved to the BFF admin API (A1)')
}

// Create a new user identity
export async function createUser(traits, password = null) {
  try {
    // Get the default schema ID (usually 'default' or from the identity schema)
    // We'll use 'default' as it's the standard Kratos schema ID
    const schemaId = 'default'
    
    // role lives in metadata_public (Admin-API-writable), not user-editable traits.
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

    // Role sync moved to the BFF admin API (A1.3 — /me/permissions endpoint).
    // No Keto writes from the frontend.

    return newUser
  } catch (error) {
    console.error('Error creating user:', error)
    throw error
  }
}

// Create a recovery code/link for a user (admin-triggered)
// Per Ory's recommendation: Admin uses /admin/recovery/code to generate a code and link
// The recovery_link from Kratos can be used directly, or the code can be used in the self-service flow
export async function createRecoveryLink(identityId, expiresIn = '1h') {
  try {
    // Get user info for display
    const user = await getUserById(identityId)
    const userEmail = user?.traits?.email
    
    if (!userEmail) {
      throw new Error('User email not found')
    }
    
    console.log('Creating recovery code for:', userEmail)
    
    // Use admin recovery code endpoint (Ory's recommended approach)
    // Returns both recovery_code and recovery_link
    const recoveryCodeResponse = await kratosAdminRequest('/admin/recovery/code', {
      method: 'POST',
      body: JSON.stringify({
        identity_id: identityId,
        expires_in: expiresIn
      })
    })
    
    const recoveryCode = recoveryCodeResponse.recovery_code
    const recoveryLink = recoveryCodeResponse.recovery_link
    
    if (!recoveryCode) {
      throw new Error('Failed to generate recovery code')
    }
    
    console.log('Recovery code generated successfully')
    
    // Use Kratos recovery_link if available (direct link that bypasses email step)
    // Otherwise, construct URL with code parameter for self-service flow
    const recoveryUrl = recoveryLink 
      ? recoveryLink.replace(/^https?:\/\/[^\/]+/, window.location.origin) // Replace Kratos URL with frontend URL
      : `${window.location.origin}/recovery?code=${encodeURIComponent(recoveryCode)}`
    
    return {
      success: true,
      message: `Recovery code generated for ${userEmail}`,
      recovery_code: recoveryCode,
      recovery_link: recoveryLink,
      recovery_url: recoveryUrl
    }
  } catch (error) {
    console.error('Error creating recovery code:', error)
    throw error
  }
}

// Delete user identity
export async function deleteUser(identityId) {
  try {
    await kratosAdminRequest(`/admin/identities/${identityId}`, {
      method: 'DELETE'
    })
    return true
  } catch (error) {
    console.error('Error deleting user:', error)
    throw error
  }
}
