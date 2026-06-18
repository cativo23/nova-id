import { Configuration, FrontendApi } from '@ory/client'
import type {
  Session,
  LoginFlow,
  RegistrationFlow,
  RecoveryFlow,
  SettingsFlow,
  VerificationFlow,
  LogoutFlow,
  FlowError,
  SuccessfulNativeLogin,
  SuccessfulNativeRegistration,
  UpdateLoginFlowBody,
  UpdateRegistrationFlowBody,
  UpdateRecoveryFlowBody,
  UpdateSettingsFlowBody,
  UpdateVerificationFlowBody,
} from '@ory/client'

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
    },
  })
)

/** Narrow helper for the `error.response.status` shape thrown by axios/@ory. */
function statusOf(error: unknown): number | undefined {
  return (error as { response?: { status?: number } })?.response?.status
}

export async function checkSession(): Promise<Session | null> {
  try {
    const { data } = await ory.toSession()
    return data
  } catch (error) {
    if (statusOf(error) === 401) {
      return null
    }
    throw error
  }
}

export async function getLoginFlow(flowId: string): Promise<LoginFlow> {
  const { data } = await ory.getLoginFlow({ id: flowId })
  return data
}

export async function createLoginFlow(returnTo: string | null = null): Promise<LoginFlow> {
  const returnUrl = returnTo || (window.location.origin + '/dashboard')
  const { data } = await ory.createBrowserLoginFlow({
    returnTo: returnUrl,
  })
  return data
}

export async function updateLoginFlow(flowId: string, payload: UpdateLoginFlowBody): Promise<SuccessfulNativeLogin> {
  const { data } = await ory.updateLoginFlow({
    flow: flowId,
    updateLoginFlowBody: payload,
  })
  return data
}

export async function getRegistrationFlow(flowId: string): Promise<RegistrationFlow> {
  const { data } = await ory.getRegistrationFlow({ id: flowId })
  return data
}

// Forward `returnTo` so registration completion returns the user to the
// originating app, and `afterVerificationReturnTo` so the verification flow
// spawned by the registration after-hook (the email-link path) ALSO lands back
// on that app instead of falling through to the global default. Both are
// documented Kratos registration-init parameters; without them an app user who
// verifies via the email link is dumped on `default_browser_return_url`.
export async function createRegistrationFlow(returnTo: string | null = null): Promise<RegistrationFlow> {
  const { data } = await ory.createBrowserRegistrationFlow(
    returnTo
      ? { returnTo, afterVerificationReturnTo: returnTo }
      : {},
  )
  return data
}

export async function updateRegistrationFlow(flowId: string, payload: UpdateRegistrationFlowBody): Promise<SuccessfulNativeRegistration> {
  const { data } = await ory.updateRegistrationFlow({
    flow: flowId,
    updateRegistrationFlowBody: payload,
  })
  return data
}

export async function logout(returnTo: string | null = null): Promise<LogoutFlow> {
  const params = returnTo ? { returnTo } : {}
  const { data } = await ory.createBrowserLogoutFlow(params)
  return data
}

// Recovery flow functions
export async function getRecoveryFlow(flowId: string): Promise<RecoveryFlow> {
  const { data } = await ory.getRecoveryFlow({ id: flowId })
  return data
}

export async function createRecoveryFlow(returnTo: string | null = null): Promise<RecoveryFlow> {
  const returnUrl = returnTo || (window.location.origin + '/login')
  const { data } = await ory.createBrowserRecoveryFlow({
    returnTo: returnUrl,
  })
  return data
}

export async function updateRecoveryFlow(flowId: string, payload: UpdateRecoveryFlowBody): Promise<RecoveryFlow> {
  const { data } = await ory.updateRecoveryFlow({
    flow: flowId,
    updateRecoveryFlowBody: payload,
  })
  return data
}

// Verification flow functions
export async function getVerificationFlow(flowId: string): Promise<VerificationFlow> {
  const { data } = await ory.getVerificationFlow({ id: flowId })
  return data
}

export async function createBrowserVerificationFlow(returnTo: string | null = null): Promise<VerificationFlow> {
  const returnUrl = returnTo || (window.location.origin + '/verification')
  const { data } = await ory.createBrowserVerificationFlow({
    returnTo: returnUrl,
  })
  return data
}

export async function updateVerificationFlow(flowId: string, payload: UpdateVerificationFlowBody): Promise<VerificationFlow> {
  const { data } = await ory.updateVerificationFlow({
    flow: flowId,
    updateVerificationFlowBody: payload,
  })
  return data
}

// Error flow: fetch user-facing error details by id (for /error?id=...)
export async function getFlowError(id: string): Promise<FlowError> {
  const { data } = await ory.getFlowError({ id })
  return data
}

// Settings flow functions
export async function getSettingsFlow(flowId: string): Promise<SettingsFlow> {
  const { data } = await ory.getSettingsFlow({
    id: flowId,
  })
  return data
}

export async function updateSettingsFlow(flowId: string, payload: UpdateSettingsFlowBody): Promise<SettingsFlow> {
  const { data } = await ory.updateSettingsFlow({
    flow: flowId,
    updateSettingsFlowBody: payload,
  })
  return data
}
