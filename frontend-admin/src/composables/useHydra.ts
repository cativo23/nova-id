// Hydra API composable for OAuth2/OIDC client management
// ZERO TRUST: Route through Oathkeeper + BFF - frontend cannot directly reach Hydra Admin
// NOTE: These calls are routed through the NestJS BFF at /v1/admin/clients.
// The BFF endpoints are gated by Keto Platform:nova#administer via PlatformAdministerGuard.
// Hand-rolled fetch is kept here intentionally — this module is not part of the
// generated @nova-id/api-client.
import { logger, errMessage } from '../utils/logger'
const oathkeeperUrl = import.meta.env.VITE_OATHKEEPER_URL || '/api'
const bffClientsUrl = `${oathkeeperUrl}/v1/admin/clients`

/** Minimal OAuth2 client shape used by the UI. */
export interface OAuthClient {
  client_id: string
  client_name?: string
  redirect_uris?: string[]
  [key: string]: unknown
}

// List all OAuth clients
export async function listClients(): Promise<OAuthClient[]> {
  try {
    const response = await fetch(`${bffClientsUrl}`, {
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
    logger.error('Error listing clients:', errMessage(error))
    throw error
  }
}

// Get a single OAuth client
export async function getClient(clientId: string): Promise<OAuthClient> {
  try {
    const response = await fetch(`${bffClientsUrl}/${clientId}`, {
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
    logger.error('Error getting client:', errMessage(error))
    throw error
  }
}

// Create an OAuth client
export async function createClient(clientData: Record<string, unknown>): Promise<OAuthClient> {
  try {
    const response = await fetch(`${bffClientsUrl}`, {
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
    logger.error('Error creating client:', errMessage(error))
    throw error
  }
}

// Update an OAuth client
export async function updateClient(clientId: string, clientData: Record<string, unknown>): Promise<OAuthClient> {
  try {
    const response = await fetch(`${bffClientsUrl}/${clientId}`, {
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
    logger.error('Error updating client:', errMessage(error))
    throw error
  }
}

// Delete an OAuth client
export async function deleteClient(clientId: string): Promise<boolean> {
  try {
    const response = await fetch(`${bffClientsUrl}/${clientId}`, {
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
    logger.error('Error deleting client:', errMessage(error))
    throw error
  }
}
