<template>
  <div class="auth-page min-h-[calc(100vh-3.5rem)] relative overflow-hidden">
    <div class="absolute inset-0 bg-mesh-gradient pointer-events-none" aria-hidden="true" />
    <div class="relative flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4 py-10 sm:py-12">
      <div class="w-full max-w-[28rem]">
        <div class="auth-card">
        <h1 class="mb-6 text-center text-xl font-semibold text-cyber-light">Authorize application</h1>
        
        <div v-if="loading" class="py-8 text-center">
          <p class="text-sm text-cyber-light/70">Checking consent...</p>
        </div>
        <div v-else-if="consentChallenge" class="space-y-6">
          <div class="rounded-lg border border-cyber-accent/15 bg-cyber-bg/80 p-5">
            <h2 class="text-base font-semibold text-cyber-accent mb-3">Application requesting access</h2>
            <div class="space-y-2 text-sm">
              <div v-if="consentInfo?.client?.client_name">
                <span class="text-cyber-light/70">Application:</span>
                <span class="ml-2 text-cyber-light font-medium">{{ consentInfo.client.client_name }}</span>
              </div>
              <div v-if="consentInfo?.requested_scope">
                <span class="text-cyber-light/70">Requested Scopes:</span>
                <ul class="mt-2 space-y-1">
                  <li
                    v-for="scope in consentInfo.requested_scope"
                    :key="scope"
                    class="text-cyber-light ml-4"
                  >
                    • {{ scope }}
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div class="flex gap-3">
            <button
              @click="acceptConsent"
              :disabled="processing"
              class="btn-primary flex-1"
            >
              {{ processing ? 'Processing…' : 'Allow' }}
            </button>
            <button
              @click="rejectConsent"
              :disabled="processing"
              class="btn-danger flex-1"
            >
              Deny
            </button>
          </div>
        </div>

        <div v-else class="py-8 text-center">
          <p class="mb-4 text-sm text-cyber-light/70">No consent challenge found.</p>
          <router-link to="/login" class="btn-primary">
            Back to sign in
          </router-link>
        </div>

        <div v-if="error" class="alert-error mt-4">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 shrink-0 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p class="text-sm text-red-300">{{ error }}</p>
        </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { acceptHydraConsent } from '@nova-id/api-client'
import { logger, errMessage } from '../utils/logger'

interface ConsentInfo {
  skip?: boolean
  requested_scope?: string[]
  client?: { client_name?: string }
  [key: string]: unknown
}

const route = useRoute()
const router = useRouter()

const consentChallenge = ref<string | null>(null)
const consentInfo = ref<ConsentInfo | null>(null)
const processing = ref(false)
const error = ref<string | null>(null)
const loading = ref(true) // Track loading state to prevent UI flash

onMounted(async () => {
  const challenge = Array.isArray(route.query.consent_challenge)
    ? route.query.consent_challenge[0]
    : route.query.consent_challenge
  if (!challenge) {
    error.value = 'Missing consent challenge'
    loading.value = false
    return
  }

  consentChallenge.value = challenge

  try {
    // Get consent request info via BFF endpoint (same-origin, cookie_session via Oathkeeper)
    const response = await fetch(`/api/v1/hydra-consent-info?consent_challenge=${encodeURIComponent(challenge)}`, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' }
    })

    if (!response.ok) {
      throw new Error(`Failed to get consent info: ${response.statusText}`)
    }

    consentInfo.value = await response.json()

    // When skip is true, Hydra has already remembered consent for this user+client+scopes.
    // Per Hydra: do not show the consent UI; complete the flow by calling accept.
    if (consentInfo.value?.skip) {
      // Don't set loading to false - we'll redirect immediately
      await acceptConsent()
      return
    }

    // Only show UI if skip is false
    loading.value = false
  } catch (err) {
    error.value = (err as Error).message || 'Failed to load consent information'
    logger.error('Error loading consent info:', errMessage(err))
    loading.value = false
  }
})

const acceptConsent = async () => {
  if (!consentChallenge.value) {
    error.value = 'Missing consent challenge'
    return
  }
  processing.value = true
  error.value = null
  // Call our API (via the generated client → shared axios mutator, baseURL '/api',
  // withCredentials) so session { email, role } is taken from Oathkeeper headers
  // (cookie_session) and sent to Hydra; then introspection will return them for
  // token-only requests. The fn now takes the typed AcceptHydraConsentDto directly
  // and resolves to { redirect_to }.
  try {
    const result = await acceptHydraConsent({
      consent_challenge: consentChallenge.value,
      grant_scope: consentInfo.value?.requested_scope ?? [],
    })

    if (result?.redirect_to) {
      window.location.href = result.redirect_to
    } else {
      error.value = 'No redirect URL in response'
      processing.value = false
    }
  } catch (err) {
    const e = err as { response?: { data?: { message?: string } }; message?: string }
    error.value = e.response?.data?.message || e.message || 'Failed to accept consent'
    logger.error('Error accepting consent:', errMessage(err))
    processing.value = false
  }
}

const rejectConsent = async () => {
  processing.value = true
  error.value = null

  try {
    // Reject the consent via BFF endpoint (same-origin, cookie_session via Oathkeeper)
    const response = await fetch(`/api/v1/hydra-reject-consent`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        consent_challenge: consentChallenge.value ?? '',
        error_description: 'The user denied the request',
      }),
    })

    if (!response.ok) {
      throw new Error(`Failed to reject consent: ${response.statusText}`)
    }

    const result = await response.json()

    // Redirect to the redirect_uri
    if (result.redirect_to) {
      window.location.href = result.redirect_to
    } else {
      router.push('/dashboard')
    }
  } catch (err) {
    error.value = (err as Error).message || 'Failed to reject consent'
    logger.error('Error rejecting consent:', errMessage(err))
  } finally {
    processing.value = false
  }
}
</script>
