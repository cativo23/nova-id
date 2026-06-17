<template>
  <div class="auth-page min-h-[calc(100vh-3.5rem)] relative overflow-hidden">
    <div class="absolute inset-0 bg-mesh-gradient pointer-events-none" aria-hidden="true" />
    <div class="relative flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center px-4 py-10 sm:py-12">
      <div class="w-full max-w-[28rem]">
        <div class="mb-6 flex flex-col items-center text-center">
          <div class="hero-icon-float mb-5">
            <div class="hero-glow-pulse flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-xl border border-cyber-accent/20 bg-cyber-dark/90">
              <NovaLogoIcon svg-class="h-7 w-7 sm:h-8 sm:w-8" gradient-id="recovery-hero-icon" filter-id="recovery-hero-glow" :glow="true" />
            </div>
          </div>
          <h1 class="hero-title text-xl font-semibold tracking-tight text-cyber-light sm:text-2xl">Password recovery</h1>
          <p v-if="!codeSent" class="hero-subtitle mt-1 text-sm text-cyber-light/55">
            Enter your email and we’ll send you a recovery code.
          </p>
          <p v-else class="hero-subtitle mt-1 text-sm text-cyber-light/55">
            Enter the code sent to your email.
          </p>
        </div>

        <div class="hero-form-wrap auth-card">
        <!-- Flow replaced (410): show Kratos message -->
        <div
          v-if="flowReplacedMessage"
          class="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400/90 text-sm"
        >
          {{ flowReplacedMessage }}
        </div>
        <!-- Info message from Kratos (e.g. “An email containing a recovery code has been sent…”) -->
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

            <!-- Text / code / password / email inputs -->
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
                v-if="getNodeName(node) === 'code' || getNodeName(node) === 'recovery_code'"
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

            <!-- Primary submit: method=code → “Verify Code” / “Continue” / “Send recovery code” -->
            <template v-else-if="getNodeName(node) === 'method' && getNodeType(node) === 'submit'">
              <div class="pt-1">
                <button
                  type="submit"
                  :name="getNodeName(node)"
                  :value="getNodeValue(node)"
                  :disabled="loading"
                  class="btn-primary w-full"
                >
                  {{ loading ? 'Processing…' : (codeSent ? 'Verify code' : 'Send recovery code') }}
                </button>
              </div>
            </template>

            <!-- Resend code: separate action so we only send email (no code). Cooldown + ring. -->
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
                  {{ resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : (getNodeLabel(node) || 'Resend code') }}
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

        <!-- Global errors (only error type) -->
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
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import type { LocationQuery, LocationQueryValue } from 'vue-router'
import type { UpdateRecoveryFlowBody } from '@ory/client'
import NovaLogoIcon from '../components/NovaLogoIcon.vue'
import { createRecoveryFlow, getRecoveryFlow, updateRecoveryFlow } from '../composables/useAuth'
import type { FlowLike, HttpErrorLike } from '../types/flow'
import type { UiNodeLike } from '../utils/uiNodes'
import { logger, errMessage } from '../utils/logger'
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

/** Kratos query params may be string | string[] | null — normalize to a single string. */
function firstQuery(v: LocationQueryValue | LocationQueryValue[] | undefined): string | undefined {
  const val = Array.isArray(v) ? v[0] : v
  return val ?? undefined
}

const router = useRouter()
const route = useRoute()
const flow = ref<FlowLike | null>(null)
const loading = ref(false)
const returnTo = ref<string>(firstQuery(route.query.return_to) || firstQuery(route.query.returnTo) || '')
const resendCooldown = ref(0)
const recoveryEmail = ref('') // email used for "Resend code"; set when we reach code step
const codeInputValue = ref('') // keep code in ref so it survives cooldown re-renders and flow replace
const flowReplacedMessage = ref('')
let resendCooldownTimer: ReturnType<typeof setInterval> | null = null

const preservedQuery = computed<LocationQuery>(() => {
  const q: LocationQuery = {}
  if (route.query.return_to) q.return_to = route.query.return_to
  if (route.query.returnTo) q.returnTo = route.query.returnTo
  if (route.query.login_challenge) q.login_challenge = route.query.login_challenge
  if (route.query.flow) q.flow = route.query.flow
  return q
})

const loginLink = computed(() => ({ path: '/login', query: { ...preservedQuery.value } }))

const registrationLink = computed(() => ({ path: '/registration', query: { ...preservedQuery.value } }))

const codeSent = computed(() => {
  // Check if we're in the code verification step (after email is sent)
  // This is indicated by the presence of a code input field
  // But NOT if we're in the password reset step
  const hasCodeField = flow.value?.ui?.nodes?.some(
    node => node.attributes?.name === 'code' || node.attributes?.name === 'recovery_code'
  )
  const hasPasswordField = flow.value?.ui?.nodes?.some(
    node => node.attributes?.name === 'password' || node.attributes?.name === 'password_confirm'
  )
  return hasCodeField && !hasPasswordField
})

const COOLDOWN_RING_CIRCUMFERENCE = 2 * Math.PI * 8
const cooldownRingOffset = computed(() =>
  COOLDOWN_RING_CIRCUMFERENCE * (1 - resendCooldown.value / RESEND_COOLDOWN_SEC)
)

function nodeKey(node: UiNodeLike, index: number): string {
  const n = node.attributes?.name ?? ''
  const t = node.attributes?.type ?? ''
  return `n-${index}-${n}-${t}`
}

onMounted(async () => {
  try {
    flowReplacedMessage.value = route.query.flow_replaced_msg ? decodeURIComponent(firstQuery(route.query.flow_replaced_msg) ?? '') : ''
    returnTo.value = firstQuery(route.query.return_to) || firstQuery(route.query.returnTo) || returnTo.value
    const flowId = firstQuery(route.query.flow)
    const recoveryCode = firstQuery(route.query.code)

    if (flowId) {
      flow.value = await getRecoveryFlow(flowId)
      const f = flow.value
      if (f?.ui?.nodes?.some(n => (getNodeName(n) === 'code' || getNodeName(n) === 'recovery_code') && getNodeType(n) !== 'submit')) {
        const emailNode = f.ui.nodes.find(n => getNodeName(n) === 'email')
        if (emailNode) recoveryEmail.value = String(getNodeValue(emailNode) || '')
        const codeNode = f.ui.nodes.find(n => (getNodeName(n) === 'code' || getNodeName(n) === 'recovery_code') && getNodeType(n) !== 'submit')
        if (codeNode) codeInputValue.value = (recoveryCode || '') || String(getNodeValue(codeNode) || '')
      }
    } else if (recoveryCode) {
      flow.value = await createRecoveryFlow(returnTo.value || null)
      if (flow.value?.ui?.nodes) {
        flow.value._adminRecoveryCode = recoveryCode
        codeInputValue.value = recoveryCode
      }
    } else {
      flow.value = await createRecoveryFlow(returnTo.value || null)
    }
  } catch (error) {
    logger.error('Error loading recovery flow:', errMessage(error))
    router.push('/error')
  }
})

const handleInput = (node: UiNodeLike, event: Event) => {
  const val = (event.target as HTMLInputElement).value
  const isCode = getNodeName(node) === 'code' || getNodeName(node) === 'recovery_code'
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

function preserveCodeValue(prevFlow: FlowLike | null, newFlow: FlowLike | null) {
  if (!newFlow?.ui?.nodes) return
  const codeVal = codeInputValue.value || (prevFlow?.ui?.nodes && (() => {
    const n = prevFlow.ui!.nodes!.find(
      x => (getNodeName(x) === 'code' || getNodeName(x) === 'recovery_code') && getNodeType(x) !== 'submit'
    )
    return n ? String(getNodeValue(n) ?? '') : ''
  })())
  const newCodeNode = newFlow.ui.nodes.find(
    n => (getNodeName(n) === 'code' || getNodeName(n) === 'recovery_code') && getNodeType(n) !== 'submit'
  )
  if (newCodeNode?.attributes) newCodeNode.attributes.value = codeVal || ''
  if (codeVal) codeInputValue.value = codeVal
}

/** Resend code: send only email + csrf + method so we never submit a bad code. No form submit. */
async function handleResendCode(resendNode: UiNodeLike) {
  if (loading.value || resendCooldown.value > 0) return
  const email = recoveryEmail.value || String(getNodeValue(resendNode) ?? '')
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
    const data = (await updateRecoveryFlow(flow.value!.id!, payload as unknown as UpdateRecoveryFlowBody)) as unknown as FlowLike
    preserveCodeValue(prevFlow, data)
    flow.value = data
    if (!data?.ui?.messages?.some(m => m.type === 'error')) {
      startResendCooldown()
    }
  } catch (err) {
    const e = err as HttpErrorLike
    if (e.response?.status === 400 && e.response?.data) {
      preserveCodeValue(prevFlow, e.response.data)
      flow.value = e.response.data
      flowReplacedMessage.value = ''
    } else if (e.response?.status === 410) {
      const body: FlowLike = e.response?.data || {}
      const bodyErr = body.error as { use_flow_id?: string; reason?: string; message?: string } | undefined
      const useFlowId = body.use_flow_id ?? bodyErr?.use_flow_id
      const reason = bodyErr?.reason ?? bodyErr?.message ?? 'Please use the new form below.'
      flowReplacedMessage.value = reason
      if (useFlowId) {
        try {
          flow.value = await getRecoveryFlow(useFlowId)
          router.replace({ path: '/recovery', query: { ...route.query, flow: useFlowId } })
        } catch (e2) {
          logger.error('Failed to load new flow:', errMessage(e2))
        }
      }
    } else {
      logger.error('Resend code failed:', errMessage(err))
    }
  } finally {
    loading.value = false
  }
}

const getMethodValue = (): string => {
  const methodNode = flow.value?.ui?.nodes?.find(
    node => node.attributes?.name === 'method' && node.type === 'input'
  )
  return (methodNode?.attributes?.value as string) || 'code'
}

const handleSubmit = async (event: Event) => {
  loading.value = true
  try {
    const formData = new FormData(event.target as HTMLFormElement)
    const isEmailStep = !flow.value?.ui?.nodes?.some(
      n => n.attributes?.name === 'code' || n.attributes?.name === 'recovery_code'
    )
    const methodValue = getMethodValue()
    formData.set('method', methodValue || 'code')
    if (isEmailStep) {
      formData.set('method', 'code')
    }
    const payload = Object.fromEntries(formData.entries()) as Record<string, string>
    if (isEmailStep && !payload.method) payload.method = 'code'
    const data = (await updateRecoveryFlow(flow.value!.id!, payload as unknown as UpdateRecoveryFlowBody)) as unknown as FlowLike

    if (isEmailStep && payload.email) recoveryEmail.value = payload.email
    if (!isEmailStep && data?.ui?.nodes?.some(n => (getNodeName(n) === 'code' || getNodeName(n) === 'recovery_code') && getNodeType(n) !== 'submit') && !recoveryEmail.value) {
      const emailNode = data.ui.nodes.find(n => getNodeName(n) === 'email')
      if (emailNode) recoveryEmail.value = String(getNodeValue(emailNode) || (payload.email || ''))
    }

    // If we have an admin-provided recovery code stored, auto-fill it when code field appears
    if (flow.value!._adminRecoveryCode && data?.ui?.nodes) {
      const codeNode = data.ui.nodes.find(
        node => node.attributes?.name === 'code' || node.attributes?.name === 'recovery_code'
      )
      if (codeNode && codeNode.attributes) {
        codeNode.attributes.value = flow.value!._adminRecoveryCode
        // Clear stored code after using it
        delete flow.value!._adminRecoveryCode
      }
    }
    
    // Check if recovery completed successfully
    const hasErrors = data?.ui?.messages?.some(msg => msg.type === 'error')
    const hasCodeStep = !hasErrors && data?.ui?.nodes?.some(n => (getNodeName(n) === 'code' || getNodeName(n) === 'recovery_code') && getNodeType(n) !== 'submit') && !data?.ui?.nodes?.some(n => getNodeName(n) === 'password' || getNodeName(n) === 'password_confirm')
    if (isEmailStep && hasCodeStep) startResendCooldown()

    if (!hasErrors) {
      // Check if we have a password field in the UI nodes (password reset step)
      const hasPasswordField = data?.ui?.nodes?.some(
        node => node.attributes?.name === 'password' || node.attributes?.name === 'password_confirm'
      )
      
      // Check if recovery is complete (session created)
      const hasSession = data?.session || data?.session_token
      
      if (hasSession) {
        // Recovery successful - redirect to return_to if provided, else login with recovered flag
        if (returnTo.value) {
          window.location.href = decodeURIComponent(returnTo.value)
        } else {
          router.push('/login?recovered=true')
        }
      } else if (hasPasswordField) {
        flow.value = data
      } else if (data?.continue_with) {
        const settingsFlow = data.continue_with.find(cw => cw.action === 'show_settings_ui')
        if (settingsFlow && settingsFlow.flow) {
          const flowId = typeof settingsFlow.flow === 'string'
            ? settingsFlow.flow
            : settingsFlow.flow.id
          const q = returnTo.value ? `&return_to=${encodeURIComponent(returnTo.value)}` : ''
          router.push(`/settings?flow=${flowId}${q}`)
        } else {
          flow.value = data
        }
      } else if (data?.state === 'passed_challenge') {
        // Code verified, should show password reset
        flow.value = data
      } else {
        // Update flow with new state
        flow.value = data
      }
    } else {
      // Update flow with errors
      flow.value = data
    }
  } catch (error) {
    const er = error as HttpErrorLike
    if (er.response?.status === 400) {
      flow.value = er.response.data ?? null
    } else if (er.response?.status === 410) {
      const body: FlowLike = er.response.data || {}
      const bodyErr = body.error as { use_flow_id?: string; reason?: string; message?: string } | undefined
      const useFlowId = body.use_flow_id ?? bodyErr?.use_flow_id
      const reason = bodyErr?.reason ?? bodyErr?.message ?? 'Please use the new form below.'
      flowReplacedMessage.value = reason
      if (useFlowId) {
        try {
          flow.value = await getRecoveryFlow(useFlowId)
          const f = flow.value
          if (f?.ui?.nodes?.some(n => (getNodeName(n) === 'code' || getNodeName(n) === 'recovery_code') && getNodeType(n) !== 'submit')) {
            const emailNode = f.ui.nodes.find(n => getNodeName(n) === 'email')
            if (emailNode) recoveryEmail.value = String(getNodeValue(emailNode) || '')
            const codeFromQuery = firstQuery(route.query.code)
            if (codeFromQuery) {
              const codeNode = f.ui.nodes.find(n => (getNodeName(n) === 'code' || getNodeName(n) === 'recovery_code') && getNodeType(n) !== 'submit')
              if (codeNode?.attributes) codeNode.attributes.value = codeFromQuery
            }
          }
          router.replace({ path: '/recovery', query: { ...route.query, flow: useFlowId } })
        } catch (e) {
          logger.error('Failed to load new flow:', errMessage(e))
        }
      }
    } else {
      logger.error('Recovery error:', errMessage(error))
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
