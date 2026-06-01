<template>
  <div class="flex items-center justify-center min-h-screen bg-cyber-bg text-cyber-light px-4">
    <div class="w-full max-w-md">
      <!-- Logo/Icon Section -->
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-20 h-20 bg-cyber-accent/20 rounded-full mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-cyber-accent" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
        </div>
        <h1 class="text-4xl font-bold text-cyber-accent mb-2">Nova ID</h1>
        <h2 class="text-2xl font-semibold text-cyber-light mb-2">Admin Dashboard</h2>
        <p class="text-cyber-light/70 text-sm">Access restricted to General rank and above</p>
      </div>

      <!-- Login Button -->
      <div v-if="!accessDenied" class="bg-cyber-dark border border-cyber-accent/20 rounded-xl p-8 shadow-2xl backdrop-blur-sm">
        <div class="text-center mb-6">
          <p class="text-cyber-light/80 mb-6">Please sign in to access the admin dashboard</p>
          <button
            @click="startLogin"
            :disabled="loading"
            class="w-full px-6 py-3 bg-cyber-accent text-cyber-bg font-semibold rounded-lg hover:bg-cyber-accent/90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-cyber-accent/20 hover:shadow-xl hover:shadow-cyber-accent/30 transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <svg v-if="loading" class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>{{ loading ? 'Redirecting to login...' : 'Sign In' }}</span>
          </button>
        </div>
      </div>

      <!-- Access Denied Message -->
      <div v-if="accessDenied" class="bg-red-500/10 border border-red-500/30 rounded-xl p-8 shadow-2xl">
        <div class="text-center">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 text-red-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h3 class="text-2xl font-bold text-red-400 mb-2">Access Denied</h3>
          <p class="text-cyber-light/80 mb-4">
            This admin dashboard is restricted to <strong class="text-cyber-accent">General rank</strong> and above.
          </p>
          <p class="text-cyber-light/60 text-sm mb-6">
            Your current rank: <strong>{{ userRank || 'Unknown' }}</strong>
          </p>
          <button
            @click="handleLogout"
            class="px-6 py-2 bg-cyber-accent text-cyber-bg font-semibold rounded-lg hover:bg-cyber-accent/90 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { checkSession, logout } from '../composables/useAuth.js'
import { getUserRank } from '../composables/useKeto.js'

const router = useRouter()
const loading = ref(false)
const accessDenied = ref(false)
const userRank = ref(null)

const startLogin = async () => {
  loading.value = true
  
  try {
    // Check if user already has a session (silently - don't show error if 401)
    let session = null
    try {
      session = await checkSession()
    } catch (sessionError) {
      // 401 is expected when there's no session - ignore it
      if (sessionError.response?.status !== 401) {
        console.error('startLogin - Unexpected error checking session:', sessionError)
      }
    }
    
    if (session && session.identity?.id) {
      console.log('startLogin - User already has a session, checking access...', { userId: session.identity.id })
      // User is already logged in - check access and redirect
      await checkAccess()
      return
    }

    // No session - redirect to self-service UI for login
    // Self-service UI will handle the login flow and redirect back to admin dashboard
    console.log('startLogin - No session found, redirecting to self-service UI for login...')
    const returnTo = window.location.origin + '/dashboard'
    const authUiUrl = import.meta.env.VITE_AUTH_UI_URL || 'http://localhost:5173'
    
    // Redirect to self-service UI (frontend-auth) with return_to parameter
    // The auth UI handles the login flow
    const loginUrl = `${authUiUrl}/auth/login?return_to=${encodeURIComponent(returnTo)}`
    console.log('startLogin - Redirecting to self-service UI:', loginUrl)
    window.location.href = loginUrl
  } catch (error) {
    console.error('startLogin - Unexpected error:', error)
    // On error, still try to redirect to self-service UI
    const returnTo = window.location.origin + '/dashboard'
    const authUiUrl = import.meta.env.VITE_AUTH_UI_URL || 'http://localhost:5173'
    window.location.href = `${authUiUrl}/auth/login?return_to=${encodeURIComponent(returnTo)}`
  } finally {
    loading.value = false
  }
}


const checkAccess = async () => {
  try {
    // Get user session to get user ID
    const session = await checkSession()
    console.log('checkAccess - Session:', session ? 'Found' : 'Not found')
    
    if (!session || !session.identity?.id) {
      console.error('No session or user ID after login')
      return
    }

    const userId = session.identity.id
    console.log('checkAccess - User ID:', userId)
    
    // Check user's rank via Keto (Zero Trust: through Oathkeeper)
    let rank = null
    try {
      console.log('checkAccess - Checking rank in Keto for user:', userId)
      rank = await getUserRank(userId)
      console.log('checkAccess - Rank from Keto:', rank)
    } catch (ketoError) {
      console.error('Error checking rank in Keto:', ketoError)
      // If Keto check fails, try to get rank from Kratos traits as fallback
      rank = session.identity?.traits?.rank || null
      console.log('checkAccess - Rank from Kratos traits (fallback):', rank)
    }
    
    userRank.value = rank || 'Private'
    console.log('checkAccess - Final rank:', userRank.value)
    
    // Check if user has General rank or higher
    const rankHierarchy = {
      Private: 1,
      Corporal: 2,
      Sergeant: 3,
      Lieutenant: 4,
      Captain: 5,
      Major: 6,
      Colonel: 7,
      General: 8
    }
    
    const userRankLevel = rankHierarchy[rank] || 0
    const generalRankLevel = rankHierarchy['General'] || 8
    
    console.log('checkAccess - Rank comparison:', {
      userRank,
      userRankLevel,
      generalRankLevel,
      hasAccess: userRankLevel >= generalRankLevel
    })
    
    if (userRankLevel >= generalRankLevel) {
      // User has General rank or higher - allow access
      console.log('checkAccess - User has General+ rank, redirecting to dashboard')
      // Use replace to avoid adding to history
      router.replace('/dashboard').catch(err => {
        console.error('Router redirect error:', err)
        // Fallback: use window.location if router fails
        window.location.href = '/dashboard'
      })
    } else {
      // User doesn't have General rank - show access denied
      console.log('checkAccess - User does not have General rank, showing access denied')
      accessDenied.value = true
    }
  } catch (error) {
    console.error('Error checking access:', error)
    // On error, show access denied to be safe
    accessDenied.value = true
  }
}

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

onMounted(async () => {
  // Check if user is already logged in
  try {
    console.log('Checking session on mount...')
    const session = await checkSession()
    console.log('Session check result:', session ? 'Session found' : 'No session')
    
    if (session && session.identity?.id) {
      console.log('User is logged in, checking access...', { userId: session.identity.id })
      // User is logged in - check access (General rank required)
      await checkAccess()
    } else {
      console.log('No session found, showing login button')
      // If not logged in, show login button (default state)
    }
  } catch (error) {
    // Not logged in or error checking session - show login button
    console.log('Error checking session, showing login button:', error)
  }
})
</script>
