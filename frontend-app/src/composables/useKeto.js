// Keto API composable for permission management
// Routes through Oathkeeper for Zero Trust architecture (see docs/QUICK_FIXES.md)

// Get Oathkeeper URL at runtime
function getOathkeeperUrl() {
  return import.meta.env.VITE_OATHKEEPER_URL || '/api'
}

function getKetoReadUrl() {
  return `${getOathkeeperUrl()}/keto/read`
}

// Check if a subject (user) has a permission
export async function checkPermission(namespace, object, relation, subject) {
  try {
    // Keto check endpoint uses subject_id parameter
    const url = `${getKetoReadUrl()}/relation-tuples/check?namespace=${encodeURIComponent(namespace)}&object=${encodeURIComponent(object)}&relation=${encodeURIComponent(relation)}&subject_id=${encodeURIComponent(subject)}`
    console.log('Checking permission:', { namespace, object, relation, subject, url })
    
    let response
    try {
      response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        mode: 'cors',
        cache: 'no-cache'
        // No Content-Type header for GET requests - not needed and avoids unnecessary preflight
      })
    } catch (fetchError) {
      // CORS or network error - this happens BEFORE the response
      console.error('Fetch error (CORS/Network - request blocked):', {
        message: fetchError.message,
        name: fetchError.name,
        url,
        note: 'This error occurs when the browser blocks the request before it reaches the server. Check: 1) Browser cache, 2) CORS preflight, 3) Network tab in DevTools'
      })
      // Re-throw with more context
      throw fetchError
    }
    
    // Keto returns 403 Forbidden with {"allowed":false} when permission is denied
    // This is a valid response, not an error
    const responseText = await response.text()
    let data
    try {
      data = JSON.parse(responseText)
    } catch (parseError) {
      // If we can't parse JSON and status is not OK, it's a real error
      if (!response.ok) {
        throw new Error(`Failed to check permission: ${response.statusText} - ${responseText || 'Unknown error'}`)
      }
      throw parseError
    }
    
    // If response has "allowed" field, it's a valid permission check response
    // Keto returns 403 with {"allowed":false} for denied permissions (this is normal)
    if (data.hasOwnProperty('allowed')) {
      console.log('Permission check result:', { namespace, object, relation, subject, allowed: data.allowed, status: response.status })
      return data.allowed === true
    }
    
    // If no "allowed" field and status is not OK, it's an error
    if (!response.ok) {
      console.error('Permission check failed:', { status: response.status, statusText: response.statusText, data })
      throw new Error(`Failed to check permission: ${response.statusText} - ${JSON.stringify(data)}`)
    }
    
    // Fallback: if response is OK but no "allowed" field, assume false
    console.warn('Permission check response missing "allowed" field:', data)
    return false
  } catch (error) {
    console.error('Error checking permission:', error)
    throw error
  }
}

// Get all relations for a subject (user)
export async function getSubjectRelations(subject, namespace = null) {
  try {
    // Keto uses subject_id parameter for querying relations
    let url = `${getKetoReadUrl()}/relation-tuples?subject_id=${encodeURIComponent(subject)}`
    if (namespace) {
      url += `&namespace=${encodeURIComponent(namespace)}`
    }
    
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include'
      // No Content-Type header for GET requests - not needed and avoids unnecessary preflight
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to get relations: ${response.statusText} - ${errorText}`)
    }
    
    const data = await response.json()
    return data.relation_tuples || []
  } catch (error) {
    console.error('Error getting relations:', error)
    throw error
  }
}

// Expand permissions to see what a subject can access
export async function expandPermission(namespace, object, relation, maxDepth = 3) {
  try {
    const url = `${getKetoReadUrl()}/relation-tuples/expand?namespace=${namespace}&object=${object}&relation=${relation}&max-depth=${maxDepth}`
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include'
      // No Content-Type header for GET requests - not needed and avoids unnecessary preflight
    })
    
    if (!response.ok) {
      throw new Error(`Failed to expand permission: ${response.statusText}`)
    }
    
    return await response.json()
  } catch (error) {
    console.error('Error expanding permission:', error)
    throw error
  }
}

// Get all relations in a namespace
export async function getNamespaceRelations(namespace) {
  try {
    const url = `${getKetoReadUrl()}/relation-tuples?namespace=${encodeURIComponent(namespace)}`
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include'
      // No Content-Type header for GET requests - not needed and avoids unnecessary preflight
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to get namespace relations: ${response.statusText} - ${errorText}`)
    }
    
    const data = await response.json()
    return data.relation_tuples || []
  } catch (error) {
    console.error('Error getting namespace relations:', error)
    throw error
  }
}

// RBAC: Get user's current role by checking OPL Platform:nova permissions.
// Returns 'platform_admin' if the user has the Platform:nova#administer permit,
// 'user' otherwise. (Legacy "ranks" namespace removed in A0.7; full BFF
// migration to /me/permissions deferred to A1.3.)
export async function getUserRole(userId) {
  try {
    const isPlatformAdmin = await checkPermission('Platform', 'nova', 'administer', `user:${userId}`)
    return isPlatformAdmin ? 'platform_admin' : 'user'
  } catch (error) {
    console.error('Error getting user role:', error)
    throw error
  }
}
