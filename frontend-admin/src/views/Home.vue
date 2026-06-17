<template>
  <div class="home-layout min-h-screen flex flex-col bg-cyber-bg text-cyber-light overflow-hidden">
    <!-- Background: mesh gradient + grid -->
    <div class="home-bg" aria-hidden="true">
      <div class="home-mesh" />
      <div class="home-grid" />
    </div>

    <main class="flex-1 flex items-center justify-center px-4 py-12 relative z-10">
      <div class="w-full max-w-md">
        <!-- Hero block -->
        <div class="text-center mb-10">
          <div class="hero-icon-float mb-6 inline-block">
            <div class="hero-glow-pulse mx-auto flex h-24 w-24 items-center justify-center rounded-2xl border border-cyber-accent/25 bg-cyber-dark/90 shadow-glow backdrop-blur-sm">
              <NovaLogoIcon
                svg-class="h-12 w-12"
                gradient-id="admin-hero-icon"
                filter-id="admin-hero-glow"
                :glow="true"
              />
            </div>
          </div>
          <h1 class="hero-title text-3xl sm:text-4xl font-bold text-cyber-light tracking-tight mb-2">
            Nova ID
          </h1>
          <p class="hero-subtitle text-lg font-medium text-cyber-accent mb-1">
            Admin Dashboard
          </p>
          <p class="hero-cta-wrap text-sm text-cyber-light/60 max-w-xs mx-auto">
            Identity and access management for your organization
          </p>
        </div>

        <!-- Sign in card -->
        <div
          v-if="!accessDenied"
          class="hero-form-wrap card rounded-2xl border border-cyber-accent/20 p-6 sm:p-8 shadow-xl backdrop-blur-sm bg-cyber-dark/80"
        >
          <p class="text-center text-cyber-light/80 text-sm mb-6">
            Sign in with your organization account to access the admin panel.
          </p>
          <button
            type="button"
            @click="startLogin"
            :disabled="loading"
            class="btn-admin-signin btn-primary w-full py-3.5 flex items-center justify-center gap-2.5 text-base font-semibold rounded-xl"
          >
            <svg
              v-if="loading"
              class="animate-spin h-5 w-5 shrink-0"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>{{ loading ? 'Redirecting…' : 'Sign in to Admin' }}</span>
          </button>
          <p class="text-center text-xs text-cyber-light/50 mt-4">
            You’ll be redirected to the secure login page.
          </p>
        </div>

        <!-- Access denied state -->
        <div
          v-if="accessDenied"
          class="hero-form-wrap rounded-2xl border border-red-500/25 bg-red-500/5 p-6 sm:p-8 shadow-xl backdrop-blur-sm"
        >
          <div class="text-center">
            <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-red-500/15 border border-red-500/20">
              <svg class="h-7 w-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 class="text-xl font-semibold text-red-300 mb-2">Access denied</h2>
            <p class="text-cyber-light/80 text-sm mb-4">
              Your account doesn’t have permission to access the admin dashboard.
            </p>
            <p class="text-cyber-light/60 text-sm mb-6">
              Ask an administrator to grant you <strong class="text-cyber-light/80">Admin access</strong>.
            </p>
            <button
              type="button"
              @click="handleLogout"
              class="btn-secondary w-full sm:w-auto"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </main>

    <!-- Footer -->
    <footer class="relative z-10 py-4 text-center text-xs text-cyber-light/40">
      Nova ID Admin · Secure access only
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import NovaLogoIcon from '../components/NovaLogoIcon.vue'
import { checkSession, logout } from '../composables/useAuth'
import { canAccessAdmin } from '../composables/usePermissions'
import { logger, errMessage } from '../utils/logger'

const router = useRouter()
const loading = ref(false)
const accessDenied = ref(false)

const authUiUrl = () => import.meta.env.VITE_AUTH_UI_URL || import.meta.env.VITE_AUTH_URL || 'http://auth.ory.localhost'

const startLogin = async () => {
  loading.value = true
  try {
    let session = null
    try {
      session = await checkSession()
    } catch (e) {
      if ((e as { response?: { status?: number } })?.response?.status !== 401) logger.error('startLogin:', errMessage(e))
    }
    if (session?.identity?.id) {
      await checkAccess()
      return
    }
    const returnTo = window.location.origin + '/dashboard'
    window.location.href = `${authUiUrl()}/auth/login?return_to=${encodeURIComponent(returnTo)}`
  } catch (error) {
    logger.error('startLogin:', errMessage(error))
    const returnTo = window.location.origin + '/dashboard'
    window.location.href = `${authUiUrl()}/auth/login?return_to=${encodeURIComponent(returnTo)}`
  } finally {
    loading.value = false
  }
}

const checkAccess = async () => {
  try {
    const session = await checkSession()
    if (!session?.identity?.id) return
    const userId = session.identity.id
    const hasAccess = await canAccessAdmin(userId)
    if (hasAccess) {
      router.replace('/dashboard').catch(() => { window.location.href = '/dashboard' })
    } else {
      accessDenied.value = true
    }
  } catch {
    accessDenied.value = true
  }
}

const handleLogout = async () => {
  try {
    const data = await logout()
    if (data?.logout_url) {
      window.location.href = data.logout_url
    } else {
      router.push('/')
    }
  } catch {
    router.push('/')
  }
}

onMounted(async () => {
  try {
    const session = await checkSession()
    if (session?.identity?.id) await checkAccess()
  } catch {}
})
</script>

<style scoped>
.home-layout {
  position: relative;
}
.home-bg {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}
.home-mesh {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 80% 50% at 50% -20%, rgba(125, 207, 255, 0.12) 0%, transparent 50%),
    radial-gradient(ellipse 60% 40% at 100% 0%, rgba(187, 154, 247, 0.08) 0%, transparent 45%),
    radial-gradient(ellipse 50% 30% at 0% 50%, rgba(125, 207, 255, 0.06) 0%, transparent 45%);
}
.home-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(125, 207, 255, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(125, 207, 255, 0.03) 1px, transparent 1px);
  background-size: 48px 48px;
}
</style>
