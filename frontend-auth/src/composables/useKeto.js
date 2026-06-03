// Keto API composable for permission management
// Routes through Oathkeeper for Zero Trust architecture (see docs/QUICK_FIXES.md)
const oathkeeperUrl = import.meta.env.VITE_OATHKEEPER_URL || '/api'
const ketoReadUrl = `${oathkeeperUrl}/keto/read`

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

// Alias kept for backward-compatibility with callers that used "rank" terminology.
export { getUserRole as getUserRank }
