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
