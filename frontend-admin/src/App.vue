<template>
  <div class="min-h-screen bg-cyber-bg text-cyber-light">
    <!-- Navigation only shown on authenticated routes (not on home/login) -->
    <nav v-if="showNav" class="bg-cyber-dark border-b border-cyber-accent/20">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16">
          <div class="flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-cyber-accent" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            <h1 class="text-2xl font-bold text-cyber-accent">Nova ID - Admin Dashboard</h1>
          </div>
          <div class="flex items-center space-x-4">
            <router-link
              to="/dashboard"
              class="px-4 py-2 text-cyber-light hover:text-cyber-accent transition-colors"
            >
              Dashboard
            </router-link>
            <router-link
              to="/users"
              class="px-4 py-2 text-cyber-light hover:text-cyber-accent transition-colors"
            >
              Users
            </router-link>
            <router-link
              to="/permissions"
              class="px-4 py-2 text-cyber-light hover:text-cyber-accent transition-colors"
            >
              Permissions
            </router-link>
            <button
              @click="handleLogout"
              class="px-4 py-2 text-cyber-light hover:text-cyber-accent transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
    <main>
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, provide } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { checkSession, logout } from './composables/useAuth'

const router = useRouter()
const route = useRoute()
const isAuthenticated = ref(false)

// Show navigation only on authenticated routes (not on home/login page)
const showNav = computed(() => {
  return route.path !== '/'
})

const refreshAuth = async () => {
  try {
    const session = await checkSession()
    isAuthenticated.value = !!session
  } catch (error) {
    console.error('Session check failed:', error)
    isAuthenticated.value = false
  }
}

provide('refreshAuth', refreshAuth)

onMounted(async () => {
  await refreshAuth()
})

const handleLogout = async () => {
  try {
    console.log('Starting logout process...')
    const returnTo = window.location.origin + '/'
    const data = await logout(returnTo)
    
    // If Kratos returned a logout_url, rewrite it to go through Oathkeeper
    if (data.logout_url) {
      const oathkeeperUrl = import.meta.env.VITE_OATHKEEPER_URL || 'http://localhost:4455'
      // Replace Kratos URL with Oathkeeper URL for Zero Trust
      const logoutUrl = data.logout_url.replace(/https?:\/\/[^\/]+/, oathkeeperUrl)
      console.log('Logout flow created, redirecting to:', logoutUrl)
      window.location.href = logoutUrl
    } else {
      // No logout_url - redirect to home
      console.log('No logout_url, redirecting to home')
      router.push('/')
    }
  } catch (error) {
    console.error('Logout error:', error)
    // On error, redirect to home anyway
    router.push('/')
  }
}
</script>
