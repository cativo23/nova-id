// Keto API composable for permission management
// Routes through Oathkeeper for Zero Trust architecture (see docs/QUICK_FIXES.md)

// Get Oathkeeper URL at runtime
function getOathkeeperUrl() {
  return import.meta.env.VITE_OATHKEEPER_URL || '/api'
}

function getKetoReadUrl() {
  return `${getOathkeeperUrl()}/keto/read`
}

function getKetoWriteUrl() {
  return `${getOathkeeperUrl()}/keto/write`
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

// Create a permission relation (grant permission)
export async function createRelation(namespace, object, relation, subject) {
  try {
    const url = `${getKetoWriteUrl()}/admin/relation-tuples`
    const response = await fetch(url, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        namespace,
        object,
        relation,
        subject_id: subject
      })
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to create relation: ${response.statusText} - ${errorText}`)
    }
    
    // Keto write API returns empty body on success
    return { success: true }
  } catch (error) {
    console.error('Error creating relation:', error)
    throw error
  }
}

// Delete a permission relation (revoke permission)
export async function deleteRelation(namespace, object, relation, subject) {
  try {
    // Keto delete endpoint uses subject_id parameter
    const url = `${getKetoWriteUrl()}/admin/relation-tuples?namespace=${encodeURIComponent(namespace)}&object=${encodeURIComponent(object)}&relation=${encodeURIComponent(relation)}&subject_id=${encodeURIComponent(subject)}`
    const response = await fetch(url, {
      method: 'DELETE',
      credentials: 'include'
      // DELETE requests don't need Content-Type when there's no body
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to delete relation: ${response.statusText} - ${errorText}`)
    }
    
    return true
  } catch (error) {
    console.error('Error deleting relation:', error)
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

// RBAC: Assign a user to a role (Keto "ranks" namespace stores role membership)
export async function assignUserToRole(userId, role) {
  try {
    const url = `${getKetoWriteUrl()}/admin/relation-tuples`
    const response = await fetch(url, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        namespace: 'ranks',
        object: role,
        relation: 'member',
        subject_id: `user:${userId}`
      })
    })
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to assign user to role: ${response.statusText} - ${errorText}`)
    }
    return { success: true }
  } catch (error) {
    console.error('Error assigning user to role:', error)
    throw error
  }
}

// RBAC: Remove a user from a role
export async function removeUserFromRole(userId, role) {
  try {
    const url = `${ketoWriteUrl}/admin/relation-tuples?namespace=${encodeURIComponent('ranks')}&object=${encodeURIComponent(role)}&relation=${encodeURIComponent('member')}&subject_id=${encodeURIComponent(`user:${userId}`)}`
    const response = await fetch(url, { method: 'DELETE', credentials: 'include' })
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to remove user from role: ${response.statusText} - ${errorText}`)
    }
    return true
  } catch (error) {
    console.error('Error removing user from role:', error)
    throw error
  }
}

// RBAC: Get user's current role (from Keto "ranks" namespace)
export async function getUserRole(userId) {
  try {
    const relations = await getSubjectRelations(`user:${userId}`, 'ranks')
    const roleRelation = relations.find(r => r.namespace === 'ranks' && r.relation === 'member')
    return roleRelation ? roleRelation.object : null
  } catch (error) {
    console.error('Error getting user role:', error)
    throw error
  }
}
