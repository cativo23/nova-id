<template>
  <div class="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 relative">
    <div class="absolute inset-0 bg-mesh-gradient pointer-events-none" aria-hidden="true" />
    <div class="relative w-full max-w-md">
      <!-- Error state -->
      <Transition name="callback">
        <div
          v-if="error"
          class="callback-error rounded-2xl border border-red-500/30 bg-red-500/10 backdrop-blur-sm px-6 py-6 shadow-xl text-left"
          role="alert"
        >
          <div class="flex items-start gap-3">
            <div class="flex shrink-0 w-10 h-10 rounded-xl bg-red-500/20 items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div class="flex-1 min-w-0">
              <h2 class="text-lg font-semibold text-red-300">Sign-in failed</h2>
              <p class="mt-1 text-sm text-red-300/90">{{ error }}</p>
              <router-link
                to="/"
                class="mt-4 inline-flex items-center gap-2 text-sm font-medium text-cyber-accent hover:text-cyber-accent/90 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cyber-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-cyber-bg rounded-lg"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Test App
              </router-link>
            </div>
          </div>
        </div>
      </Transition>
      <!-- Loading state -->
      <Transition name="callback">
        <div v-if="!error" class="flex flex-col items-center gap-6 py-10 text-center">
          <div class="relative">
            <div class="callback-spinner-dots flex gap-1.5 justify-center">
              <span class="w-2.5 h-2.5 rounded-full bg-cyber-accent" aria-hidden="true"></span>
              <span class="w-2.5 h-2.5 rounded-full bg-cyber-accent" aria-hidden="true"></span>
              <span class="w-2.5 h-2.5 rounded-full bg-cyber-accent" aria-hidden="true"></span>
            </div>
            <p class="sr-only">Completing sign-in with Nova ID…</p>
          </div>
          <div>
            <p class="text-base font-medium text-cyber-light/90">Completing sign-in…</p>
            <p class="mt-1 text-sm text-cyber-light/60">You’ll be redirected to the Test App in a moment.</p>
          </div>
          <div class="w-full max-w-[200px] h-1 rounded-full bg-cyber-dark/80 overflow-hidden" role="presentation">
            <div class="h-full w-1/3 rounded-full bg-cyber-accent/40 animate-pulse" style="animation-duration: 1.2s" />
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, inject } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { handleOAuthCallback, setStoredTokens } from '../composables/useHydraOAuth'

const router = useRouter()
const route = useRoute()
const error = ref(null)
// App.vue runs refreshAuth() at mount — BEFORE tokens are stored here — so without this
// re-run isOAuthSession stays false after the OAuth redirect, and the first Logout click
// takes the cookie-only branch (never clears the stored tokens → user re-authenticates).
const refreshAuth = inject('refreshAuth', null)

/** OAuth/OIDC: code and consent verifier are single-use. If user hit Back and landed here with "already used", treat as already signed in. */
function isAlreadyUsedError(msg) {
  if (!msg || typeof msg !== 'string') return false
  const lower = msg.toLowerCase()
  return (
    lower.includes('already been used') ||
    lower.includes('consent verifier') ||
    lower.includes('authorization code has been used') ||
    lower.includes('invalid_grant')
  )
}

onMounted(async () => {
  const code = (route.query.code && String(route.query.code).trim()) || null
  const state = (route.query.state && String(route.query.state).trim()) || null
  const oauthError = route.query.error
  const oauthErrorDesc = route.query.error_description

  if (oauthError || oauthErrorDesc) {
    const msg = oauthErrorDesc
      ? decodeURIComponent(String(oauthErrorDesc).replace(/\+/g, ' '))
      : oauthError || 'OAuth error'
    if (isAlreadyUsedError(msg)) {
      router.replace({ path: '/', query: {} })
      return
    }
    error.value = msg
    return
  }

  if (!code || !state) {
    error.value = 'Missing code or state from OAuth callback. Restart the flow from the Test App.'
    return
  }

  try {
    const tokens = await handleOAuthCallback(code, state)
    setStoredTokens(tokens)
    // Sync App.vue's auth state (isOAuthSession) now that tokens exist, so Logout works in one click.
    if (refreshAuth) await refreshAuth()
    router.replace({ path: '/', query: {} })
  } catch (err) {
    const errMsg = err.message || 'OAuth callback failed'
    if (isAlreadyUsedError(errMsg)) {
      router.replace({ path: '/', query: {} })
      return
    }
    error.value = errMsg
  }
})
</script>
