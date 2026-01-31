// Hydra API composable for OAuth2/OIDC client management
// ZERO TRUST: Route through Oathkeeper - frontend cannot directly reach Hydra
const oathkeeperUrl = import.meta.env.VITE_OATHKEEPER_URL || '/api'
const hydraAdminUrl = `${oathkeeperUrl}/hydra-admin`

// List all OAuth clients
export async function listClients() {
  try {
    const response = await fetch(`${hydraAdminUrl}/clients`, {
      method: 'GET',
      credentials: 'include',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    })
    
    if (!response.ok) {
      throw new Error(`Failed to list clients: ${response.statusText}`)
    }
    
    return await response.json()
  } catch (error) {
    console.error('Error listing clients:', error)
    throw error
  }
}

// Get a single OAuth client
export async function getClient(clientId) {
  try {
    const response = await fetch(`${hydraAdminUrl}/clients/${clientId}`, {
      method: 'GET',
      credentials: 'include',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    })
    
    if (!response.ok) {
      throw new Error(`Failed to get client: ${response.statusText}`)
    }
    
    return await response.json()
  } catch (error) {
    console.error('Error getting client:', error)
    throw error
  }
}

// Create an OAuth client
export async function createClient(clientData) {
  try {
    const response = await fetch(`${hydraAdminUrl}/clients`, {
      method: 'POST',
      credentials: 'include',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(clientData)
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `Failed to create client: ${response.statusText}`)
    }
    
    return await response.json()
  } catch (error) {
    console.error('Error creating client:', error)
    throw error
  }
}

// Update an OAuth client
export async function updateClient(clientId, clientData) {
  try {
    const response = await fetch(`${hydraAdminUrl}/clients/${clientId}`, {
      method: 'PUT',
      credentials: 'include',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(clientData)
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `Failed to update client: ${response.statusText}`)
    }
    
    return await response.json()
  } catch (error) {
    console.error('Error updating client:', error)
    throw error
  }
}

// Delete an OAuth client
export async function deleteClient(clientId) {
  try {
    const response = await fetch(`${hydraAdminUrl}/clients/${clientId}`, {
      method: 'DELETE',
      credentials: 'include',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    })
    
    if (!response.ok) {
      throw new Error(`Failed to delete client: ${response.statusText}`)
    }
    
    return true
  } catch (error) {
    console.error('Error deleting client:', error)
    throw error
  }
}

// List OAuth2 access tokens (for testing)
export async function listAccessTokens() {
  try {
    const response = await fetch(`${hydraAdminUrl}/oauth2/tokens`, {
      method: 'GET',
      credentials: 'include',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    })
    
    if (!response.ok) {
      throw new Error(`Failed to list tokens: ${response.statusText}`)
    }
    
    return await response.json()
  } catch (error) {
    console.error('Error listing tokens:', error)
    throw error
  }
}
