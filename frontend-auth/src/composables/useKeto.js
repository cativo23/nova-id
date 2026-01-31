// Keto API composable for permission management
// Routes through Oathkeeper for Zero Trust architecture (see docs/QUICK_FIXES.md)
const oathkeeperUrl = import.meta.env.VITE_OATHKEEPER_URL || '/api'
const ketoReadUrl = `${oathkeeperUrl}/keto/read`
const ketoWriteUrl = `${oathkeeperUrl}/keto/write`

// Check if a subject (user) has a permission
export async function checkPermission(namespace, object, relation, subject) {
  try {
    const url = `${ketoReadUrl}/relation-tuples/check?namespace=${encodeURIComponent(namespace)}&object=${encodeURIComponent(object)}&relation=${encodeURIComponent(relation)}&subject_id=${encodeURIComponent(subject)}`
    let response
    try {
      response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        mode: 'cors',
        cache: 'no-cache'
      })
    } catch (fetchError) {
      console.error('Fetch error (CORS/Network):', { message: fetchError.message, url })
      throw fetchError
    }
    const responseText = await response.text()
    let data
    try {
      data = JSON.parse(responseText)
    } catch (parseError) {
      if (!response.ok) {
        throw new Error(`Failed to check permission: ${response.statusText} - ${responseText || 'Unknown error'}`)
      }
      throw parseError
    }
    if (Object.prototype.hasOwnProperty.call(data, 'allowed')) {
      return data.allowed === true
    }
    if (!response.ok) {
      throw new Error(`Failed to check permission: ${response.statusText} - ${JSON.stringify(data)}`)
    }
    return false
  } catch (error) {
    console.error('Error checking permission:', error)
    throw error
  }
}

// Create a permission relation (grant permission)
export async function createRelation(namespace, object, relation, subject) {
  try {
    const url = `${ketoWriteUrl}/admin/relation-tuples`
    const response = await fetch(url, {
      method: 'PUT',
      credentials: 'include',
      mode: 'cors',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ namespace, object, relation, subject_id: subject })
    })
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to create relation: ${response.statusText} - ${errorText}`)
    }
    return { success: true }
  } catch (error) {
    console.error('Error creating relation:', error)
    throw error
  }
}

// Delete a permission relation (revoke permission)
export async function deleteRelation(namespace, object, relation, subject) {
  try {
    const url = `${ketoWriteUrl}/admin/relation-tuples?namespace=${encodeURIComponent(namespace)}&object=${encodeURIComponent(object)}&relation=${encodeURIComponent(relation)}&subject_id=${encodeURIComponent(subject)}`
    const response = await fetch(url, {
      method: 'DELETE',
      credentials: 'include',
      mode: 'cors'
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
    let url = `${ketoReadUrl}/relation-tuples?subject_id=${encodeURIComponent(subject)}`
    if (namespace) url += `&namespace=${encodeURIComponent(namespace)}`
    const response = await fetch(url, { method: 'GET', credentials: 'include', mode: 'cors' })
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

// RBAC: Assign a user to a role (Keto "ranks" namespace stores role membership)
export async function assignUserToRole(userId, role) {
  try {
    const url = `${ketoWriteUrl}/admin/relation-tuples`
    const response = await fetch(url, {
      method: 'PUT',
      credentials: 'include',
      mode: 'cors',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
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
    const response = await fetch(url, { method: 'DELETE', credentials: 'include', mode: 'cors' })
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
    if (roleRelation) return roleRelation.object
    return null
  } catch (error) {
    console.error('Error getting user role:', error)
    throw error
  }
}

// Aliases for consumers that use "rank" terminology (same as role in ranks namespace)
export { getUserRole as getUserRank, assignUserToRole as assignUserToRank, removeUserFromRole as removeUserFromRank }
