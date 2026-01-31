<template>
  <div class="auth-page min-h-[calc(100vh-3.5rem)] relative overflow-hidden">
    <div class="absolute inset-0 bg-mesh-gradient pointer-events-none" aria-hidden="true" />
    <div class="relative flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center px-4 py-10 sm:py-12">
      <div class="w-full max-w-[28rem]">
        <div class="mb-6 text-center">
          <div class="hero-icon-float mb-5">
            <div class="hero-glow-pulse mx-auto flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-xl border border-cyber-accent/20 bg-cyber-dark/90">
              <NovaLogoIcon
                svg-class="h-7 w-7 sm:h-8 sm:w-8"
                gradient-id="login-hero-icon"
                filter-id="login-hero-glow"
                :glow="true"
              />
            </div>
          </div>
          <h1 class="hero-title text-xl font-semibold tracking-tight text-cyber-light sm:text-2xl">Sign in</h1>
          <p class="hero-subtitle mt-1 text-sm text-cyber-light/55">Sign in to your account to continue</p>
        </div>

        <div class="hero-form-wrap auth-card">
        <form @submit.prevent="handleSubmit" class="space-y-5">
          <div
            v-for="node in flow?.ui?.nodes"
            :key="node.attributes?.name || node.id"
            class="space-y-2"
          >
            <!-- Hidden fields (csrf_token, etc.) -->
            <template v-if="node.type === 'input' && getNodeType(node) === 'hidden'">
              <input
                type="hidden"
                :name="getNodeName(node)"
                :value="getNodeValue(node)"
              />
            </template>

            <!-- Text, Password and Email Inputs (identifier uses 'text' type) -->
            <template v-else-if="['text', 'password', 'email'].includes(getNodeType(node))">
              <label
                :for="getNodeName(node)"
                class="block text-sm font-medium text-cyber-light mb-1.5"
              >
                {{ getNodeLabel(node) }}
                <span v-if="isNodeRequired(node)" class="text-red-400 ml-1">*</span>
              </label>
              <div class="relative">
                <!-- Email/Identifier Icon -->
                <div v-if="getNodeName(node) === 'password_identifier' || getNodeType(node) === 'email' || getNodeName(node) === 'identifier'" class="absolute left-3 top-1/2 -translate-y-1/2 text-cyber-light/50">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <!-- Password Icon -->
                <div v-else-if="getNodeType(node) === 'password'" class="absolute left-3 top-1/2 -translate-y-1/2 text-cyber-light/50">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  :id="getNodeName(node)"
                  :name="getNodeName(node)"
                  :type="getNodeType(node) === 'password' ? (showPassword ? 'text' : 'password') : getNodeType(node)"
                  :value="getNodeType(node) === 'password' ? passwordValue : getNodeValue(node)"
                  :placeholder="getNodePlaceholder(node) || `Enter your ${getNodeLabel(node).toLowerCase()}`"
                  :required="isNodeRequired(node)"
                  @input="getNodeType(node) === 'password' ? updatePasswordValue($event) : handleInput(node, $event)"
                  :class="[
                    'input-base',
                    (getNodeName(node) === 'password_identifier' || getNodeType(node) === 'email' || getNodeName(node) === 'identifier' || getNodeType(node) === 'password') ? 'pl-11' : '',
                    getNodeType(node) === 'password' ? 'pr-11' : '',
                    hasNodeErrors(node) ? 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20' : ''
                  ]"
                />
                <!-- Eye Icon for Password Toggle -->
                <button
                  v-if="getNodeType(node) === 'password'"
                  type="button"
                  @click="showPassword = !showPassword"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-cyber-light/70 hover:text-cyber-accent transition-colors"
                  :title="showPassword ? 'Hide password' : 'Show password'"
                >
                  <svg v-if="showPassword" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m0 0A9.966 9.966 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                  <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>
              </div>
              <div
                v-if="hasNodeErrors(node)"
                class="text-red-400 text-sm mt-1 flex items-center gap-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div v-for="(error, idx) in getNodeErrors(node)" :key="idx">
                  {{ error.text }}
                </div>
              </div>
            </template>

            <!-- Method field as Submit Button (use Kratos button but with custom label) -->
            <template v-else-if="getNodeName(node) === 'method' && getNodeType(node) === 'submit'">
              <button
                type="submit"
                :name="getNodeName(node)"
                :value="getNodeValue(node)"
                :disabled="loading"
                class="btn-primary w-full py-3"
              >
                <svg v-if="loading" class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>{{ loading ? 'Signing in...' : 'Sign In' }}</span>
              </button>
            </template>

            <!-- Other Submit Buttons (non-method) -->
            <template v-else-if="node.type === 'input' && getNodeType(node) === 'submit' && getNodeName(node) !== 'method'">
              <button
                type="submit"
                :name="getNodeName(node)"
                :value="getNodeValue(node)"
                :disabled="loading"
                class="btn-primary w-full py-3"
              >
                <svg v-if="loading" class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>{{ loading ? 'Signing in...' : (getNodeValue(node) || 'Sign In') }}</span>
              </button>
            </template>
          </div>
        </form>

        <!-- Verification required (unverified email) -->
        <div
          v-if="isVerificationRequired"
          class="alert-error mt-5"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 shrink-0 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium text-amber-200">Email not verified</p>
            <p class="text-sm text-cyber-light/80 mt-0.5">
              Your account requires email verification. Check your inbox for the verification link or request a new one.
            </p>
            <router-link
              :to="verificationLink"
              class="inline-flex items-center gap-1.5 mt-3 text-sm font-medium text-cyber-accent hover:text-cyber-accent/90"
            >
              Verify your email
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </router-link>
          </div>
        </div>

        <!-- Account disabled (401 identity is disabled) -->
        <div
          v-else-if="isAccountDisabled"
          class="alert-error mt-5"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 shrink-0 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium text-amber-200">This account was disabled.</p>
            <p class="text-sm text-cyber-light/80 mt-1">
              You can try signing in with a different account, or contact an administrator if you believe this is an error.
            </p>
          </div>
        </div>

        <!-- Global Errors (generic login errors, not verification) -->
        <div
          v-else-if="flowErrorDisplayText"
          class="alert-error mt-5"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 shrink-0 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div class="min-w-0 flex-1">
            <div
              v-for="(text, idx) in flowErrorDisplayList"
              :key="idx"
              class="text-sm text-red-300"
            >
              {{ text }}
            </div>
          </div>
        </div>

        <!-- Links Section -->
        <div class="mt-6 space-y-4 pt-4 border-t border-cyber-accent/10">
          <router-link
            :to="recoveryLink"
            class="flex items-center justify-center gap-2 text-sm text-cyber-light/65 hover:text-cyber-accent transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
            Forgot password?
          </router-link>
          <div class="relative">
            <div class="absolute inset-0 flex items-center">
              <div class="w-full border-t border-cyber-accent/15"></div>
            </div>
            <div class="relative flex justify-center">
              <span class="px-2 bg-surface-raised text-xs text-cyber-light/50">New user?</span>
            </div>
          </div>
          <router-link
            :to="registrationLink"
            class="btn-secondary w-full"
          >
            Create an account
          </router-link>
        </div>
      </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import NovaLogoIcon from '../components/NovaLogoIcon.vue'
import { createLoginFlow, getLoginFlow, updateLoginFlow } from '../composables/useAuth'

const refreshAuth = inject('refreshAuth', null)
import {
  getNodeValue,
  getNodeName,
  getNodeType,
  getNodeLabel,
  getNodePlaceholder,
  isNodeRequired,
  getNodeErrors,
  hasNodeErrors
} from '../utils/uiNodes'

const router = useRouter()
const route = useRoute()
const flow = ref(null)
const loading = ref(false)
const showPassword = ref(false)
const passwordValue = ref('')
// When we have login_challenge, we must redirect here after login (Kratos may not echo return_to)
const intendedReturnUrl = ref(null)

onMounted(async () => {
  try {
    const flowId = route.query.flow
    const loginChallenge = route.query.login_challenge
    // Get return_to from query params (for redirects from other frontends)
    const returnTo = route.query.return_to || route.query.returnTo

    if (flowId) {
      flow.value = await getLoginFlow(flowId)
    } else if (loginChallenge) {
      // OAuth/Hydra flow: after Kratos login, land on hydra-callback to accept Hydra login and complete OAuth
      const base = import.meta.env.VITE_AUTH_URL || window.location.origin
      const returnUrl = `${base}/auth/hydra-callback?login_challenge=${encodeURIComponent(loginChallenge)}`
      intendedReturnUrl.value = returnUrl
      flow.value = await createLoginFlow(returnUrl)
    } else {
      // Use return_to if provided, otherwise default to admin dashboard
      const authUrl = import.meta.env.VITE_AUTH_URL || window.location.origin
      const adminUrl = import.meta.env.VITE_ADMIN_URL || 'http://admin.ory.localhost'
      const returnUrl = returnTo || `${adminUrl}/dashboard`
      flow.value = await createLoginFlow(returnUrl)
    }
  } catch (error) {
    console.error('Error loading login flow:', error)
    router.push('/error')
  }
})

const handleInput = (node, event) => {
  if (node.attributes?.value !== undefined) {
    node.attributes.value = event.target.value
  }
}

const updatePasswordValue = (event) => {
  passwordValue.value = event.target.value
  // Also update the node value for form submission
  const passwordNode = flow.value?.ui?.nodes?.find(
    n => getNodeType(n) === 'password'
  )
  if (passwordNode && passwordNode.attributes) {
    passwordNode.attributes.value = event.target.value
  }
}

/** Preserve return_to, login_challenge (OAuth), flow when linking to other auth pages */
const preservedQuery = computed(() => {
  const q = {}
  if (route.query.return_to) q.return_to = route.query.return_to
  if (route.query.returnTo) q.returnTo = route.query.returnTo
  if (route.query.login_challenge) q.login_challenge = route.query.login_challenge
  if (route.query.flow) q.flow = route.query.flow
  return q
})

const registrationLink = computed(() => ({ path: '/registration', query: { ...preservedQuery.value } }))

const recoveryLink = computed(() => ({ path: '/recovery', query: { ...preservedQuery.value } }))

/** Get continue_with array from a login response (success or error body) */
function getContinueWith(response) {
  if (!response) return []
  return (
    response?.error?.details?.continue_with ??
    response?.details?.continue_with ??
    response?.continue_with ??
    []
  )
}

/** Check if the response indicates verification is required (unverified email) */
function isVerificationRequiredResponse(response) {
  if (!response) return false
  const err = response?.error ?? response
  const id = err?.id ?? response?.error_id
  if (id === 'session_verified_address_required') return true
  const msg = (err?.reason ?? err?.message ?? '').toLowerCase()
  return msg.includes('not verified') || msg.includes('no verificad') || msg.includes('email or phone address')
}

/** Redirect to verification page with optional flow id, preserving return_to and login_challenge */
function redirectToVerification(verificationFlowId = null) {
  const q = { ...preservedQuery.value }
  if (verificationFlowId) q.flow = verificationFlowId
  router.push({ path: '/verification', query: q })
}

const verificationLink = computed(() => ({ path: '/verification', query: { ...preservedQuery.value } }))

/** True when the current flow state indicates email verification is required */
const isVerificationRequired = computed(() => {
  if (!flow.value) return false
  const err = flow.value?.error ?? flow.value
  const id = err?.id ?? flow.value?.error_id
  if (id === 'session_verified_address_required') return true
  const msg = (err?.reason ?? err?.message ?? '').toLowerCase()
  if (msg.includes('not verified') || msg.includes('no verificad') || msg.includes('email or phone address')) return true
  const uiMsg = flow.value?.ui?.messages?.find(m => m.type === 'error')?.text ?? ''
  return (uiMsg || '').toLowerCase().includes('not verified') || (uiMsg || '').toLowerCase().includes('verify')
})

/** True when the current flow state indicates account is disabled (401 identity is disabled) */
const isAccountDisabled = computed(() => {
  if (!flow.value?.error) return false
  const msg = (flow.value.error.reason ?? flow.value.error.message ?? '').toLowerCase()
  return msg.includes('disabled')
})

/** List of error texts to show (from ui.messages or from error object reason/message) */
const flowErrorDisplayList = computed(() => {
  if (!flow.value) return []
  const uiErrors = flow.value?.ui?.messages?.filter(m => m.type === 'error').map(m => m.text) ?? []
  if (uiErrors.length) return uiErrors
  const err = flow.value?.error ?? flow.value
  const text = err?.reason ?? err?.message
  return text ? [text] : []
})

const flowErrorDisplayText = computed(() => flowErrorDisplayList.value.length > 0 && !isAccountDisabled.value)

const getMethodValue = () => {
  const methodNode = flow.value?.ui?.nodes?.find(
    node => node.attributes?.name === 'method' && node.type === 'input'
  )
  return methodNode?.attributes?.value || 'password'
}

const handleSubmit = async (event) => {
  loading.value = true
  try {
    const formData = new FormData(event.target)
    
    // Always ensure password value is set in formData (use stored value)
    // This is critical because password fields don't always submit their value correctly
    if (passwordValue.value) {
      formData.set('password', passwordValue.value)
    } else {
      // Fallback: try to get from formData
      const formPassword = formData.get('password')
      if (formPassword) {
        passwordValue.value = formPassword
      }
    }
    
    // Ensure method field is included (required by Kratos)
    const methodValue = getMethodValue()
    if (methodValue) {
      formData.set('method', methodValue)
    }
    
    // Ensure CSRF token is included (required for CSRF protection)
    const csrfNode = flow.value?.ui?.nodes?.find(
      node => getNodeType(node) === 'hidden' && getNodeName(node) === 'csrf_token'
    )
    if (csrfNode) {
      const csrfToken = getNodeValue(csrfNode)
      if (csrfToken) formData.set('csrf_token', csrfToken)
    }
    
    const payload = Object.fromEntries(formData.entries())
    const data = await updateLoginFlow(flow.value.id, payload)
    
    // For browser-based login, if we get here without an error, login succeeded
    // Session is set as a cookie, not in the response body
    // Check if there are any errors in the response
    const hasErrors = data?.ui?.messages?.some(msg => msg.type === 'error')
    
    if (!hasErrors) {
      // Login successful - refresh auth state and redirect
      if (refreshAuth) {
        await refreshAuth()
      }
      
      // Prefer intended return URL (OAuth hydra-callback), then flow/query
      const returnTo = intendedReturnUrl.value || flow.value?.return_to || route.query.return_to || route.query.returnTo

      if (returnTo) {
        window.location.href = decodeURIComponent(returnTo)
      } else {
        const adminUrl = import.meta.env.VITE_ADMIN_URL || 'http://admin.ory.localhost'
        window.location.href = `${adminUrl}/dashboard`
      }
    } else {
      // Response has errors: check for verification required (continue_with in success body)
      const continueWith = getContinueWith(data)
      const verificationItem = continueWith.find(c => c.action === 'show_verification_ui')
      if (verificationItem) {
        const verificationFlowId = verificationItem.flow?.id ?? verificationItem.flow
        redirectToVerification(verificationFlowId)
        return
      }
      if (isVerificationRequiredResponse(data)) {
        redirectToVerification()
        return
      }
      flow.value = data
    }
  } catch (error) {
    if (error.response?.status === 400) {
      const body = error.response.data || {}
      const continueWith = getContinueWith(body)
      const verificationItem = continueWith.find(c => c.action === 'show_verification_ui')
      if (verificationItem) {
        const verificationFlowId = verificationItem.flow?.id ?? verificationItem.flow
        redirectToVerification(verificationFlowId)
        return
      }
      if (isVerificationRequiredResponse(body)) {
        // Verification required but no flow id: send user to verification to request new code
        redirectToVerification()
        return
      }
      const err = body?.error ?? body
      flow.value = err?.id ? { ...err, error_id: err.id } : err
    } else {
      const body = error.response?.data ?? error.body ?? {}
      const err = body?.error ?? body
      // 401 Unauthorized: account disabled (Kratos "identity is disabled")
      if (error.response?.status === 401) {
        const msg = (err?.message ?? err?.reason ?? '').toLowerCase()
        const isDisabled = msg.includes('disabled') || (err?.reason && String(err.reason).toLowerCase().includes('disabled'))
        if (isDisabled) {
          flow.value = {
            ...flow.value,
            id: flow.value?.id,
            ui: flow.value?.ui,
            error: { reason: err?.reason || 'This account was disabled.', message: err?.message || 'identity is disabled' }
          }
          return
        }
      }
      if (isVerificationRequiredResponse(body)) {
        redirectToVerification()
        return
      }
      const errId = body?.error?.id ?? body?.id ?? body?.error_id
      if (errId) {
        router.push({ path: '/error', query: { id: errId, ...(route.query.return_to && { return_to: route.query.return_to }) } })
      } else {
        console.error('Login error:', error)
        router.push('/error')
      }
    }
  } finally {
    loading.value = false
  }
}
</script>
