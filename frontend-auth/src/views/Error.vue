<template>
  <div class="auth-page min-h-[calc(100vh-3.5rem)] relative overflow-hidden">
    <div class="absolute inset-0 bg-mesh-gradient pointer-events-none" aria-hidden="true" />
    <div class="relative flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4 py-10 sm:py-12">
      <div class="w-full max-w-[28rem]">
        <div class="auth-card text-center animate-fade-in-up">
          <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 border border-red-500/20">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 class="text-lg font-semibold text-red-300">
            {{ isVerificationRequired ? 'Email not verified' : 'Error' }}
          </h1>
          <p class="mt-2 mb-6 text-sm text-cyber-light/65">
            {{ displayMessage }}
          </p>
        <div class="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <template v-if="isVerificationRequired">
            <router-link
              :to="verificationLink"
              class="btn-primary order-2 sm:order-1"
            >
              Resend verification email
            </router-link>
            <router-link
              to="/login"
              class="btn-secondary order-1 sm:order-2"
            >
              Back to sign in
            </router-link>
          </template>
          <template v-else>
            <router-link
              to="/login"
              class="btn-primary"
            >
              Back to sign in
            </router-link>
            <router-link
              :to="verificationLink"
              class="btn-secondary"
            >
              Verify email
            </router-link>
          </template>
        </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import type { LocationQueryValue } from 'vue-router'
import { getFlowError } from '../composables/useAuth'

const route = useRoute()
const errorMessage = ref('')
const errorId = ref<string | null>(null)
const loaded = ref(false)

/** Kratos query params may be string | string[] | null — normalize to a single string. */
function firstQuery(v: LocationQueryValue | LocationQueryValue[]): string | undefined {
  const val = Array.isArray(v) ? v[0] : v
  return val ?? undefined
}

const isVerificationRequired = computed(() => {
  if (errorId.value === 'session_verified_address_required') return true
  const msg = (errorMessage.value || '').toLowerCase()
  return msg.includes('not verified') || msg.includes('no verificad') || msg.includes('email or phone address') || msg.includes('correo o teléfono')
})

const displayMessage = computed(() => {
  if (errorMessage.value) return errorMessage.value
  if (isVerificationRequired.value) {
    return 'Your account requires email verification. Check your inbox or request a new verification email.'
  }
  return 'Something went wrong. If you need to verify your email, use the button below.'
})

const verificationLink = computed(() => {
  const q = firstQuery(route.query.return_to) || firstQuery(route.query.returnTo)
  return q ? { path: '/verification', query: { return_to: q } } : { path: '/verification' }
})

onMounted(async () => {
  const fromQuery = firstQuery(route.query.error) || firstQuery(route.query.message) || firstQuery(route.query.reason)
  if (fromQuery) {
    try {
      errorMessage.value = decodeURIComponent(fromQuery)
    } catch {
      errorMessage.value = fromQuery
    }
  }

  const id = firstQuery(route.query.id)
  if (id) {
    errorId.value = id
    try {
      const flow = await getFlowError(id)
      const err = (flow?.error ?? flow) as { id?: string; message?: string; reason?: string }
      if (err?.id) errorId.value = err.id
      if (err?.message) {
        errorMessage.value = err.message
      } else if (err?.reason) {
        errorMessage.value = err.reason
      }
    } catch {
      // keep query id as fallback
    } finally {
      loaded.value = true
    }
  } else {
    loaded.value = true
  }

  const errId = firstQuery(route.query.error_id)
  if (errId) {
    errorId.value = errId
  }
})
</script>
