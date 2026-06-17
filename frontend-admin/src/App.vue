<template>
  <div class="min-h-screen bg-cyber-bg text-cyber-light">
    <!-- Global error (uncaught in event handlers) -->
    <div v-if="globalError" class="flex min-h-screen items-center justify-center px-4 py-12">
      <div class="card max-w-md w-full p-8 text-center">
        <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-red-500/15 border border-red-500/25">
          <svg class="h-7 w-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 class="text-lg font-semibold text-cyber-light mb-2">Something went wrong</h2>
        <p class="text-sm text-cyber-light/70 mb-6">
          An unexpected error occurred. Reload the page or return home.
        </p>
        <div class="flex flex-wrap gap-3 justify-center">
          <button type="button" @click="reload" class="btn-primary">Reload page</button>
          <router-link to="/" class="btn-secondary" @click="clearGlobalError">Go home</router-link>
        </div>
      </div>
    </div>

    <!-- Normal app -->
    <template v-else>
      <!-- Authenticated layout: sidebar + main -->
      <template v-if="showNav">
        <AppSidebar @logout="handleLogout" />
        <div
          class="admin-main"
          role="main"
        >
          <AppHeader />
          <div class="page-content">
            <AppErrorBoundary>
              <router-view v-slot="{ Component }">
                <Transition name="page" mode="out-in">
                  <component :is="Component" :key="route.path" />
                </Transition>
              </router-view>
            </AppErrorBoundary>
          </div>
        </div>
      </template>

      <!-- Public layout: full-width (home / login) -->
      <template v-else>
        <AppErrorBoundary>
          <router-view v-slot="{ Component }">
            <Transition name="page" mode="out-in">
              <component :is="Component" :key="route.path" />
            </Transition>
          </router-view>
        </AppErrorBoundary>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, provide } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import AppSidebar from './components/AppSidebar.vue'
import AppHeader from './components/AppHeader.vue'
import AppErrorBoundary from './components/AppErrorBoundary.vue'
import { globalError, clearGlobalError } from './state/errorState'
import { checkSession, logout } from './composables/useAuth'

const router = useRouter()
const route = useRoute()
const isAuthenticated = ref(false)

const showNav = computed(() => route.path !== '/')

function reload () {
  clearGlobalError()
  window.location.reload()
}

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

const handleLogout = async () => {
  try {
    const data = await logout()
    if (data?.logout_url) {
      // Use Kratos logout URL as-is so user goes to auth app; rewriting to admin origin
      // would load admin SPA at /self-service/logout and trigger "No match" in Vue Router.
      window.location.href = data.logout_url
    } else {
      router.push('/')
    }
  } catch {
    router.push('/')
  }
}
</script>

<style scoped>
.admin-main {
  margin-left: var(--sidebar-width);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  transition: margin-left 0.25s ease;
}
</style>
