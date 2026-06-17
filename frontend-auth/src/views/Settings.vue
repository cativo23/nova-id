<template>
  <div class="auth-page min-h-[calc(100vh-3.5rem)] relative overflow-hidden">
    <div class="absolute inset-0 bg-mesh-gradient pointer-events-none" aria-hidden="true" />
    <div class="relative flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4 py-10 sm:py-12">
      <div class="w-full max-w-[28rem]">
        <div class="auth-card">
        <h1 class="mb-2 text-center text-xl font-semibold text-cyber-light">Password reset</h1>
        <p class="mb-6 text-center text-sm text-cyber-light/55">
          Enter your new password below.
        </p>
        
        <form @submit.prevent="handleSubmit" class="space-y-6">
          <!-- Include all hidden fields (csrf_token, method) and profile fields as hidden inputs -->
          <template v-for="node in flow?.ui?.nodes" :key="node.attributes?.name || node.id">
            <template v-if="node.type === 'input' && (getNodeType(node) === 'hidden' || (node.group === 'profile' && getNodeName(node) !== 'password' && getNodeName(node) !== 'password_confirm'))">
              <input
                type="hidden"
                :name="getNodeName(node)"
                :value="getNodeValue(node)"
              />
            </template>
          </template>
          
            <!-- Only show password fields in the UI -->
            <div
              v-for="node in passwordNodes.filter(n => {
                const nodeName = getNodeName(n)
                const nodeType = getNodeType(n)
                return (nodeType === 'password' || nodeName === 'password' || nodeName === 'password_confirm' || n.group === 'password') && n.group !== 'profile' && nodeName !== 'method' && nodeType !== 'submit'
              })"
              :key="node.attributes?.name || node.id"
              class="space-y-2"
            >
              <label
                :for="getNodeName(node)"
                class="block text-sm font-medium text-cyber-light"
              >
                {{ getNodeLabel(node) }}
                <span v-if="isNodeRequired(node)" class="text-red-400">*</span>
              </label>
              <div class="relative">
                <input
                  :id="getNodeName(node)"
                  :name="getNodeName(node)"
                  :type="showPassword ? 'text' : 'password'"
                  :value="getFieldValue(node) ?? ''"
                  :placeholder="getNodePlaceholder(node)"
                  :required="isNodeRequired(node)"
                  @input="getNodeName(node) === 'password' ? updatePasswordValue($event) : handleInput(node, $event)"
                  class="input-base pr-10"
                />
                <button
                  v-if="getNodeName(node) === 'password'"
                  type="button"
                  @click="showPassword = !showPassword"
                  class="absolute right-2 top-1/2 -translate-y-1/2 text-cyber-light/70 hover:text-cyber-accent transition-colors"
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
                class="text-red-400 text-sm"
              >
                <div v-for="(error, idx) in getNodeErrors(node)" :key="idx">
                  {{ error.text }}
                </div>
              </div>
              
              <!-- Password rules checklist and confirmation field -->
              <template v-if="getNodeName(node) === 'password'">
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
                    :type="showPasswordConfirm ? 'text' : 'password'"
                    v-model="passwordConfirm"
                    @input="checkPasswordMatch"
                    placeholder="Confirm your new password"
                    required
                    :class="[
                      'input-base pr-10',
                      passwordsMatch && passwordConfirm ? 'border-emerald-500/50' : passwordMismatch ? 'border-red-500/50 focus:ring-red-500/20' : ''
                    ]"
                  />
                  <button
                    type="button"
                    @click="showPasswordConfirm = !showPasswordConfirm"
                    class="absolute right-2 top-1/2 -translate-y-1/2 text-cyber-light/70 hover:text-cyber-accent transition-colors"
                    :title="showPasswordConfirm ? 'Hide password' : 'Show password'"
                  >
                    <svg v-if="showPasswordConfirm" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m0 0A9.966 9.966 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                    <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                </div>
                <div v-if="passwordMismatch && passwordConfirm" class="text-red-400 text-sm mt-1">
                  Passwords do not match
                </div>
                <div v-else-if="passwordsMatch && passwordConfirm" class="text-green-400 text-sm mt-1">
                  Passwords match
                </div>
              </template>
            </div>

          <!-- Submit Button (always visible, inside form) -->
          <div class="mt-6">
            <button
              type="submit"
              :disabled="loading"
              class="btn-primary w-full"
            >
              {{ loading ? 'Resetting Password...' : 'Reset Password' }}
            </button>
          </div>
        </form>

        <!-- Error Messages Only -->
        <div
          v-if="flow?.ui?.messages && flow.ui.messages.some(m => m.type === 'error')"
          class="mt-4 p-4 bg-red-500/20 border border-red-500/50 rounded"
        >
          <div
            v-for="(message, idx) in flow.ui.messages.filter(m => m.type === 'error')"
            :key="idx"
            class="text-red-400 text-sm"
          >
            {{ message.text }}
          </div>
        </div>

        <!-- Success Messages Only -->
        <div
          v-if="flow?.ui?.messages && flow.ui.messages.some(m => m.type === 'success')"
          class="mt-4 p-4 bg-green-500/20 border border-green-500/50 rounded"
        >
          <div
            v-for="(message, idx) in flow.ui.messages.filter(m => m.type === 'success')"
            :key="idx"
            class="text-green-400 text-sm"
          >
            {{ message.text }}
          </div>
        </div>

        <div class="mt-6 pt-4 border-t border-cyber-accent/10 text-center">
          <router-link
            to="/login"
            class="block text-sm font-medium text-cyber-accent hover:text-cyber-accent/90 transition-colors"
          >
            Back to sign in
          </router-link>
        </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import type { LocationQueryValue } from 'vue-router'
import type { UpdateSettingsFlowBody } from '@ory/client'
import { getSettingsFlow, updateSettingsFlow } from '../composables/useAuth'
import type { FlowLike, HttpErrorLike } from '../types/flow'
import type { UiNodeLike } from '../utils/uiNodes'
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

/** Kratos query params may be string | string[] | null — normalize to a single string. */
function firstQuery(v: LocationQueryValue | LocationQueryValue[] | undefined): string | undefined {
  const val = Array.isArray(v) ? v[0] : v
  return val ?? undefined
}

const router = useRouter()
const route = useRoute()
const flow = ref<FlowLike | null>(null)
const loading = ref(false)
const passwordValue = ref('')
const passwordConfirm = ref('')
const passwordMismatch = ref(false)
const showPassword = ref(false)
const showPasswordConfirm = ref(false)

// Store all field values separately to prevent them from being cleared
const fieldValues = ref<Record<string, string>>({})

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
const updatePasswordValue = (event: Event) => {
  passwordValue.value = (event.target as HTMLInputElement).value
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

// Filter nodes to only show password-related fields (password, password_confirm, csrf_token, method, submit)
// Exclude profile fields and other non-password fields
const passwordNodes = computed(() => {
  if (!flow.value?.ui?.nodes) return []
  return flow.value.ui.nodes.filter((node: UiNodeLike) => {
    const nodeName = getNodeName(node)
    const nodeType = getNodeType(node)
    const nodeGroup = node.group
    
    // Exclude all profile group fields (they should be hidden inputs only, not displayed)
    if (nodeGroup === 'profile') {
      return false
    }
    
    // Exclude method field from being displayed (it should be hidden)
    if (nodeName === 'method') {
      return false
    }
    
    // Include only:
    // 1. Password fields (by type or name)
    // 2. Hidden fields (csrf_token only - method is excluded above)
    // 3. Submit buttons (for form submission)
    const isPasswordField = nodeType === 'password' || 
                           nodeName === 'password' || 
                           nodeName === 'password_confirm' ||
                           nodeGroup === 'password'
    
    const isHiddenField = nodeType === 'hidden' && nodeName === 'csrf_token'
    
    const isSubmitButton = nodeType === 'submit'
    
    return isPasswordField || isHiddenField || isSubmitButton
  })
})

onMounted(async () => {
  try {
    const flowId = firstQuery(route.query.flow)
    if (flowId) {
      flow.value = await getSettingsFlow(flowId)
    } else {
      router.push('/error')
    }
  } catch (error) {
    console.error('Error loading settings flow:', error)
    router.push('/error')
  }
})

// Get field value safely
const getFieldValue = (node: UiNodeLike): string => {
  const nodeName = getNodeName(node)
  if (nodeName === 'password') {
    // For password, always return passwordValue.value (which should be empty initially)
    return passwordValue.value || ''
  }
  // Check if we have a stored value
  if (fieldValues.value && nodeName && Object.prototype.hasOwnProperty.call(fieldValues.value, nodeName)) {
    const storedValue = fieldValues.value[nodeName]
    // Return stored value, even if it's empty string (user cleared it)
    return storedValue !== undefined ? storedValue : ''
  }
  // Fall back to node value, but only if it's actually set (not the default empty string)
  const nodeValue = getNodeValue(node, null)
  return nodeValue !== null ? String(nodeValue) : ''
}

const handleInput = (node: UiNodeLike, event: Event) => {
  const value = (event.target as HTMLInputElement).value
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

const handleSubmit = async (event: Event) => {
  loading.value = true
  passwordMismatch.value = false

  try {
    const formData = new FormData(event.target as HTMLFormElement)

    // Get password values
    const password = String(passwordValue.value || formData.get('password') || '')
    const confirm = String(passwordConfirm.value || formData.get('password_confirm') || '')
    
    // Validate password confirmation
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
    
    // CRITICAL: For password updates, we must ONLY send password-related fields
    // Including profile fields (email, full_name, role) makes Kratos treat it as a profile update
    // This causes the password to NOT be updated
    
    // Build a new FormData with ONLY password-related fields
    const passwordFormData = new FormData()
    
    // CRITICAL: Set method to "password" to update password (not "profile")
    passwordFormData.set('method', 'password')
    
    // CRITICAL: Check what password fields Kratos expects from the flow
    // Kratos might provide different field names in settings flow vs registration
    let passwordFieldName = 'password'
    let passwordConfirmFieldName = 'password_confirm'
    
    // Check if Kratos provides password_confirm field in the flow
    if (flow.value?.ui?.nodes) {
      const passwordNodes = flow.value.ui.nodes.filter((node: UiNodeLike) => {
        const nodeName = getNodeName(node)
        const nodeType = getNodeType(node)
        return (nodeType === 'password' || nodeName === 'password' || nodeName === 'password_confirm') && node.group !== 'profile'
      })
      
      // Use the actual field names from Kratos
      const passwordNode = passwordNodes.find(n => getNodeName(n) === 'password')
      const confirmNode = passwordNodes.find(n => getNodeName(n) === 'password_confirm')
      
      if (passwordNode) {
        passwordFieldName = getNodeName(passwordNode)
      }
      if (confirmNode) {
        passwordConfirmFieldName = getNodeName(confirmNode)
      }
    }
    
    // CRITICAL: Explicitly set password and password_confirm using Kratos field names
    // Kratos requires BOTH fields to be present and matching for password updates
    if (!password || !confirm) {
      loading.value = false
      return
    }
    
    // Ensure passwords match before sending
    if (password !== confirm) {
      passwordMismatch.value = true
      loading.value = false
      return
    }
    
    // Set password fields using the correct field names
    passwordFormData.set(passwordFieldName, password)
    passwordFormData.set(passwordConfirmFieldName, confirm)
    
    // Include ONLY csrf_token (required for CSRF protection)
    // DO NOT include profile fields - they cause Kratos to use "profile" method instead of "password"
    if (flow.value?.ui?.nodes) {
      flow.value.ui.nodes.forEach((node: UiNodeLike) => {
        const nodeName = getNodeName(node)
        const nodeType = getNodeType(node)

        // Only add csrf_token (hidden field required for security)
        if (nodeType === 'hidden' && nodeName === 'csrf_token') {
          const nodeValue = getNodeValue(node)
          if (nodeValue) {
            passwordFormData.set(nodeName, String(nodeValue))
          }
        }
      })
    }

    const payload = Object.fromEntries(passwordFormData.entries())
    const data = (await updateSettingsFlow(flow.value!.id!, payload as unknown as UpdateSettingsFlowBody)) as unknown as FlowLike
    
    // Check if settings update completed successfully
    const hasErrors = data?.ui?.messages?.some(msg => msg.type === 'error')
    
    if (!hasErrors) {
      // Check if password was successfully changed
      const hasSuccess = data?.ui?.messages?.some(msg => msg.type === 'success')
      
      if (hasSuccess || data?.state === 'success') {
        // Password reset successful - redirect to return_to if provided (e.g. from recovery), else dashboard
        const returnTo = firstQuery(route.query.return_to) || firstQuery(route.query.returnTo)
        if (returnTo) {
          window.location.href = decodeURIComponent(returnTo)
        } else {
          router.push('/dashboard?password_reset=true')
        }
      } else {
        // Update flow with new state
        flow.value = data
      }
    } else {
      // Update flow with errors
      flow.value = data
    }
  } catch (error) {
    const e = error as HttpErrorLike
    if (e.response?.status === 400) {
      flow.value = e.response.data ?? null
    } else {
      console.error('Settings error:', error)
      router.push('/error')
    }
  } finally {
    loading.value = false
  }
}
</script>
