<template>
  <div class="min-h-[calc(100vh-4rem)] relative overflow-hidden">
    <!-- Unauthenticated: hero -->
    <template v-if="session === null && !sessionLoading">
      <div class="absolute inset-0 bg-mesh-gradient pointer-events-none" aria-hidden="true" />
      <div class="relative flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-4 py-16 sm:py-24">
        <div class="hero-icon-float mb-8 sm:mb-10">
          <div class="hero-glow-pulse flex items-center justify-center w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-cyber-dark/80 border border-cyber-accent/25 shadow-glow">
            <NovaLogoIcon
              svg-class="h-12 w-12 sm:h-14 sm:w-14"
              gradient-id="hero-icon"
              filter-id="hero-icon-glow"
              :glow="true"
            />
          </div>
        </div>
        <p class="hero-eyebrow text-cyber-accent text-sm font-medium uppercase tracking-widest mb-3 sm:mb-4">
          Nova ID — Test Application
        </p>
        <h1 class="hero-title text-3xl sm:text-4xl md:text-5xl font-bold text-cyber-light tracking-tight text-center max-w-2xl">
          Try OAuth2 & protected APIs in one place
        </h1>
        <p class="hero-subtitle text-cyber-light/70 text-base sm:text-lg text-center max-w-lg mt-4 sm:mt-5">
          Sign in with Nova ID to call public and protected endpoints, inspect your session, and verify roles and tokens.
        </p>
        <ul class="hero-features mt-8 sm:mt-10 flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm text-cyber-light/60 max-w-md" role="list">
          <li class="flex items-center gap-2">
            <span class="w-1.5 h-1.5 rounded-full bg-cyber-accent shrink-0" aria-hidden="true" />
            OAuth2 / OIDC login flow
          </li>
          <li class="flex items-center gap-2">
            <span class="w-1.5 h-1.5 rounded-full bg-cyber-accent shrink-0" aria-hidden="true" />
            Session & token inspection
          </li>
          <li class="flex items-center gap-2">
            <span class="w-1.5 h-1.5 rounded-full bg-cyber-accent shrink-0" aria-hidden="true" />
            Role-based API testing
          </li>
        </ul>
        <div class="hero-cta-wrap mt-10 sm:mt-12">
          <button
            type="button"
            @click="startOAuth"
            class="btn-nova-login inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl font-semibold text-base border border-cyber-accent/40 bg-cyber-accent/10 text-cyber-accent hover:bg-cyber-accent/20 hover:border-cyber-accent/60 focus:outline-none focus:ring-2 focus:ring-cyber-accent/40 focus:ring-offset-2 focus:ring-offset-cyber-bg shadow-glow"
          >
            <NovaLogoIcon
              svg-class="h-5 w-5 shrink-0"
              gradient-id="hero-cta-icon"
              filter-id="hero-cta-glow"
              :glow="true"
            />
            Sign in with Nova ID
          </button>
        </div>
      </div>
    </template>

    <!-- Authenticated: dashboard -->
    <template v-else-if="session">
      <div class="min-h-[calc(100vh-4rem)] px-4 py-8 sm:py-12">
        <div class="w-full max-w-5xl mx-auto animate-fade-in">
          <!-- Welcome & user summary -->
          <div class="mb-8 sm:mb-10">
            <h1 class="text-2xl sm:text-3xl font-bold text-cyber-light tracking-tight">
              Welcome back<span v-if="session.identity?.traits?.full_name">, {{ session.identity.traits.full_name }}</span>
            </h1>
            <p class="mt-1 text-cyber-light/60 text-sm sm:text-base">
              You’re signed in. Use the API explorer below to call protected endpoints.
            </p>
          </div>

          <div class="space-y-6 sm:space-y-8">
            <section class="bg-cyber-dark/60 border border-cyber-accent/20 rounded-2xl p-6 sm:p-8 shadow-xl shadow-black/10 backdrop-blur-sm transition-all duration-300 hover:border-cyber-accent/25 animate-fade-in-up" style="animation-delay: 0.05s" aria-labelledby="user-info-heading">
              <h2 id="user-info-heading" class="text-lg font-semibold text-cyber-accent mb-4 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-cyber-accent/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Session & identity
              </h2>
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                <div class="flex flex-col p-3 rounded-xl bg-cyber-bg/60 border border-cyber-accent/10">
                  <span class="text-cyber-light/50 text-xs uppercase tracking-wider">Email</span>
                  <span class="text-cyber-light font-medium mt-1 truncate" :title="session.identity?.traits?.email">{{ session.identity?.traits?.email }}</span>
                </div>
                <div class="flex flex-col p-3 rounded-xl bg-cyber-bg/60 border border-cyber-accent/10">
                  <span class="text-cyber-light/50 text-xs uppercase tracking-wider">Full name</span>
                  <span class="text-cyber-light font-medium mt-1">{{ session.identity?.traits?.full_name || '—' }}</span>
                </div>
                <div v-if="session.identity?.metadata_public?.role" class="flex flex-col p-3 rounded-xl bg-cyber-accent/5 border border-cyber-accent/20">
                  <span class="text-cyber-light/50 text-xs uppercase tracking-wider">Platform role</span>
                  <span class="text-cyber-accent font-semibold mt-1">{{ session.identity.metadata_public.role }}</span>
                </div>
                <div class="flex flex-col p-3 rounded-xl bg-orange-500/5 border border-orange-500/20">
                  <span class="text-cyber-light/50 text-xs uppercase tracking-wider">App role</span>
                  <span class="text-orange-400 font-semibold mt-1">{{ session.identity?.traits?.appRole || 'app_user' }}</span>
                </div>
              </div>
            </section>

            <!-- Last 3 API calls (admin only) -->
            <section
              v-if="isAdmin && (recentLogs.length > 0 || recentLogsLoading)"
              class="bg-cyber-dark/60 border border-cyber-accent/20 rounded-2xl p-6 sm:p-8 shadow-xl shadow-black/10 animate-fade-in-up"
              style="animation-delay: 0.08s"
              aria-labelledby="recent-logs-heading"
            >
              <div class="flex items-center justify-between mb-4">
                <h2 id="recent-logs-heading" class="text-lg font-semibold text-cyber-accent flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Latest API calls
                </h2>
                <router-link
                  to="/logs"
                  class="text-sm font-medium text-cyber-accent hover:text-cyber-accent/90 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cyber-accent/50 rounded"
                >
                  View all →
                </router-link>
              </div>
              <div v-if="recentLogsLoading" class="flex items-center gap-2 text-sm text-cyber-light/60 py-4">
                <span class="inline-block w-4 h-4 border-2 border-cyber-accent/40 border-t-cyber-accent rounded-full animate-spin" aria-hidden="true" />
                Loading…
              </div>
              <ul v-else-if="recentLogs.length > 0" class="space-y-2">
                <li
                  v-for="(entry, i) in recentLogs"
                  :key="entry.timestamp + entry.url + String(i)"
                  class="flex items-center gap-3 py-2 px-3 rounded-xl bg-cyber-bg/60 border border-cyber-accent/10 text-sm"
                >
                  <span
                    :class="['inline-flex px-2 py-0.5 text-[10px] font-bold uppercase rounded shrink-0', entry.method === 'GET' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400']"
                  >
                    {{ entry.method }}
                  </span>
                  <span class="font-mono text-cyber-light/90 truncate flex-1 min-w-0" :title="entry.url">{{ entry.url }}</span>
                  <span
                    :class="['inline-flex px-2 py-0.5 text-xs font-semibold rounded shrink-0', entry.statusCode >= 200 && entry.statusCode < 300 ? 'bg-emerald-500/20 text-emerald-400' : entry.statusCode >= 400 ? 'bg-amber-500/20 text-amber-400' : 'bg-cyber-accent/20 text-cyber-accent']"
                  >
                    {{ entry.statusCode }}
                  </span>
                </li>
              </ul>
              <p v-else class="text-sm text-cyber-light/50 py-2">No calls yet. Use the API explorer below.</p>
            </section>

            <section class="bg-cyber-dark/60 border border-cyber-accent/20 rounded-2xl p-6 sm:p-8 overflow-hidden shadow-xl shadow-black/10 backdrop-blur-sm animate-fade-in-up" style="animation-delay: 0.1s" aria-labelledby="api-explorer-heading">
              <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
                <div>
                  <h2 id="api-explorer-heading" class="text-lg font-semibold text-cyber-accent flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-cyber-accent/80 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    API explorer
                  </h2>
                  <p class="text-cyber-light/60 text-sm mt-1 max-w-xl">
                    Call protected and public endpoints. Responses appear below.
                  </p>
                </div>
                <div class="flex flex-wrap items-center gap-3 text-xs shrink-0">
                  <span class="flex items-center gap-1.5 text-cyber-light/70">
                    <span class="w-2 h-2 rounded-full bg-green-400" aria-hidden="true"></span> Public
                  </span>
                  <span class="flex items-center gap-1.5 text-cyber-light/70">
                    <span class="w-2 h-2 rounded-full bg-blue-400" aria-hidden="true"></span> Auth
                  </span>
                  <span class="flex items-center gap-1.5 text-cyber-light/70">
                    <span class="w-2 h-2 rounded-full bg-purple-400" aria-hidden="true"></span> Platform Admin
                  </span>
                  <span class="flex items-center gap-1.5 text-cyber-light/70">
                    <span class="w-2 h-2 rounded-full bg-orange-400" aria-hidden="true"></span> App Admin
                  </span>
                </div>
              </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
                  <div
                    v-for="ep in endpoints"
                    :key="ep.key"
                    :class="[
                      'endpoint-card rounded-xl border p-4 transition-all duration-200 flex flex-col hover:shadow-lg hover:scale-[1.02] active:scale-[0.99]',
                      ep.borderClass,
                      lastTested === ep.key && !apiError ? 'ring-2 ring-green-400/50 api-success-pulse' : '',
                      lastTested === ep.key && apiError ? 'ring-2 ring-red-400/50' : ''
                    ]"
                  >
                    <div class="flex items-center justify-between mb-2">
                      <span
                        :class="['text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded', ep.method === 'GET' ? 'bg-cyber-accent/20 text-cyber-accent' : 'bg-amber-500/20 text-amber-400']"
                      >
                        {{ ep.method }}
                      </span>
                      <span :class="['w-1.5 h-1.5 rounded-full', ep.level === 'public' ? 'bg-green-400' : ep.level === 'auth' ? 'bg-blue-400' : ep.level === 'app-admin' ? 'bg-orange-400' : 'bg-purple-400']" :title="ep.level"></span>
                    </div>
                    <code class="text-xs text-cyber-light/90 font-mono break-all mb-3">{{ ep.path }}</code>
                    <button
                      type="button"
                      @click="runTest(ep)"
                      :disabled="loadingKey !== null && loadingKey !== ep.key"
                      :class="[
                        'mt-auto w-full py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-200',
                        loadingKey === ep.key ? 'bg-cyber-accent/30 text-cyber-accent cursor-wait' : ep.btnClass,
                        (loadingKey !== null && loadingKey !== ep.key) ? 'opacity-50 cursor-not-allowed' : ''
                      ]"
                    >
                      <svg v-if="loadingKey === ep.key" class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <svg v-else class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      {{ loadingKey === ep.key ? 'Calling…' : 'Try' }}
                    </button>
                  </div>
                </div>

                <Transition name="response">
                  <div
                    v-if="apiResponse"
                    class="mt-6 p-4 rounded-xl border border-green-500/30 bg-green-500/5"
                  >
                    <div class="flex items-center justify-between mb-2">
                      <h4 class="text-sm font-semibold text-green-400 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Response
                      </h4>
                      <span class="text-xs text-cyber-light/50 font-mono">{{ lastMethod }} {{ lastEndpoint }}</span>
                    </div>
                    <pre class="bg-cyber-dark/80 p-4 rounded-lg border border-cyber-accent/10 text-xs text-cyber-light overflow-auto max-h-72 font-mono">{{ JSON.stringify(apiResponse, null, 2) }}</pre>
                    <div v-if="apiResponse.user" class="mt-3 flex flex-wrap gap-4 text-xs">
                      <span class="text-cyber-light/60">ID <span class="font-mono text-cyber-accent">{{ apiResponse.user.id }}</span></span>
                      <span class="text-cyber-light/60">Email <span class="font-mono text-cyber-accent">{{ apiResponse.user.email }}</span></span>
                      <span v-if="apiResponse.user.role" class="text-cyber-light/60">Platform role <span class="font-mono text-cyber-accent">{{ apiResponse.user.role }}</span></span>
                      <span v-if="apiResponse.user.appRole" class="text-cyber-light/60">App role <span class="font-mono text-orange-400">{{ apiResponse.user.appRole }}</span></span>
                    </div>
                  </div>
                </Transition>

                <Transition name="error">
                  <div
                    v-if="apiError"
                    class="api-error-shake mt-6 p-4 rounded-xl border border-red-500/40 bg-red-500/10"
                    role="alert"
                  >
                    <h4 class="text-sm font-semibold text-red-400 flex items-center gap-2 mb-1">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Error
                    </h4>
                    <p class="text-red-300/90 text-sm">{{ apiError }}</p>
                  </div>
                </Transition>
              </section>

            <!-- Debug (solo dev o ?debug=1) -->
            <section
              v-if="showDebug"
              class="bg-cyber-dark/60 border border-cyber-accent/10 rounded-2xl p-6 sm:p-8 overflow-hidden animate-fade-in-up"
              style="animation-delay: 0.15s"
              aria-labelledby="debug-heading"
            >
              <h2 id="debug-heading" class="text-lg font-semibold text-cyber-light/80 mb-4 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                Debug (session)
              </h2>
              <div class="space-y-4 text-sm">
                <div v-if="session" class="rounded-xl bg-cyber-bg/80 border border-cyber-accent/10 p-4 overflow-auto max-h-48">
                  <p class="text-xs text-cyber-light/50 mb-2 uppercase tracking-wider">Kratos session identity</p>
                  <pre class="text-xs font-mono text-cyber-light/90 whitespace-pre-wrap break-all">{{ JSON.stringify(session?.identity, null, 2) }}</pre>
                </div>
                <p v-else class="text-cyber-light/50 text-xs">No active session. Sign in with Nova ID to inspect identity claims.</p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </template>

    <!-- Loading -->
    <div v-else class="flex items-center justify-center min-h-[calc(100vh-4rem)] px-4">
      <div class="flex flex-col items-center gap-4">
        <div class="callback-spinner-dots flex gap-1.5">
          <span class="w-2 h-2 rounded-full bg-cyber-accent"></span>
          <span class="w-2 h-2 rounded-full bg-cyber-accent"></span>
          <span class="w-2 h-2 rounded-full bg-cyber-accent"></span>
        </div>
        <p class="text-sm font-medium text-cyber-light/70">Checking session…</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, inject, type Ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import NovaLogoIcon from '../components/NovaLogoIcon.vue'
import { checkSession } from '../composables/useAuth'
import { initiateOAuthFlow } from '../composables/useHydraOAuth'
import { getApiTestBaseUrl } from '../composables/useApiTest'
import type { DemoUser, MeResponse, LogEntry } from '../types'

/** A demo session shape derived from /api-test/me (mirrors the bits Home reads). */
interface DemoSession {
  identity: {
    id?: string
    traits?: { email?: string; full_name?: string; appRole?: string | null }
    metadata_public?: { role?: string | null } | null
  }
}

/** An API explorer endpoint card. */
interface Endpoint {
  key: string
  method: string
  path: string
  level: 'public' | 'auth' | 'admin' | 'app-admin'
  borderClass: string
  btnClass: string
}

const router = useRouter()
const route = useRoute()
const session = ref<DemoSession | null>(null)
const sessionLoading = ref(true)
const apiResponse = ref<({ user?: DemoUser } & Record<string, unknown>) | null>(null)
const apiError = ref<string | null>(null)
const loadingKey = ref<string | null>(null)
const lastTested = ref<string | null>(null)
const lastEndpoint = ref('')
const lastMethod = ref('')
const recentLogs = ref<LogEntry[]>([])
const recentLogsLoading = ref(false)
const userFromMe = inject<Ref<DemoUser | null> | null>('userFromMe', null)

const isAdmin = computed(() => {
  const s = session.value
  if (!s?.identity) return false
  // Logs are app-domain; app_admin (SQLite) is the sole gate (ADR-0003).
  // platform_admin alone does NOT grant log access.
  return s.identity.traits?.appRole === 'app_admin'
})

const showDebug = computed(() => {
  if (import.meta.env.DEV) return true
  return route.query.debug === '1' || route.query.debug === 'true'
})

const appUrl = import.meta.env.VITE_APP_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5175')
const oauthClientId = import.meta.env.VITE_NOVA_ID_CLIENT_ID || 'nova-id-test-app'
const oauthRedirectUri = `${appUrl}/callback`

const endpoints: Endpoint[] = [
  { key: 'GET:/api-test/health', method: 'GET', path: '/api-test/health', level: 'public', borderClass: 'border-green-500/30 bg-green-500/5', btnClass: 'bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/40' },
  { key: 'GET:/api-test/public', method: 'GET', path: '/api-test/public', level: 'public', borderClass: 'border-green-500/30 bg-green-500/5', btnClass: 'bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/40' },
  { key: 'GET:/api-test/nova-id-session', method: 'GET', path: '/api-test/nova-id-session', level: 'auth', borderClass: 'border-cyber-accent/30 bg-cyber-accent/5', btnClass: 'bg-cyber-accent/20 text-cyber-accent hover:bg-cyber-accent/30 border border-cyber-accent/40' },
  { key: 'GET:/api-test/protected', method: 'GET', path: '/api-test/protected', level: 'auth', borderClass: 'border-blue-500/30 bg-blue-500/5', btnClass: 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-500/40' },
  { key: 'GET:/api-test/user-demo', method: 'GET', path: '/api-test/user-demo', level: 'auth', borderClass: 'border-blue-500/30 bg-blue-500/5', btnClass: 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-500/40' },
  { key: 'GET:/api-test/me', method: 'GET', path: '/api-test/me', level: 'auth', borderClass: 'border-blue-500/30 bg-blue-500/5', btnClass: 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-500/40' },
  { key: 'POST:/api-test/data', method: 'POST', path: '/api-test/data', level: 'auth', borderClass: 'border-cyber-accent/30 bg-cyber-accent/5', btnClass: 'bg-cyber-accent/20 text-cyber-accent hover:bg-cyber-accent/30 border border-cyber-accent/40' },
  { key: 'GET:/api-test/admin-demo', method: 'GET', path: '/api-test/admin-demo', level: 'admin', borderClass: 'border-purple-500/30 bg-purple-500/5', btnClass: 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 border border-purple-500/40' },
  // App Roles endpoints
  { key: 'GET:/api-test/roles/my-role', method: 'GET', path: '/api-test/roles/my-role', level: 'auth', borderClass: 'border-blue-500/30 bg-blue-500/5', btnClass: 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-500/40' },
  { key: 'GET:/api-test/app-user-data', method: 'GET', path: '/api-test/app-user-data', level: 'auth', borderClass: 'border-blue-500/30 bg-blue-500/5', btnClass: 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-500/40' },
  { key: 'POST:/api-test/app-user-data', method: 'POST', path: '/api-test/app-user-data', level: 'auth', borderClass: 'border-cyber-accent/30 bg-cyber-accent/5', btnClass: 'bg-cyber-accent/20 text-cyber-accent hover:bg-cyber-accent/30 border border-cyber-accent/40' },
  { key: 'GET:/api-test/app-admin-only', method: 'GET', path: '/api-test/app-admin-only', level: 'app-admin', borderClass: 'border-orange-500/30 bg-orange-500/5', btnClass: 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 border border-orange-500/40' },
  { key: 'POST:/api-test/app-admin/configure', method: 'POST', path: '/api-test/app-admin/configure', level: 'app-admin', borderClass: 'border-orange-500/30 bg-orange-500/5', btnClass: 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 border border-orange-500/40' }
]

async function sessionFromApiMe(): Promise<DemoSession | null> {
  const url = `${getApiTestBaseUrl()}/me`
  try {
    const res = await fetch(url, { credentials: 'include' })
    if (!res.ok) return null
    const me = await res.json() as MeResponse
    const u: DemoUser = me.user ?? (me as unknown as DemoUser)
    if (!u?.id) return null
    return {
      identity: {
        id: u.id,
        traits: {
          email: u.email ?? '',
          full_name: u.full_name ?? u.name ?? '',
          appRole: u.appRole ?? null
        },
        metadata_public: {
          role: u.role ?? null
        }
      }
    }
  } catch {
    return null
  }
}

async function loadRecentLogs() {
  if (!isAdmin.value) return
  recentLogsLoading.value = true
  try {
    const baseUrl = getApiTestBaseUrl()
    const opts: RequestInit = {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-Frontend-Source': 'frontend-app' },
    }
    const res = await fetch(`${baseUrl}/logs?limit=3`, opts)
    if (res.ok) recentLogs.value = await res.json() as LogEntry[]
    else recentLogs.value = []
  } catch {
    recentLogs.value = []
  } finally {
    recentLogsLoading.value = false
  }
}

onMounted(async () => {
  try {
    // Always use the cookie session through the gateway (ADR-0002).
    // App.vue's refreshAuth() is running concurrently; we read /api-test/me ourselves
    // so Home has the full user shape (id, email, appRole) for the dashboard.
    const meSession = await sessionFromApiMe()
    if (meSession) {
      session.value = meSession
      if (isAdmin.value) loadRecentLogs()
      return
    }
    const sessionData = await checkSession()
    session.value = sessionData?.identity
      ? {
          identity: {
            id: sessionData.identity.id,
            traits: (sessionData.identity.traits ?? {}) as DemoSession['identity']['traits'],
            metadata_public: (sessionData.identity.metadata_public ?? null) as DemoSession['identity']['metadata_public']
          }
        }
      : null
    if (isAdmin.value) loadRecentLogs()
  } catch {
    session.value = null
  } finally {
    sessionLoading.value = false
  }
})

// Enrich session with full_name and role/appRole when App finishes loading /me; load logs if admin
watch(
  () => (userFromMe && typeof userFromMe === 'object' && 'value' in userFromMe ? userFromMe.value : null),
  (user: DemoUser | null) => {
    if (!user || !session.value?.identity?.traits) return
    const traits = session.value.identity.traits
    if (user.email) traits.email = user.email
    if (user.full_name || user.name) traits.full_name = user.full_name ?? user.name ?? traits.full_name ?? ''
    // role lives in metadata_public, not user-editable traits
    if (user.role != null) {
      const meta = session.value.identity.metadata_public ?? {}
      meta.role = user.role
      session.value.identity.metadata_public = meta
    }
    traits.appRole = user.appRole ?? traits.appRole ?? 'app_user'
    // app_admin (SQLite) is the sole gate — platform_admin alone is not sufficient (ADR-0003)
    const isUserAdmin = user.appRole === 'app_admin'
    if (isUserAdmin && recentLogs.value.length === 0 && !recentLogsLoading.value) loadRecentLogs()
  },
  { immediate: true }
)

async function startOAuth() {
  try {
    await initiateOAuthFlow(oauthClientId, oauthRedirectUri)
  } catch (err) {
    apiError.value = (err instanceof Error ? err.message : '') || 'Failed to start Login with Nova ID'
  }
}

async function runTest(ep: Endpoint) {
  loadingKey.value = ep.key
  lastTested.value = ep.key
  apiError.value = null
  apiResponse.value = null
  lastEndpoint.value = ep.path
  lastMethod.value = ep.method

  try {
    // Test API lives at /api-test/* (use getApiTestBaseUrl, not Oathkeeper /api)
    const url = ep.path.startsWith('/api-test') ? `${getApiTestBaseUrl()}${ep.path.replace(/^\/api-test/, '')}` : ep.path
    const isSimpleGet = ep.method === 'GET' && (ep.path === '/api-test/health' || ep.path === '/api-test/public')
    // Always use the Kratos cookie session; the gateway's api-test rule accepts cookie_session (ADR-0002).
    const headers: Record<string, string> = {}
    const options: RequestInit = {
      method: ep.method,
      credentials: 'include',
      headers
    }
    if (!isSimpleGet) {
      headers['Content-Type'] = 'application/json'
      headers['X-Frontend-Source'] = 'frontend-app'
    }
    if (ep.method === 'POST' || ep.method === 'PUT') {
      options.body = JSON.stringify({ timestamp: new Date().toISOString(), source: 'frontend-app' })
    }

    const response = await fetch(url, options)
    if (!response.ok) {
      const errorText = import.meta.env.DEV
        ? await response.text().catch(() => response.statusText)
        : null
      const detail = errorText ? ` - ${errorText}` : ''
      throw new Error(`API request failed: ${response.status} ${response.statusText}${detail}`)
    }
    apiResponse.value = await response.json()
  } catch (err) {
    apiError.value = (err instanceof Error ? err.message : '') || 'Failed to call API'
  } finally {
    loadingKey.value = null
  }
}
</script>
