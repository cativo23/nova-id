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
    console.log('checkSession - Calling toSession() via Oathkeeper at:', oathkeeperUrl)
    const { data } = await ory.toSession()
    console.log('checkSession - Session found:', data ? 'Yes' : 'No', data?.identity?.id ? `User: ${data.identity.id}` : '')
    return data
  } catch (error) {
    // 401 is expected when there's no session - don't log as error
    if (error.response?.status === 401) {
      console.log('checkSession - No session (401) - this is expected when user is not logged in')
      return null
    }
    // For other errors, log and throw
    console.error('checkSession - Error:', error.response?.status, error.message)
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
    console.log('createLoginFlow - Creating login flow with returnTo:', returnUrl)
    
    // Use fetch directly to ensure Accept header is set correctly
    // This avoids potential issues with @ory/client configuration
    const url = `${oathkeeperUrl}/self-service/login/browser?return_to=${encodeURIComponent(returnUrl)}`
    console.log('createLoginFlow - Making request to:', url)
    
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include', // Include cookies for CORS
      mode: 'cors', // Explicitly set CORS mode
      headers: {
        'Accept': 'application/json'
        // Don't send Content-Type for GET requests - it can cause CORS issues
      }
    })
    
    console.log('createLoginFlow - Response status:', response.status)
    console.log('createLoginFlow - Response headers:', {
      'access-control-allow-origin': response.headers.get('access-control-allow-origin'),
      'access-control-allow-credentials': response.headers.get('access-control-allow-credentials'),
      'content-type': response.headers.get('content-type')
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }))
      const error = new Error(errorData.error?.message || errorData.message || `HTTP ${response.status}`)
      error.response = { status: response.status, data: errorData }
      throw error
    }
    
    const data = await response.json()
    console.log('createLoginFlow - Login flow created successfully:', data?.id)
    return data
  } catch (error) {
    console.error('createLoginFlow - Error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message,
      // Check if it's a CORS error
      isCorsError: error.message?.includes('CORS') || error.message?.includes('Failed to fetch')
    })
    
    // If it's a CORS error, provide more helpful message
    if (error.message?.includes('CORS') || error.message?.includes('Failed to fetch')) {
      console.error('createLoginFlow - CORS Error detected. Check:')
      console.error('  1. Oathkeeper CORS config includes http://localhost:5174')
      console.error('  2. Browser console for actual CORS error message')
      console.error('  3. Network tab to see response headers')
    }
    
    // If it's a 400 with session_already_available, that's expected if user has session
    if (error.response?.status === 400 && 
        (error.response?.data?.error?.id === 'session_already_available' || 
         error.response?.data?.error_id === 'session_already_available')) {
      console.log('createLoginFlow - Session already available (expected if user has session)')
    }
    
    // Re-throw to let caller handle it
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

export async function logout() {
  try {
    const { data } = await ory.createBrowserLogoutFlow()
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
    
    // If rank changed, sync rank membership in Keto (RBAC)
    if (traits.rank && traits.rank !== currentIdentity.traits?.rank) {
      try {
        await syncRankPermissions(identityId, traits.rank)
      } catch (syncError) {
        console.warn('Failed to sync rank permissions, but user was updated:', syncError)
        // Don't throw - user update succeeded, permission sync can be retried
      }
    }
    
    return updatedIdentity
  } catch (error) {
    console.error('Error updating user:', error)
    throw error
  }
}

// RBAC: Sync user's rank membership in Keto based on their rank in Kratos
// This ensures permissions are automatically updated when rank changes
export async function syncRankPermissions(userId, newRank) {
  try {
    const { assignUserToRank, removeUserFromRank, getUserRank } = await import('./useKeto')
    
    // Get current rank membership from Keto
    const currentKetoRank = await getUserRank(userId)
    
    // If user already has the correct rank membership, no action needed
    if (currentKetoRank === newRank) {
      console.log(`User ${userId} already has rank membership: ${newRank}`)
      return { success: true, message: 'Rank membership already synced' }
    }
    
    // Remove old rank membership if exists
    if (currentKetoRank) {
      console.log(`Removing user ${userId} from old rank: ${currentKetoRank}`)
      await removeUserFromRank(userId, currentKetoRank)
    }
    
    // Assign user to new rank (if rank is not Private/Corporal, they may not have permissions)
    // But we still assign them to the rank for consistency
    if (newRank) {
      console.log(`Assigning user ${userId} to rank: ${newRank}`)
      await assignUserToRank(userId, newRank)
    }
    
    return { 
      success: true, 
      message: `Rank membership synced: ${currentKetoRank || 'none'} -> ${newRank || 'none'}` 
    }
  } catch (error) {
    console.error('Error syncing rank permissions:', error)
    throw error
  }
}

// Create a new user identity
export async function createUser(traits, password = null) {
  try {
    // Get the default schema ID (usually 'default' or from the identity schema)
    // We'll use 'default' as it's the standard Kratos schema ID
    const schemaId = 'default'
    
    // Default rank to Private if not specified
    const rank = traits.rank || 'Private'
    
    const payload = {
      schema_id: schemaId,
      traits: {
        email: traits.email,
        full_name: traits.full_name,
        rank: rank
      }
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
    
    // Sync rank membership in Keto (RBAC)
    if (newUser.id && rank) {
      try {
        await syncRankPermissions(newUser.id, rank)
      } catch (syncError) {
        console.warn('Failed to sync rank permissions for new user, but user was created:', syncError)
        // Don't throw - user creation succeeded, permission sync can be retried
      }
    }
    
    return newUser
  } catch (error) {
    console.error('Error creating user:', error)
    throw error
  }
}

// Create a recovery code/link for a user (admin-triggered)
// Create a recovery link for a user (admin-triggered) - sends email
// Per Ory's documentation: /admin/recovery/link creates a recovery flow and sends email
export async function createRecoveryLink(identityId, expiresIn = '1h') {
  try {
    // Get user info for display
    const user = await getUserById(identityId)
    const userEmail = user?.traits?.email
    
    if (!userEmail) {
      throw new Error('User email not found')
    }
    
    console.log('Creating recovery link for:', userEmail)
    
    // Use admin recovery link endpoint - this creates a recovery flow and sends email
    // Unlike /admin/recovery/code, this actually sends an email to the user
    const recoveryLinkResponse = await kratosAdminRequest('/admin/recovery/link', {
      method: 'POST',
      body: JSON.stringify({
        identity_id: identityId,
        expires_in: expiresIn
      })
    })
    
    const recoveryLink = recoveryLinkResponse.recovery_link
    
    if (!recoveryLink) {
      throw new Error('Failed to create recovery link')
    }
    
    console.log('Recovery link created and email sent successfully')
    
    // Return the recovery link that can be used directly
    const recoveryUrl = recoveryLink.replace(/^https?:\/\/[^\/]+/, window.location.origin) // Replace Kratos URL with frontend URL
    
    return {
      success: true,
      message: `Recovery email sent to ${userEmail}`,
      recovery_link: recoveryLink,
      recovery_url: recoveryUrl
    }
  } catch (error) {
    console.error('Error creating recovery link:', error)
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
