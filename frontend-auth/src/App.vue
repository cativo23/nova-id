<template>
  <div class="min-h-screen bg-cyber-bg text-cyber-light">
    <nav class="auth-nav sticky top-0 z-40 border-b border-cyber-accent/10 bg-cyber-dark/95 backdrop-blur-md">
      <div class="auth-nav-inner">
        <div class="auth-nav-spacer" aria-hidden="true" />
        <router-link
          :to="loginNavTo"
          class="auth-nav-brand"
          aria-label="Nova ID — Sign in"
        >
          <NovaLogoIcon
            svg-class="h-7 w-7 sm:h-8 sm:w-8 shrink-0"
            gradient-id="nav-auth-icon"
            filter-id="nav-auth-glow"
          />
          <span class="auth-nav-title">Nova ID</span>
        </router-link>
        <div class="auth-nav-actions">
          <button
            v-if="isAuthenticated"
            type="button"
            @click="handleLogout"
            class="auth-nav-link auth-nav-link-btn"
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
    <main class="auth-main">
      <router-view v-slot="{ Component }">
        <Transition name="page" mode="out-in">
          <component :is="Component" :key="route.path" />
        </Transition>
      </router-view>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, provide, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import NovaLogoIcon from './components/NovaLogoIcon.vue'
import { checkSession, logout } from './composables/useAuth'

const router = useRouter()
const route = useRoute()
const isAuthenticated = ref(false)

// Preserve return_to, login_challenge (OAuth), flow in nav links so they are not lost when switching login/register
const preservedQuery = computed(() => {
  const q = {}
  if (route.query.return_to) q.return_to = route.query.return_to
  if (route.query.returnTo) q.returnTo = route.query.returnTo
  if (route.query.login_challenge) q.login_challenge = route.query.login_challenge
  if (route.query.flow) q.flow = route.query.flow
  return q
})
const loginNavTo = computed(() => ({ path: '/login', query: { ...preservedQuery.value } }))
const registrationNavTo = computed(() => ({ path: '/registration', query: { ...preservedQuery.value } }))

const refreshAuth = async () => {
  try {
    const session = await checkSession()
    isAuthenticated.value = !!session
  } catch (error) {
    isAuthenticated.value = false
  }
}

provide('refreshAuth', refreshAuth)

onMounted(async () => {
  await refreshAuth()
})

watch(() => route.path, async () => {
  await refreshAuth()
})

function getOathkeeperUrl() {
  return import.meta.env.VITE_OATHKEEPER_URL || '/api'
}

const handleLogout = async () => {
  try {
    const returnTo = window.location.origin + '/auth/login'
    const data = await logout(returnTo)
    if (data?.logout_url) {
      const base = getOathkeeperUrl()
      const apiOrigin = base.startsWith('http') ? base : (window.location.origin + (base.startsWith('/') ? base : '/' + base))
      const apiBase = apiOrigin.replace(/\/$/, '') + '/'
      window.location.href = data.logout_url.replace(/^(https?:\/\/[^/]+)\/auth\/?/, apiBase)
    } else {
      router.push('/login')
    }
  } catch {
    router.push('/login')
  }
}
</script>
