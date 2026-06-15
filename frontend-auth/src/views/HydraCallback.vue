<template>
  <div class="min-h-[calc(100vh-4rem)] relative overflow-hidden">
    <div class="absolute inset-0 bg-mesh-gradient pointer-events-none" aria-hidden="true" />
    <div class="relative flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
      <div class="w-full max-w-md text-center">
        <div v-if="error" class="rounded-2xl border border-red-500/30 bg-red-500/10 backdrop-blur-sm p-6 shadow-xl text-left">
          <div class="flex items-start gap-3">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/20">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div class="min-w-0 flex-1">
              <p class="font-semibold text-red-300">Could not complete sign in</p>
              <p class="mt-1 text-sm text-red-300/90">{{ error }}</p>
              <router-link to="/login" class="mt-4 inline-flex items-center gap-2 text-sm font-medium text-cyber-accent hover:text-cyber-accent/90 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to sign in
              </router-link>
            </div>
          </div>
        </div>
        <div v-else class="flex flex-col items-center gap-4 py-8">
          <div class="callback-spinner-dots flex gap-1.5">
            <span class="h-2.5 w-2.5 rounded-full bg-cyber-accent" />
            <span class="h-2.5 w-2.5 rounded-full bg-cyber-accent" />
            <span class="h-2.5 w-2.5 rounded-full bg-cyber-accent" />
          </div>
          <p class="text-sm font-medium text-cyber-light/90">Completing sign in…</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { acceptHydraLogin } from '@nova-id/api-client'

const route = useRoute()
const error = ref<string | null>(null)

onMounted(async () => {
  const loginChallenge = route.query.login_challenge
  if (!loginChallenge) {
    error.value = 'Missing login challenge'
    return
  }

  try {
    // The generated client posts to /hydra-accept-login through the shared axios
    // mutator (baseURL '/api', withCredentials). The BFF body is the login challenge;
    // the OpenAPI spec leaves it undocumented, so the generated fn takes no body
    // param — we pass it via the request `data` option. The generated return type
    // is `void` (response body undocumented), but the BFF returns { redirect_to },
    // so we cast the resolved value to read it.
    const data = (await acceptHydraLogin({
      data: { login_challenge: loginChallenge },
    })) as { redirect_to?: string } | undefined
    if (data?.redirect_to) {
      window.location.href = data.redirect_to
      return
    }
    error.value = 'No redirect URL returned'
  } catch (err) {
    const e = err as { response?: { data?: { message?: string; error?: { message?: string } }; status?: number }; message?: string }
    error.value =
      e.response?.data?.message ||
      e.response?.data?.error?.message ||
      e.message ||
      'Failed to complete sign in'
  }
})
</script>
