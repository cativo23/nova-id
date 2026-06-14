import { Configuration, FrontendApi } from '@ory/client'

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
    const currentUrl = getOathkeeperUrl() // Get at runtime
    console.log('checkSession - VITE_OATHKEEPER_URL:', import.meta.env.VITE_OATHKEEPER_URL)
    console.log('checkSession - getOathkeeperUrl():', currentUrl)
    console.log('checkSession - Calling toSession() via Oathkeeper at:', currentUrl)
    const { data } = await currentOry.toSession()
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

export async function updateLoginFlow(flowId, payload) {
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

export async function getRegistrationFlow(flowId) {
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

export async function updateRegistrationFlow(flowId, payload) {
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

export async function logout(returnTo = null) {
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
export async function getRecoveryFlow(flowId) {
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

export async function updateRecoveryFlow(flowId, payload) {
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
export async function getSettingsFlow(flowId) {
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

export async function updateSettingsFlow(flowId, payload) {
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
