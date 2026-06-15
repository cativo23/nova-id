import { Configuration, FrontendApi } from '@ory/client'
import type {
  UpdateLoginFlowBody,
  UpdateRegistrationFlowBody,
  UpdateRecoveryFlowBody,
  UpdateSettingsFlowBody
} from '@ory/client'

/** Narrow an unknown caught error to one carrying an HTTP response status. */
function responseStatus(error: unknown): number | undefined {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { status?: number } }).response
    return response?.status
  }
  return undefined
}

// ZERO TRUST: All requests must go through Oathkeeper
// Frontends cannot directly access Kratos - must use Oathkeeper gateway

// Use relative path /api to go through Nginx proxy (same-origin, no CORS)
// Get URL at runtime to ensure we use the latest value from .env.local
function getOathkeeperUrl() {
  return import.meta.env.VITE_OATHKEEPER_URL || '/api'
}

// Create a function to get a fresh FrontendApi instance with current URL
function getOryClient() {
  const oathkeeperUrl = getOathkeeperUrl()
  return new FrontendApi(
    new Configuration({
      basePath: oathkeeperUrl, // Route through Oathkeeper, not direct Kratos
      baseOptions: {
        credentials: 'include', // Send cookies with requests (required for CSRF)
        withCredentials: true,
        headers: {
          'Accept': 'application/json'
        }
      }
    })
  )
}

export async function checkSession() {
  try {
    const currentOry = getOryClient() // Get at runtime
    const { data } = await currentOry.toSession()
    return data
  } catch (error) {
    if (responseStatus(error) === 401) {
      return null
    }
    throw error
  }
}

export async function getLoginFlow(flowId: string) {
  try {
    const currentOry = getOryClient() // Get at runtime
    const { data } = await currentOry.getLoginFlow({ id: flowId })
    return data
  } catch (error) {
    throw error
  }
}

export async function createLoginFlow() {
  try {
    const currentOry = getOryClient() // Get at runtime
    const { data } = await currentOry.createBrowserLoginFlow({
      returnTo: window.location.origin + '/dashboard'
    })
    return data
  } catch (error) {
    throw error
  }
}

export async function updateLoginFlow(flowId: string, payload: UpdateLoginFlowBody) {
  try {
    const currentOry = getOryClient() // Get at runtime
    const { data } = await currentOry.updateLoginFlow({
      flow: flowId,
      updateLoginFlowBody: payload
    })
    return data
  } catch (error) {
    throw error
  }
}

export async function getRegistrationFlow(flowId: string) {
  try {
    const currentOry = getOryClient() // Get at runtime
    const { data } = await currentOry.getRegistrationFlow({ id: flowId })
    return data
  } catch (error) {
    throw error
  }
}

export async function createRegistrationFlow() {
  try {
    const currentOry = getOryClient() // Get at runtime
    const { data } = await currentOry.createBrowserRegistrationFlow()
    return data
  } catch (error) {
    throw error
  }
}

export async function updateRegistrationFlow(flowId: string, payload: UpdateRegistrationFlowBody) {
  try {
    const currentOry = getOryClient() // Get at runtime
    const { data } = await currentOry.updateRegistrationFlow({
      flow: flowId,
      updateRegistrationFlowBody: payload
    })
    return data
  } catch (error) {
    throw error
  }
}

export async function logout(returnTo: string | null = null) {
  try {
    const currentOry = getOryClient() // Get at runtime
    const params = returnTo ? { returnTo } : {}
    const { data } = await currentOry.createBrowserLogoutFlow(params)
    return data
  } catch (error) {
    throw error
  }
}

// Recovery flow functions
export async function getRecoveryFlow(flowId: string) {
  try {
    const currentOry = getOryClient() // Get at runtime
    const { data } = await currentOry.getRecoveryFlow({ id: flowId })
    return data
  } catch (error) {
    throw error
  }
}

export async function createRecoveryFlow() {
  try {
    const currentOry = getOryClient() // Get at runtime
    const { data } = await currentOry.createBrowserRecoveryFlow({
      returnTo: window.location.origin + '/login'
    })
    return data
  } catch (error) {
    throw error
  }
}

export async function updateRecoveryFlow(flowId: string, payload: UpdateRecoveryFlowBody) {
  try {
    const currentOry = getOryClient() // Get at runtime
    const { data } = await currentOry.updateRecoveryFlow({
      flow: flowId,
      updateRecoveryFlowBody: payload
    })
    return data
  } catch (error) {
    throw error
  }
}

// Settings flow functions
export async function getSettingsFlow(flowId: string) {
  try {
    const currentOry = getOryClient() // Get at runtime
    const { data } = await currentOry.getSettingsFlow({
      id: flowId
    })
    return data
  } catch (error) {
    throw error
  }
}

export async function updateSettingsFlow(flowId: string, payload: UpdateSettingsFlowBody) {
  try {
    const currentOry = getOryClient() // Get at runtime
    const { data } = await currentOry.updateSettingsFlow({
      flow: flowId,
      updateSettingsFlowBody: payload
    })
    return data
  } catch (error) {
    throw error
  }
}
