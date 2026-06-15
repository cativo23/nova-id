import { Configuration, FrontendApi } from '@ory/client'
import type {
  Session,
  LoginFlow,
  RegistrationFlow,
  RecoveryFlow,
  SettingsFlow,
  LogoutFlow,
  SuccessfulNativeLogin,
  SuccessfulNativeRegistration,
  UpdateLoginFlowBody,
  UpdateRegistrationFlowBody,
  UpdateRecoveryFlowBody,
  UpdateSettingsFlowBody,
} from '@ory/client'
import { logger } from '../utils/logger'

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
      // Set Accept header to get JSON responses instead of 303 redirects
      headers: {
        'Accept': 'application/json'
      }
    }
  })
)

/** Narrow helper for the `error.response.status` shape thrown by axios/@ory. */
function statusOf(error: unknown): number | undefined {
  return (error as { response?: { status?: number } })?.response?.status
}

export async function checkSession(): Promise<Session | null> {
  try {
    logger.log('checkSession - Calling toSession() via Oathkeeper at:', oathkeeperUrl)
    const { data } = await ory.toSession()
    logger.log('checkSession - Session found:', data ? 'Yes' : 'No', data?.identity?.id ? `User: ${data.identity.id}` : '')
    return data
  } catch (error) {
    // 401 is expected when there's no session - don't log as error
    if (statusOf(error) === 401) {
      logger.log('checkSession - No session (401) - this is expected when user is not logged in')
      return null
    }
    logger.error('checkSession - Error:', statusOf(error), (error as Error).message)
    throw error
  }
}

export async function getLoginFlow(flowId: string): Promise<LoginFlow> {
  const { data } = await ory.getLoginFlow({ id: flowId })
  return data
}

export async function createLoginFlow(returnTo: string | null = null): Promise<unknown> {
  try {
    const returnUrl = returnTo || (window.location.origin + '/dashboard')
    logger.log('createLoginFlow - Creating login flow with returnTo:', returnUrl)

    const url = `${oathkeeperUrl}/self-service/login/browser?return_to=${encodeURIComponent(returnUrl)}`
    logger.log('createLoginFlow - Making request to:', url)

    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      mode: 'cors',
      headers: { 'Accept': 'application/json' }
    })

    logger.log('createLoginFlow - Response status:', response.status)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }))
      const error = new Error(errorData.error?.message || errorData.message || `HTTP ${response.status}`) as Error & {
        response?: { status: number; data: unknown }
      }
      error.response = { status: response.status, data: errorData }
      throw error
    }

    const data = await response.json()
    logger.log('createLoginFlow - Login flow created successfully:', data?.id)
    return data
  } catch (error) {
    logger.error('createLoginFlow - Error:', statusOf(error), (error as Error).message)

    const msg = (error as Error).message
    if (msg?.includes('CORS') || msg?.includes('Failed to fetch')) {
      logger.warn('createLoginFlow - CORS? Check Oathkeeper CORS config and network tab.')
    }

    const data = (error as { response?: { data?: { error?: { id?: string }; error_id?: string } } }).response?.data
    if (statusOf(error) === 400 &&
        (data?.error?.id === 'session_already_available' ||
         data?.error_id === 'session_already_available')) {
      logger.log('createLoginFlow - Session already available')
    }

    throw error
  }
}

export async function updateLoginFlow(flowId: string, payload: UpdateLoginFlowBody): Promise<SuccessfulNativeLogin> {
  const { data } = await ory.updateLoginFlow({
    flow: flowId,
    updateLoginFlowBody: payload
  })
  return data
}

export async function getRegistrationFlow(flowId: string): Promise<RegistrationFlow> {
  const { data } = await ory.getRegistrationFlow({ id: flowId })
  return data
}

export async function createRegistrationFlow(): Promise<RegistrationFlow> {
  const { data } = await ory.createBrowserRegistrationFlow()
  return data
}

export async function updateRegistrationFlow(flowId: string, payload: UpdateRegistrationFlowBody): Promise<SuccessfulNativeRegistration> {
  const { data } = await ory.updateRegistrationFlow({
    flow: flowId,
    updateRegistrationFlowBody: payload
  })
  return data
}

// Auth app base URL for logout/verification (Kratos may return relative or wrong-host URLs)
function getAuthBaseUrl(): string {
  return import.meta.env.VITE_KRATOS_BROWSER_URL || (import.meta.env.VITE_AUTH_URL || 'http://auth.ory.localhost') + '/auth'
}

// Ensure logout redirect goes to auth app; relative or admin-host URLs cause Vue Router "No match" on admin.
function normalizeLogoutUrl(logoutUrl: string | undefined): string | undefined {
  if (!logoutUrl) return logoutUrl
  const authBase = getAuthBaseUrl().replace(/\/$/, '')
  if (logoutUrl.startsWith('/')) {
    return `${authBase}${logoutUrl}`
  }
  try {
    const u = new URL(logoutUrl)
    if (u.origin === window.location.origin) {
      return `${authBase}${u.pathname}${u.search}`
    }
  } catch (_) { /* not an absolute URL — leave as-is */ }
  return logoutUrl
}

export async function logout(): Promise<LogoutFlow> {
  const { data } = await ory.createBrowserLogoutFlow()
  if (data?.logout_url) {
    data.logout_url = normalizeLogoutUrl(data.logout_url) ?? data.logout_url
  }
  return data
}

// Recovery flow functions
export async function getRecoveryFlow(flowId: string): Promise<RecoveryFlow> {
  const { data } = await ory.getRecoveryFlow({ id: flowId })
  return data
}

export async function createRecoveryFlow(): Promise<RecoveryFlow> {
  const { data } = await ory.createBrowserRecoveryFlow({
    returnTo: window.location.origin + '/login'
  })
  return data
}

export async function updateRecoveryFlow(flowId: string, payload: UpdateRecoveryFlowBody): Promise<RecoveryFlow> {
  const { data } = await ory.updateRecoveryFlow({
    flow: flowId,
    updateRecoveryFlowBody: payload
  })
  return data
}

// Settings flow functions
export async function getSettingsFlow(flowId: string): Promise<SettingsFlow> {
  const { data } = await ory.getSettingsFlow({ id: flowId })
  return data
}

export async function updateSettingsFlow(flowId: string, payload: UpdateSettingsFlowBody): Promise<SettingsFlow> {
  const { data } = await ory.updateSettingsFlow({
    flow: flowId,
    updateSettingsFlowBody: payload
  })
  return data
}

// Resend verification email: uses Kratos self-service verification flow (Kratos PUBLIC, not admin).
// Creates a verification flow and submits the user's email so Kratos sends the verification email.
// The caller passes the email (the views already hold the user record), so no BFF
// getUserById round-trip is needed — admin user reads go through the generated client.
export async function sendVerificationEmail(email: string): Promise<{ userEmail: string }> {
  if (!email) {
    throw new Error('User has no email')
  }
  const returnTo = import.meta.env.VITE_ADMIN_URL || 'http://admin.ory.localhost'
  const { data: flow } = await ory.createBrowserVerificationFlow({ returnTo })
  const csrfNode = flow?.ui?.nodes?.find(
    (n) => {
      const attrs = n.attributes as { name?: string; type?: string }
      return attrs?.name === 'csrf_token' && attrs?.type === 'hidden'
    }
  )
  const csrfToken = (csrfNode?.attributes as { value?: string } | undefined)?.value
  if (!csrfToken) {
    throw new Error('Could not get verification flow token')
  }
  await ory.updateVerificationFlow({
    flow: flow.id,
    updateVerificationFlowBody: { method: 'code', email, csrf_token: csrfToken }
  })
  return { userEmail: email }
}

// Alias for UI
export { sendVerificationEmail as markEmailAsVerified }
