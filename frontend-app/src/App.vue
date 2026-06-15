<template>
  <div class="min-h-screen bg-cyber-bg text-cyber-light flex flex-col">
    <header class="sticky top-0 z-40 shrink-0">
      <nav
        class="bg-cyber-dark/95 border-b border-cyber-accent/10 backdrop-blur-xl shadow-lg shadow-black/20 transition-all duration-300"
        aria-label="Main navigation"
      >
        <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between h-14 sm:h-16 items-center">
            <router-link
              to="/"
              class="flex items-center gap-2.5 py-2 px-2 -ml-2 rounded-xl transition-all duration-200 hover:opacity-95 hover:bg-cyber-accent/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyber-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-cyber-bg"
              aria-label="Home — Nova ID Test App"
            >
              <NovaLogoIcon
                svg-class="h-7 w-7 sm:h-8 sm:w-8 shrink-0"
                gradient-id="nav-app-icon"
                filter-id="nav-app-glow"
              />
              <span class="text-base sm:text-lg font-semibold text-cyber-light hidden sm:inline tracking-tight">Nova ID Test App</span>
            </router-link>
            <div class="flex items-center gap-1 sm:gap-2">
              <router-link
                to="/"
                active-class="!text-cyber-accent !bg-cyber-accent/10 !border-cyber-accent/30"
                class="nav-link px-3 py-2.5 rounded-xl text-sm font-medium text-cyber-light/80 border border-transparent hover:text-cyber-accent hover:bg-cyber-accent/10 hover:border-cyber-accent/20 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyber-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-cyber-bg"
              >
                Home
              </router-link>
              <router-link
                to="/about"
                active-class="!text-cyber-accent !bg-cyber-accent/10 !border-cyber-accent/30"
                class="nav-link px-3 py-2.5 rounded-xl text-sm font-medium text-cyber-light/80 border border-transparent hover:text-cyber-accent hover:bg-cyber-accent/10 hover:border-cyber-accent/20 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyber-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-cyber-bg"
              >
                About
              </router-link>
              <router-link
                to="/architecture"
                active-class="!text-cyber-accent !bg-cyber-accent/10 !border-cyber-accent/30"
                class="nav-link px-3 py-2.5 rounded-xl text-sm font-medium text-cyber-light/80 border border-transparent hover:text-cyber-accent hover:bg-cyber-accent/10 hover:border-cyber-accent/20 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyber-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-cyber-bg"
              >
                <span class="hidden sm:inline">Architecture</span>
                <span class="sm:hidden">Arch</span>
              </router-link>
              <router-link
                v-if="isAuthenticated && isAppAdmin"
                to="/logs"
                active-class="!text-cyber-accent !bg-cyber-accent/10 !border-cyber-accent/30"
                class="nav-link px-3 py-2.5 rounded-xl text-sm font-medium text-cyber-light/80 border border-transparent hover:text-cyber-accent hover:bg-cyber-accent/10 hover:border-cyber-accent/20 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyber-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-cyber-bg"
              >
                <span class="hidden sm:inline">Access logs</span>
                <span class="sm:hidden">Logs</span>
              </router-link>
              <button
                v-if="!isAuthenticated"
                type="button"
                @click="startOAuth"
                class="btn-nova-login inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-semibold border border-cyber-accent/40 bg-cyber-accent/10 text-cyber-accent hover:bg-cyber-accent/20 hover:border-cyber-accent/60 focus:outline-none focus:ring-2 focus:ring-cyber-accent/40 focus:ring-offset-2 focus:ring-offset-cyber-bg"
              >
                <NovaLogoIcon
                  svg-class="h-4 w-4 shrink-0"
                  gradient-id="nav-btn-icon"
                  filter-id="nav-btn-glow"
                />
                Sign in with Nova ID
              </button>
              <button
                v-else
                type="button"
                @click="handleLogout"
                class="nav-link px-3 py-2.5 rounded-xl text-sm font-medium text-cyber-light/80 hover:text-cyber-accent hover:bg-cyber-accent/10 transition-all duration-200 border border-transparent hover:border-cyber-accent/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyber-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-cyber-bg"
              >
                Log out
              </button>
            </div>
          </div>
        </div>
      </nav>
    </header>
    <main class="relative flex-1">
      <router-view v-slot="{ Component }">
        <Transition name="page" mode="out-in">
          <component :is="Component" :key="route.path" />
        </Transition>
      </router-view>
    </main>
    <footer class="shrink-0 border-t border-cyber-accent/10 bg-cyber-dark/50 mt-auto">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div class="flex flex-wrap items-center gap-x-6 gap-y-2">
            <div class="flex items-center gap-2">
              <NovaLogoIcon svg-class="h-5 w-5 text-cyber-accent/80" gradient-id="footer-icon" filter-id="footer-glow" />
              <span class="text-sm text-cyber-light/60">Nova ID Test Application</span>
            </div>
            <div class="flex items-center gap-2 text-xs" :class="apiHealth === 'ok' ? 'text-green-400/90' : apiHealth === 'error' ? 'text-red-400/90' : 'text-cyber-light/40'">
              <span
                class="w-2 h-2 rounded-full shrink-0"
                :class="apiHealth === 'ok' ? 'bg-green-400' : apiHealth === 'error' ? 'bg-red-400' : 'bg-cyber-light/30'"
                aria-hidden="true"
              />
              <span>{{ apiHealth === 'ok' ? 'API: OK' : apiHealth === 'error' ? 'API: Error' : 'API: …' }}</span>
            </div>
          </div>
          <p class="text-xs text-cyber-light/40 sm:text-right max-w-md">
            Try OAuth2/OIDC login, protected APIs, and session verification. For development and integration testing.
          </p>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, onMounted, provide } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import NovaLogoIcon from './components/NovaLogoIcon.vue'
import { checkSession, logout } from './composables/useAuth'
import { initiateOAuthFlow } from './composables/useHydraOAuth'
import { getApiTestBaseUrl } from './composables/useApiTest'

const router = useRouter()
const route = useRoute()
const isAuthenticated = ref(false)
const isPlatformAdmin = ref(false)
const isAppAdmin = ref(false)
const userEmail = ref('')
const userFromMe = ref(null) // resultado de /me para que Home no repita la llamada
const apiHealth = ref(null) // 'ok' | 'error' | null

function getOathkeeperUrl() {
  return import.meta.env.VITE_OATHKEEPER_URL || '/api'
}
const appUrl = import.meta.env.VITE_APP_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5175')
const oauthClientId = import.meta.env.VITE_NOVA_ID_CLIENT_ID || 'nova-id-test-app'
const oauthRedirectUri = `${appUrl}/callback`

const refreshAuth = async () => {
  isAuthenticated.value = false
  userEmail.value = ''
  userFromMe.value = null
  try {
    // The gateway honors the Kratos cookie session; /api-test/me returns the
    // resolved user incl. appRole from the demo SQLite store (ADR-0002).
    const res = await fetch(`${getApiTestBaseUrl()}/me`, { credentials: 'include' })
    if (res.ok) {
      const me = await res.json()
      const user = me?.user || me
      isAuthenticated.value = true
      userFromMe.value = user || null
      userEmail.value = user?.email || ''
      isPlatformAdmin.value = user?.role === 'platform_admin'
      isAppAdmin.value = user?.appRole === 'app_admin'
      return
    }
  } catch {}
  // Fall back to a bare session check (covers logged-in-but-not-yet-provisioned).
  try {
    const session = await checkSession()
    isAuthenticated.value = !!session
    userEmail.value = session?.identity?.traits?.email || ''
    isPlatformAdmin.value = session?.identity?.metadata_public?.role === 'platform_admin'
    isAppAdmin.value = false
  } catch {
    isAuthenticated.value = false
    userEmail.value = ''
    isPlatformAdmin.value = false
    isAppAdmin.value = false
  }
}

async function checkApiHealth() {
  try {
    const res = await fetch(`${getApiTestBaseUrl()}/health`, { credentials: 'omit' })
    apiHealth.value = res.ok ? 'ok' : 'error'
  } catch {
    apiHealth.value = 'error'
  }
}

provide('refreshAuth', refreshAuth)
provide('userFromMe', userFromMe)

onMounted(() => {
  refreshAuth()
  checkApiHealth()
})

function startOAuth() {
  initiateOAuthFlow(oauthClientId, oauthRedirectUri)
}

const handleLogout = async () => {
  try {
    const returnTo = window.location.origin + '/'
    const data = await logout(returnTo)
    if (data?.logout_url) {
      const base = getOathkeeperUrl()
      const apiOrigin = base.startsWith('http') ? base : (window.location.origin + base)
      const apiBase = apiOrigin.replace(/\/$/, '') + '/'
      window.location.href = data.logout_url.replace(/^(https?:\/\/[^/]+)\/auth\/?/, apiBase)
      return
    }
  } catch {}
  isAuthenticated.value = false
  window.location.href = '/'
}
</script>
