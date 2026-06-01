<template>
  <div class="min-h-screen bg-cyber-bg text-cyber-light">
    <nav class="bg-cyber-dark border-b border-cyber-accent/20">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16">
          <div class="flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-cyber-accent" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            <h1 class="text-2xl font-bold text-cyber-accent">Nova ID - Self-Service</h1>
          </div>
          <div class="flex items-center space-x-4">
            <router-link
              v-if="!isAuthenticated"
              to="/login"
              class="px-4 py-2 text-cyber-light hover:text-cyber-accent transition-colors"
            >
              Login
            </router-link>
            <router-link
              v-if="!isAuthenticated"
              to="/registration"
              class="px-4 py-2 bg-cyber-accent text-cyber-bg rounded hover:bg-cyber-accent/80 transition-colors"
            >
              Register
            </router-link>
            <button
              v-if="isAuthenticated"
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
import { ref, onMounted, provide, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { checkSession, logout } from './composables/useAuth'

const router = useRouter()
const route = useRoute()
const isAuthenticated = ref(false)

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

const handleLogout = async () => {
  try {
    console.log('Starting logout process...')
    const returnTo = window.location.origin + '/login'
    const data = await logout(returnTo)
    
    // If Kratos returned a logout_url, rewrite it to go through Oathkeeper
    if (data.logout_url) {
      const oathkeeperUrl = import.meta.env.VITE_OATHKEEPER_URL || 'http://localhost:4455'
      // Replace Kratos URL with Oathkeeper URL for Zero Trust
      const logoutUrl = data.logout_url.replace(/https?:\/\/[^\/]+/, oathkeeperUrl)
      console.log('Logout flow created, redirecting to:', logoutUrl)
      window.location.href = logoutUrl
    } else {
      // No logout_url - redirect to login
      console.log('No logout_url, redirecting to login')
      router.push('/login')
    }
  } catch (error) {
    console.error('Logout error:', error)
    // On error, redirect to login anyway
    router.push('/login')
  }
}
</script>
