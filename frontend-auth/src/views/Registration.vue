<template>
  <div class="auth-page min-h-[calc(100vh-3.5rem)] relative overflow-hidden">
    <div class="absolute inset-0 bg-mesh-gradient pointer-events-none" aria-hidden="true" />
    <div class="relative flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center px-4 py-10 sm:py-12">
      <div class="w-full max-w-[28rem]">
        <div class="mb-6 text-center">
          <div class="hero-icon-float mb-5">
            <div class="hero-glow-pulse mx-auto flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-xl border border-cyber-accent/20 bg-cyber-dark/90">
              <NovaLogoIcon svg-class="h-7 w-7 sm:h-8 sm:w-8" gradient-id="reg-hero-icon" filter-id="reg-hero-glow" :glow="true" />
            </div>
          </div>
          <h1 class="hero-title text-xl font-semibold tracking-tight text-cyber-light sm:text-2xl">Create account</h1>
          <p class="hero-subtitle mt-1 text-sm text-cyber-light/55">Create your account to get started</p>
        </div>

        <div class="hero-form-wrap auth-card">
        <form @submit.prevent="handleSubmit" class="space-y-6">
          <!-- Hidden method field (must be included for multi-step flows) -->
          <input
            v-if="getMethodValue()"
            type="hidden"
            name="method"
            :value="getMethodValue()"
          />
          
          <div
            v-for="node in flow?.ui?.nodes"
            :key="node.attributes?.name || node.id"
            class="space-y-2"
          >
            <!-- Hide role field; it defaults to "platform_user" -->
            <template v-if="getNodeName(node) === 'traits.role'">
              <input
                type="hidden"
                :name="getNodeName(node)"
                :value="getFieldValue(node) || 'platform_user'"
              />
            </template>
            <template v-else-if="getNodeType(node) === 'select' || node.attributes?.type === 'select'">
              <label
                :for="getNodeName(node)"
                class="block text-sm font-medium text-cyber-light"
              >
                {{ getNodeLabel(node) }}
                <span v-if="isNodeRequired(node)" class="text-red-400">*</span>
              </label>
              <select
                :id="getNodeName(node)"
                :name="getNodeName(node)"
                :required="isNodeRequired(node)"
                @change="handleInput(node, $event)"
                :value="getFieldValue(node)"
                class="input-base"
              >
                <option value="">Select {{ getNodeLabel(node) }}</option>
                <option
                  v-for="option in (node.attributes?.options || [])"
                  :key="option.value || option"
                  :value="option.value || option"
                  :selected="(option.value || option) === getFieldValue(node)"
                >
                  {{ option.label || option.value || option }}
                </option>
              </select>
              <div
                v-if="hasNodeErrors(node)"
                class="text-red-400 text-sm"
              >
                <div v-for="(error, idx) in getNodeErrors(node)" :key="idx">
                  {{ error.text }}
                </div>
              </div>
            </template>

            <!-- Text, Email, Password Inputs -->
            <template v-else-if="['text', 'email', 'password'].includes(getNodeType(node))">
              <label
                :for="getNodeName(node)"
                class="block text-sm font-medium text-cyber-light"
              >
                {{ getNodeLabel(node) }}
                <span v-if="isNodeRequired(node)" class="text-red-400">*</span>
              </label>
              <input
                :id="getNodeName(node)"
                :name="getNodeName(node)"
                :type="getNodeType(node)"
                :value="getFieldValue(node) ?? ''"
                :placeholder="getNodePlaceholder(node)"
                :required="isNodeRequired(node)"
                @input="getNodeName(node) === 'password' ? updatePasswordValue($event) : handleInput(node, $event)"
                class="input-base"
              />
              <div
                v-if="hasNodeErrors(node)"
                class="text-red-400 text-sm"
              >
                <div v-for="(error, idx) in getNodeErrors(node)" :key="idx">
                  {{ error.text }}
                </div>
              </div>
              
              <!-- Password rules checklist and confirmation field -->
              <template v-if="getNodeType(node) === 'password' && getNodeName(node) === 'password'">
                <!-- Password Rules Checklist (only show unmet rules) -->
                <div v-if="passwordValue && unmetPasswordRules.length > 0" class="mt-3 p-3 bg-cyber-bg/50 border border-cyber-accent/20 rounded text-sm">
                  <div class="text-cyber-light/70 mb-2 font-medium">Password Requirements:</div>
                  <div class="space-y-1">
                    <div
                      v-for="rule in unmetPasswordRules"
                      :key="rule.id"
                      class="flex items-center gap-2 text-cyber-light/50"
                    >
                      <span class="text-cyber-light/30">○</span>
                      <span class="text-xs">{{ rule.label }}</span>
                    </div>
                  </div>
                </div>
                <!-- Show success message when all rules are met -->
                <div v-if="passwordValue && unmetPasswordRules.length === 0 && passwordRules.length > 0" class="mt-3 p-3 bg-green-500/20 border border-green-500/50 rounded text-sm">
                  <div class="flex items-center gap-2 text-green-400">
                    <span>✓</span>
                    <span class="text-xs font-medium">All password requirements met</span>
                  </div>
                </div>
                
                <!-- Password Confirmation Field -->
                <label
                  for="password_confirm"
                  class="block text-sm font-medium text-cyber-light mt-4"
                >
                  Confirm Password
                  <span class="text-red-400">*</span>
                  <span v-if="passwordsMatch && passwordConfirm" class="ml-2 text-green-400">✓</span>
                </label>
                <div class="relative">
                  <input
                    id="password_confirm"
                    name="password_confirm"
                    type="password"
                    v-model="passwordConfirm"
                    @input="checkPasswordMatch"
                    placeholder="Confirm your password"
                    required
                    :class="[
                      'input-base',
                      passwordsMatch && passwordConfirm ? 'border-emerald-500/50' : passwordMismatch ? 'border-red-500/50 focus:ring-red-500/20' : ''
                    ]"
                  />
                </div>
                <div v-if="passwordMismatch && passwordConfirm" class="text-red-400 text-sm mt-1">
                  Passwords do not match
                </div>
                <div v-else-if="passwordsMatch && passwordConfirm" class="text-green-400 text-sm mt-1">
                  Passwords match
                </div>
              </template>
            </template>

            <!-- Submit Button -->
            <template v-else-if="node.type === 'input' && getNodeType(node) === 'submit'">
              <button
                type="submit"
                :name="getNodeName(node)"
                :value="getNodeValue(node)"
                :disabled="loading"
                class="btn-primary w-full"
              >
                {{ getNodeLabel(node) || getNodeValue(node) || 'Continue' }}
              </button>
            </template>
            
            <!-- Hidden fields (csrf_token, method, etc.) -->
            <template v-else-if="node.type === 'input' && getNodeType(node) === 'hidden'">
              <input
                type="hidden"
                :name="getNodeName(node)"
                :value="getNodeValue(node)"
              />
            </template>
          </div>
        </form>

        <!-- Global Errors -->
        <div
          v-if="flow?.ui?.messages && flow.ui.messages.length > 0"
          class="alert-error mt-4"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 shrink-0 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <div
              v-for="(message, idx) in flow.ui.messages"
              :key="idx"
              class="text-sm text-red-300"
            >
              {{ message.text }}
            </div>
          </div>
        </div>

        <div class="mt-6 pt-4 border-t border-cyber-accent/10 text-center">
          <router-link
            :to="loginLink"
            class="text-sm font-medium text-cyber-accent hover:text-cyber-accent/90 transition-colors"
          >
            Already have an account? Sign in
          </router-link>
        </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, inject, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import NovaLogoIcon from '../components/NovaLogoIcon.vue'
import { createRegistrationFlow, getRegistrationFlow, updateRegistrationFlow } from '../composables/useAuth'
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
const refreshAuth = inject('refreshAuth', null)
const flow = ref(null)
const loading = ref(false)
const passwordValue = ref('')
const passwordConfirm = ref('')
const passwordMismatch = ref(false)
const returnTo = ref(route.query.return_to || route.query.returnTo || '')

// Store all field values separately to prevent them from being cleared
const fieldValues = ref({})

// Password validation rules
const passwordRules = computed(() => {
  const password = passwordValue.value
  return [
    {
      id: 'length',
      label: 'At least 8 characters',
      valid: password.length >= 8
    },
    {
      id: 'uppercase',
      label: 'At least one uppercase letter',
      valid: /[A-Z]/.test(password)
    },
    {
      id: 'lowercase',
      label: 'At least one lowercase letter',
      valid: /[a-z]/.test(password)
    },
    {
      id: 'number',
      label: 'At least one number',
      valid: /[0-9]/.test(password)
    },
    {
      id: 'special',
      label: 'At least one special character',
      valid: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    }
  ]
})

// Check if passwords match
const passwordsMatch = computed(() => {
  return passwordValue.value && passwordConfirm.value && passwordValue.value === passwordConfirm.value
})

// Filter out completed password rules
const unmetPasswordRules = computed(() => {
  return passwordRules.value.filter(rule => !rule.valid)
})

// Update password value and check match (used in template)
const updatePasswordValue = (event) => {
  passwordValue.value = event.target.value
  // Don't update the node value here - it will be set from passwordValue on form submission
  // This prevents other fields from being cleared when typing password
  checkPasswordMatch()
}

// Check password match in real-time
const checkPasswordMatch = () => {
  if (passwordConfirm.value && passwordValue.value) {
    passwordMismatch.value = passwordValue.value !== passwordConfirm.value
  } else {
    passwordMismatch.value = false
  }
}

const roleOptions = [
  { value: 'platform_user', label: 'Platform User' },
  { value: 'platform_admin', label: 'Platform Admin' }
]

const preservedQuery = computed(() => {
  const q = {}
  if (route.query.return_to) q.return_to = route.query.return_to
  if (route.query.returnTo) q.returnTo = route.query.returnTo
  if (route.query.login_challenge) q.login_challenge = route.query.login_challenge
  if (route.query.flow) q.flow = route.query.flow
  return q
})

const loginLink = computed(() => ({ path: '/login', query: { ...preservedQuery.value } }))

onMounted(async () => {
  try {
    returnTo.value = route.query.return_to || route.query.returnTo || returnTo.value
    const flowId = route.query.flow
    if (flowId) {
      flow.value = await getRegistrationFlow(flowId)
    } else {
      flow.value = await createRegistrationFlow(returnTo.value || null)
    }
    // Initialize field values from flow nodes
    if (flow.value?.ui?.nodes) {
      flow.value.ui.nodes.forEach(node => {
        const nodeName = getNodeName(node)
        const nodeType = getNodeType(node)
        const nodeValue = getNodeValue(node, null)
        
        if (nodeName === 'traits.role') {
          const roleValue = nodeValue || 'platform_user'
          fieldValues.value[nodeName] = roleValue
          if (node.attributes) node.attributes.value = roleValue
        } else if (nodeName && nodeType !== 'hidden' && nodeType !== 'submit' && nodeType !== 'password' && nodeValue) {
          // Only store non-hidden, non-submit, non-password fields with actual values
          fieldValues.value[nodeName] = nodeValue
        }
      })
    }
  } catch (error) {
    console.error('Error loading registration flow:', error)
    router.push('/error')
  }
})

const getMethodValue = () => {
  const methodNode = flow.value?.ui?.nodes?.find(
    node => node.attributes?.name === 'method' && node.type === 'input'
  )
  return methodNode?.attributes?.value || null
}

// Get field value safely
const getFieldValue = (node) => {
  const nodeName = getNodeName(node)
  if (nodeName === 'password') {
    // For password, always return passwordValue.value (which should be empty initially)
    return passwordValue.value || ''
  }
  // Check if we have a stored value
  if (fieldValues.value && nodeName && fieldValues.value.hasOwnProperty(nodeName)) {
    const storedValue = fieldValues.value[nodeName]
    // Return stored value, even if it's empty string (user cleared it)
    return storedValue !== undefined ? storedValue : ''
  }
  // Fall back to node value, but only if it's actually set (not the default empty string)
  const nodeValue = getNodeValue(node, null)
  return nodeValue !== null ? nodeValue : ''
}

const handleInput = (node, event) => {
  const value = event.target.value
  const nodeName = getNodeName(node)
  
  // Store value in fieldValues to prevent it from being cleared
  if (nodeName && fieldValues.value) {
    fieldValues.value[nodeName] = value
  }
  
  // Also update the node value for form submission
  if (getNodeType(node) !== 'password' || nodeName !== 'password') {
    if (node.attributes?.value !== undefined) {
      node.attributes.value = value
    }
  }
}

const handleSubmit = async (event) => {
  loading.value = true
  passwordMismatch.value = false
  
  try {
    const formData = new FormData(event.target)
    
    // Ensure password value is set in formData (in case it's not from the form)
    if (passwordValue.value) {
      formData.set('password', passwordValue.value)
    }
    
    // Validate password confirmation
    const password = passwordValue.value || formData.get('password') || ''
    const confirm = passwordConfirm.value || formData.get('password_confirm') || ''
    
    if (password && confirm && password !== confirm) {
      passwordMismatch.value = true
      loading.value = false
      return
    }
    
    // Validate password rules
    const allRulesMet = passwordRules.value.every(rule => rule.valid)
    if (password && !allRulesMet) {
      passwordMismatch.value = false
      loading.value = false
      // Show error message - password doesn't meet requirements
      return
    }
    
    // Ensure method field is included (from hidden input or method node)
    const methodValue = getMethodValue()
    if (methodValue) {
      formData.set('method', methodValue)
    }
    
    const payload = Object.fromEntries(formData.entries())
    
    const data = await updateRegistrationFlow(flow.value.id, payload)
    
    // Handle multi-step flow: if we get a new flow back, update and continue
    if (data && data.id && data.id !== flow.value.id) {
      flow.value = data
      // Flow will update and show next step (password fields)
      return
    }
    
    const redirectAfter = () => {
      if (returnTo.value) {
        window.location.href = decodeURIComponent(returnTo.value)
      } else {
        router.push('/dashboard')
      }
    }

    // Check if registration completed successfully
    if (data && (data.session_token || data.session)) {
      if (refreshAuth) await refreshAuth()
      redirectAfter()
    } else if (data && data.continue_with) {
      const verificationFlow = data.continue_with?.find(cw => cw.action === 'show_verification_ui')
      if (verificationFlow) {
        const flowId = verificationFlow.flow?.id ?? verificationFlow.flow
        const q = returnTo.value ? `&return_to=${encodeURIComponent(returnTo.value)}` : ''
        router.push(`/verification?flow=${flowId}${q}`)
      } else {
        if (refreshAuth) await refreshAuth()
        redirectAfter()
      }
    } else if (data && (data.state === 'choose_method' || data.state === 'password')) {
      // Still in progress, update flow
      flow.value = data
    } else if (data) {
      // Update flow with any response
      flow.value = data
    }
  } catch (error) {
    if (error.response?.status === 400) {
      // Update flow with error response (includes new flow state)
      flow.value = error.response.data
    } else {
      console.error('Registration error:', error)
      router.push('/error')
    }
  } finally {
    loading.value = false
  }
}
</script>
