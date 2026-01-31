<template>
  <div class="auth-page min-h-[calc(100vh-3.5rem)] relative overflow-hidden">
    <div class="absolute inset-0 bg-mesh-gradient pointer-events-none" aria-hidden="true" />
    <div class="relative flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center px-4 py-10 sm:py-12">
      <div class="w-full max-w-[28rem]">
        <div class="mb-6 flex flex-col items-center text-center">
          <div class="hero-icon-float mb-5">
            <div class="hero-glow-pulse flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-xl border border-cyber-accent/20 bg-cyber-dark/90">
              <NovaLogoIcon svg-class="h-7 w-7 sm:h-8 sm:w-8" gradient-id="verification-hero-icon" filter-id="verification-hero-glow" :glow="true" />
            </div>
          </div>
          <h1 class="hero-title text-xl font-semibold tracking-tight text-cyber-light sm:text-2xl">
            {{ alreadyVerified ? 'Email verified' : 'Verify your email' }}
            </h1>
          <p v-if="alreadyVerified" class="hero-subtitle mt-1 text-sm text-cyber-light/55">
            Your email is already verified. Continue to your account.
          </p>
          <p v-else-if="!codeSent" class="hero-subtitle mt-1 text-sm text-cyber-light/55">
            Enter your email and we’ll send you a verification code.
          </p>
          <p v-else class="hero-subtitle mt-1 text-sm text-cyber-light/55">
            Enter the code sent to your email.
          </p>
        </div>

        <div class="hero-form-wrap auth-card">
        <!-- Already verified: show success + continue link -->
        <div
          v-if="alreadyVerified"
          class="space-y-5"
        >
          <div
            v-if="flow?.ui?.messages?.length && flow.ui.messages.some(m => m.type === 'success')"
            class="p-4 bg-green-500/20 border border-green-500/50 rounded-lg"
          >
            <p
              v-for="(msg, i) in flow.ui.messages.filter(m => m.type === 'success')"
              :key="i"
              class="text-green-400 text-sm"
            >
              {{ msg.text }}
            </p>
          </div>
          <a
            v-if="continueUrl"
            :href="continueUrl"
            class="btn-primary w-full"
          >
            Continue
          </a>
          <div class="pt-4 border-t border-cyber-accent/20 text-center">
            <router-link
              :to="loginLink"
              class="block text-sm text-cyber-accent hover:text-cyber-light transition-colors"
            >
              Back to sign in
            </router-link>
          </div>
        </div>

        <template v-else>
        <!-- Flow replaced (410): show Kratos message -->
        <div
          v-if="flowReplacedMessage"
          class="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400/90 text-sm"
        >
          {{ flowReplacedMessage }}
        </div>
        <!-- Info message from Kratos -->
        <div
          v-else-if="flow?.ui?.messages?.length && flow.ui.messages.some(m => m.type === 'info')"
          class="mb-6 p-4 bg-cyber-accent/10 border border-cyber-accent/30 rounded-lg"
        >
          <p
            v-for="(msg, i) in flow.ui.messages.filter(m => m.type === 'info')"
            :key="i"
            class="text-cyber-light/90 text-sm"
          >
            {{ msg.text }}
          </p>
        </div>

        <form @submit.prevent="handleSubmit" class="space-y-5">
          <div
            v-for="(node, nidx) in (flow?.ui?.nodes || [])"
            :key="nodeKey(node, nidx)"
            class="contents"
          >
            <!-- Hidden fields -->
            <template v-if="node.type === 'input' && getNodeType(node) === 'hidden'">
              <input
                type="hidden"
                :name="getNodeName(node)"
                :value="getNodeValue(node)"
              />
            </template>

            <!-- Text / code / email inputs -->
            <template v-else-if="['text', 'password', 'email'].includes(getNodeType(node))">
              <label
                :for="getNodeName(node)"
                class="block text-sm font-medium text-cyber-light mb-1.5"
              >
                {{ getNodeLabel(node) }}
                <span v-if="isNodeRequired(node)" class="text-red-400">*</span>
              </label>
              <!-- Code field: v-model so value survives cooldown re-renders -->
              <input
                v-if="getNodeName(node) === 'code' || getNodeName(node) === 'verification_code'"
                :id="getNodeName(node)"
                :name="getNodeName(node)"
                :type="getNodeType(node)"
                v-model="codeInputValue"
                :placeholder="getNodePlaceholder(node)"
                :required="isNodeRequired(node)"
                class="input-base"
              />
              <input
                v-else
                :id="getNodeName(node)"
                :name="getNodeName(node)"
                :type="getNodeType(node)"
                :value="getNodeValue(node)"
                :placeholder="getNodePlaceholder(node)"
                :required="isNodeRequired(node)"
                @input="handleInput(node, $event)"
                class="input-base"
              />
              <div v-if="hasNodeErrors(node)" class="text-red-400 text-sm mt-1">
                <span v-for="(err, i) in getNodeErrors(node)" :key="i">{{ err.text }}</span>
              </div>
            </template>

            <!-- Primary submit: method=code → "Verify Code" / "Send verification code" -->
            <template v-else-if="getNodeName(node) === 'method' && getNodeType(node) === 'submit'">
              <div class="pt-1">
                <button
                  type="submit"
                  :name="getNodeName(node)"
                  :value="getNodeValue(node)"
                  :disabled="loading"
                  class="btn-primary w-full"
                >
                  {{ loading ? 'Processing…' : (codeSent ? 'Verify code' : 'Send verification code') }}
                </button>
              </div>
            </template>

            <!-- Resend code: separate action, cooldown + ring -->
            <template v-else-if="getNodeName(node) === 'email' && getNodeType(node) === 'submit'">
              <div class="pt-0.5 flex items-center justify-center gap-2">
                <svg
                  v-if="resendCooldown > 0"
                  class="cooldown-ring flex-shrink-0"
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                >
                  <circle
                    class="cooldown-ring-track"
                    cx="10"
                    cy="10"
                    r="8"
                    fill="none"
                    stroke-width="1.5"
                  />
                  <circle
                    class="cooldown-ring-fill"
                    cx="10"
                    cy="10"
                    r="8"
                    fill="none"
                    stroke-width="1.5"
                    stroke-dasharray="50.27"
                    :stroke-dashoffset="cooldownRingOffset"
                    transform="rotate(-90 10 10)"
                  />
                </svg>
                <button
                  type="button"
                  :disabled="loading || resendCooldown > 0"
                  class="text-sm text-cyber-accent hover:text-cyber-light/90 hover:underline transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:no-underline"
                  @click="handleResendCode(node)"
                >
                  {{ resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : (getNodeLabel(node) || 'Resend verification email') }}
                </button>
              </div>
            </template>

            <!-- Any other submit fallback -->
            <template v-else-if="node.type === 'input' && getNodeType(node) === 'submit'">
              <button
                type="submit"
                :name="getNodeName(node)"
                :value="getNodeValue(node)"
                :disabled="loading"
                class="btn-secondary w-full"
              >
                {{ getNodeLabel(node) || getNodeValue(node) || 'Continue' }}
              </button>
            </template>
          </div>
        </form>

        <!-- Global errors -->
        <div
          v-if="flow?.ui?.messages && flow.ui.messages.some(m => m.type === 'error')"
          class="alert-error mt-5"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 shrink-0 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p v-for="(msg, i) in flow.ui.messages.filter(m => m.type === 'error')" :key="i" class="text-sm text-red-300">
              {{ msg.text }}
            </p>
          </div>
        </div>

        <!-- Success messages -->
        <div
          v-if="flow?.ui?.messages && flow.ui.messages.some(m => m.type === 'success')"
          class="alert-success mt-5"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 shrink-0 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p v-for="(msg, i) in flow.ui.messages.filter(m => m.type === 'success')" :key="i" class="text-sm text-green-300">
              {{ msg.text }}
            </p>
          </div>
        </div>

        <div class="mt-6 pt-4 border-t border-cyber-accent/10 text-center space-y-2">
          <router-link
            :to="loginLink"
            class="block text-sm font-medium text-cyber-accent hover:text-cyber-accent/90 transition-colors"
          >
            Back to sign in
          </router-link>
          <router-link
            v-if="!codeSent"
            :to="registrationLink"
            class="block text-sm text-cyber-light/65 hover:text-cyber-accent transition-colors"
          >
            Don’t have an account? Create account
          </router-link>
        </div>
        </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import NovaLogoIcon from '../components/NovaLogoIcon.vue'
import { createBrowserVerificationFlow, getVerificationFlow, updateVerificationFlow } from '../composables/useAuth'
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

const RESEND_COOLDOWN_SEC = 60
const DEFAULT_AFTER_VERIFICATION = (import.meta.env.VITE_ADMIN_URL || 'http://admin.ory.localhost') + '/dashboard'

const router = useRouter()
const route = useRoute()
const flow = ref(null)
const loading = ref(false)
const returnTo = ref(route.query.return_to || route.query.returnTo || '')
const resendCooldown = ref(0)
const verificationEmail = ref('')
const codeInputValue = ref('') // keep code in ref so it survives cooldown re-renders and flow replace
const flowReplacedMessage = ref('')
let resendCooldownTimer = null

const loginLink = computed(() => {
  const q = returnTo.value
  return q ? { path: '/login', query: { return_to: q } } : { path: '/login' }
})

const registrationLink = computed(() => {
  const q = returnTo.value
  return q ? { path: '/registration', query: { return_to: q } } : { path: '/registration' }
})

const codeSent = computed(() => {
  const hasCodeField = flow.value?.ui?.nodes?.some(
    node => node.attributes?.name === 'code' || node.attributes?.name === 'verification_code'
  )
  return !!hasCodeField
})

const COOLDOWN_RING_CIRCUMFERENCE = 2 * Math.PI * 8
const cooldownRingOffset = computed(() =>
  COOLDOWN_RING_CIRCUMFERENCE * (1 - resendCooldown.value / RESEND_COOLDOWN_SEC)
)

/** Flow already passed (e.g. email was verified in another tab or link already used) */
const alreadyVerified = computed(() => {
  const f = flow.value
  if (!f) return false
  if (f.state === 'passed_challenge') return true
  // Kratos may return success + continue link without state in some versions
  const hasSuccess = f?.ui?.messages?.some(m => m.type === 'success')
  const hasContinueLink = f?.ui?.nodes?.some(
    n => n.type === 'a' && (n.attributes?.id === 'continue' || n.attributes?.href)
  )
  const noFormInputs = !f?.ui?.nodes?.some(
    n => n.attributes?.name === 'email' || n.attributes?.name === 'code' || n.attributes?.name === 'verification_code'
  )
  return !!(hasSuccess && hasContinueLink && noFormInputs)
})

/** URL to continue to when already verified (from flow.ui.action or continue link) */
const continueUrl = computed(() => {
  const f = flow.value
  if (!f?.ui) return DEFAULT_AFTER_VERIFICATION
  if (f.ui.action && typeof f.ui.action === 'string') return f.ui.action
  const continueNode = f.ui.nodes?.find(
    n => n.type === 'a' && (n.attributes?.id === 'continue' || n.attributes?.href)
  )
  return continueNode?.attributes?.href || DEFAULT_AFTER_VERIFICATION
})

function nodeKey(node, index) {
  const n = node.attributes?.name ?? ''
  const t = node.attributes?.type ?? ''
  return `n-${index}-${n}-${t}`
}

/** True when flow is on the "request code" step (email field, no code field yet) */
function isEmailRequestStep(f) {
  if (!f?.ui?.nodes) return false
  const hasEmail = f.ui.nodes.some(n => getNodeName(n) === 'email')
  const hasCodeField = f.ui.nodes.some(n => (getNodeName(n) === 'code' || getNodeName(n) === 'verification_code') && getNodeType(n) !== 'submit')
  return hasEmail && !hasCodeField
}

onMounted(async () => {
  try {
    flowReplacedMessage.value = route.query.flow_replaced_msg ? decodeURIComponent(route.query.flow_replaced_msg) : ''
    returnTo.value = route.query.return_to || route.query.returnTo || returnTo.value
    const flowId = route.query.flow || route.query.id
    const codeFromUrl = route.query.code
    const emailFromQuery = route.query.email

    if (flowId) {
      flow.value = await getVerificationFlow(flowId)
      const f = flow.value
      if (!returnTo.value && f?.return_to) {
        returnTo.value = f.return_to
      }
      if (f?.ui?.nodes?.some(n => (getNodeName(n) === 'code' || getNodeName(n) === 'verification_code') && getNodeType(n) !== 'submit')) {
        const emailNode = f.ui.nodes.find(n => getNodeName(n) === 'email')
        if (emailNode) verificationEmail.value = getNodeValue(emailNode) || emailFromQuery || ''
        const codeNode = f.ui.nodes.find(n => (getNodeName(n) === 'code' || getNodeName(n) === 'verification_code') && getNodeType(n) !== 'submit')
        if (codeNode) {
          const fromUrl = codeFromUrl || ''
          codeInputValue.value = fromUrl || getNodeValue(codeNode) || ''
          if (fromUrl && codeNode.attributes) codeNode.attributes.value = fromUrl
        }
      }
    } else {
      flow.value = await createBrowserVerificationFlow(returnTo.value || null)
    }

    // When opened with ?email= (e.g. from admin "Verify email"), auto-request the verification code so Kratos sends the email
    const f = flow.value
    if (emailFromQuery && f && isEmailRequestStep(f)) {
      verificationEmail.value = emailFromQuery
      const csrfNode = f.ui?.nodes?.find(n => getNodeName(n) === 'csrf_token' && getNodeType(n) === 'hidden')
      const csrfToken = csrfNode ? getNodeValue(csrfNode) : null
      if (csrfToken) {
        loading.value = true
        try {
          const data = await updateVerificationFlow(f.id, { method: 'code', email: emailFromQuery, csrf_token: csrfToken })
          flow.value = data
          startResendCooldown()
        } catch (err) {
          if (err.response?.status === 400 && err.response?.data) flow.value = err.response.data
        } finally {
          loading.value = false
        }
      }
    }
  } catch (error) {
    console.error('Error loading verification flow:', error)
    router.push('/error')
  }
})

const handleInput = (node, event) => {
  const val = event.target.value
  const isCode = getNodeName(node) === 'code' || getNodeName(node) === 'verification_code'
  if (isCode) codeInputValue.value = val
  if (node.attributes?.value !== undefined) node.attributes.value = val
}

function startResendCooldown() {
  resendCooldown.value = RESEND_COOLDOWN_SEC
  if (resendCooldownTimer) clearInterval(resendCooldownTimer)
  resendCooldownTimer = setInterval(() => {
    resendCooldown.value = Math.max(0, resendCooldown.value - 1)
    if (resendCooldown.value <= 0 && resendCooldownTimer) {
      clearInterval(resendCooldownTimer)
      resendCooldownTimer = null
    }
  }, 1000)
}

onUnmounted(() => {
  if (resendCooldownTimer) {
    clearInterval(resendCooldownTimer)
    resendCooldownTimer = null
  }
})

function preserveCodeValue(prevFlow, newFlow) {
  if (!newFlow?.ui?.nodes) return
  const codeVal = codeInputValue.value || (prevFlow?.ui?.nodes && (() => {
    const n = prevFlow.ui.nodes.find(
      x => (getNodeName(x) === 'code' || getNodeName(x) === 'verification_code') && getNodeType(x) !== 'submit'
    )
    return n ? getNodeValue(n) : ''
  })())
  const newCodeNode = newFlow.ui.nodes.find(
    n => (getNodeName(n) === 'code' || getNodeName(n) === 'verification_code') && getNodeType(n) !== 'submit'
  )
  if (newCodeNode?.attributes) newCodeNode.attributes.value = codeVal || ''
  if (codeVal) codeInputValue.value = codeVal
}

/** Resend: send only email + csrf + method, no code. */
async function handleResendCode(resendNode) {
  if (loading.value || resendCooldown.value > 0) return
  const email = verificationEmail.value || getNodeValue(resendNode)
  if (!email) return
  const csrfNode = flow.value?.ui?.nodes?.find(
    n => getNodeName(n) === 'csrf_token' && getNodeType(n) === 'hidden'
  )
  const csrfToken = csrfNode ? getNodeValue(csrfNode) : null
  if (!csrfToken) return

  loading.value = true
  const prevFlow = flow.value
  try {
    const payload = { method: 'code', email, csrf_token: csrfToken }
    const data = await updateVerificationFlow(flow.value.id, payload)
    preserveCodeValue(prevFlow, data)
    flow.value = data
    if (!data?.ui?.messages?.some(m => m.type === 'error')) {
      startResendCooldown()
    }
  } catch (err) {
    if (err.response?.status === 400 && err.response?.data) {
      preserveCodeValue(prevFlow, err.response.data)
      flow.value = err.response.data
      flowReplacedMessage.value = ''
    } else if (err.response?.status === 410) {
      const body = err.response?.data || {}
      const useFlowId = body.use_flow_id ?? body.error?.use_flow_id
      const reason = body.error?.reason ?? body.error?.message ?? 'Please use the new form below.'
      flowReplacedMessage.value = reason
      if (useFlowId) {
        try {
          flow.value = await getVerificationFlow(useFlowId)
          router.replace({ path: '/verification', query: { ...route.query, flow: useFlowId } })
        } catch (e) {
          console.error('Failed to load new flow:', e)
        }
      }
    } else {
      console.error('Resend verification email failed:', err)
    }
  } finally {
    loading.value = false
  }
}

const getMethodValue = () => {
  const methodNode = flow.value?.ui?.nodes?.find(
    node => node.attributes?.name === 'method' && node.type === 'input'
  )
  return methodNode?.attributes?.value || 'code'
}

const handleSubmit = async (event) => {
  loading.value = true
  try {
    const formData = new FormData(event.target)
    const isEmailStep = !flow.value?.ui?.nodes?.some(
      n => n.attributes?.name === 'code' || n.attributes?.name === 'verification_code'
    )
    const methodValue = getMethodValue()
    formData.set('method', methodValue || 'code')
    if (isEmailStep) {
      formData.set('method', 'code')
    }
    const payload = Object.fromEntries(formData.entries())
    if (isEmailStep && !payload.method) payload.method = 'code'
    const data = await updateVerificationFlow(flow.value.id, payload)

    if (isEmailStep && payload.email) verificationEmail.value = payload.email
    if (!isEmailStep && data?.ui?.nodes?.some(n => (getNodeName(n) === 'code' || getNodeName(n) === 'verification_code') && getNodeType(n) !== 'submit') && !verificationEmail.value) {
      const emailNode = data.ui.nodes.find(n => getNodeName(n) === 'email')
      if (emailNode) verificationEmail.value = getNodeValue(emailNode) || (payload.email || '')
    }

    const hasErrors = data?.ui?.messages?.some(msg => msg.type === 'error')
    const hasCodeStep = !hasErrors && data?.ui?.nodes?.some(n => (getNodeName(n) === 'code' || getNodeName(n) === 'verification_code') && getNodeType(n) !== 'submit')
    if (isEmailStep && hasCodeStep) startResendCooldown()

    if (!hasErrors) {
      const hasSession = data?.session || data?.session_token
      const continueWith = data?.continue_with || []
      const stillVerificationStep = continueWith.some(c => c.action === 'show_verification_ui')

      if (hasSession) {
        const target = returnTo.value ? decodeURIComponent(returnTo.value) : DEFAULT_AFTER_VERIFICATION
        window.location.href = target
      } else if (stillVerificationStep) {
        flow.value = data
      } else if (!isEmailStep) {
        // Code was just submitted and verification completed (no session, e.g. came from login): go sign in again
        flow.value = data
        const loginQuery = returnTo.value ? { return_to: returnTo.value } : { return_to: DEFAULT_AFTER_VERIFICATION }
        router.push({ path: '/login', query: loginQuery })
      } else {
        flow.value = data
      }
    } else {
      flow.value = data
    }
  } catch (error) {
    if (error.response?.status === 400) {
      flow.value = error.response.data
      flowReplacedMessage.value = ''
    } else if (error.response?.status === 410) {
      const body = error.response.data || {}
      const useFlowId = body.use_flow_id ?? body.error?.use_flow_id
      const reason = body.error?.reason ?? body.error?.message ?? 'Please use the new form below.'
      flowReplacedMessage.value = reason
      if (useFlowId) {
        try {
          flow.value = await getVerificationFlow(useFlowId)
          const f = flow.value
          if (f?.ui?.nodes?.some(n => (getNodeName(n) === 'code' || getNodeName(n) === 'verification_code') && getNodeType(n) !== 'submit')) {
            const emailNode = f.ui.nodes.find(n => getNodeName(n) === 'email')
            if (emailNode) verificationEmail.value = getNodeValue(emailNode) || ''
            if (route.query.code) {
              const codeNode = f.ui.nodes.find(n => (getNodeName(n) === 'code' || getNodeName(n) === 'verification_code') && getNodeType(n) !== 'submit')
              if (codeNode?.attributes) codeNode.attributes.value = route.query.code
            }
          }
          const q = { ...route.query, flow: useFlowId }
          router.replace({ path: '/verification', query: q })
        } catch (e) {
          console.error('Failed to load new flow:', e)
        }
      }
    } else {
      console.error('Verification error:', error)
      router.push('/error')
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.cooldown-ring-track {
  stroke: rgba(255, 255, 255, 0.12);
}
.cooldown-ring-fill {
  stroke: #7dcfff;
  transition: stroke-dashoffset 1s linear;
}
</style>
