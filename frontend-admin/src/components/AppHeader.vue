<template>
  <header
    class="sticky top-0 z-30 flex h-header shrink-0 items-center justify-between border-b border-cyber-accent/15 bg-cyber-dark/95 px-6 backdrop-blur-sm lg:px-8"
    role="banner"
  >
    <div class="flex min-w-0 items-center gap-4">
      <h1 class="truncate text-base font-heading font-semibold text-cyber-light tracking-tight">
        {{ pageTitle }}
      </h1>
      <p v-if="pageSubtitle" class="hidden truncate text-sm text-cyber-light/50 sm:block">
        {{ pageSubtitle }}
      </p>
    </div>

    <div class="relative flex shrink-0 items-center gap-3">
      <div class="hidden text-right sm:block">
        <p class="text-sm font-medium text-cyber-light">{{ userEmail || 'Admin' }}</p>
        <p class="text-xs text-cyber-light/50">Platform Administrator</p>
      </div>
      <div class="relative" ref="menuRef">
        <button
          type="button"
          @click="open = !open"
          class="flex h-9 w-9 items-center justify-center rounded-panel bg-cyber-accent/10 text-cyber-accent transition-colors hover:bg-cyber-accent/20 focus:outline-none focus:ring-2 focus:ring-cyber-accent/40 focus:ring-offset-2 focus:ring-offset-cyber-dark"
          :aria-expanded="open"
          aria-haspopup="true"
          aria-label="User menu"
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </button>

        <div
          v-show="open"
          class="absolute right-0 mt-2 w-56 origin-top-right rounded-panel border border-cyber-accent/20 bg-cyber-dark py-1 shadow-dropdown"
          role="menu"
          aria-orientation="vertical"
        >
          <div class="border-b border-cyber-accent/15 px-4 py-3">
            <p class="truncate text-sm font-medium text-cyber-light">{{ userEmail || 'Admin' }}</p>
            <p class="truncate text-xs text-cyber-light/50">{{ userName || 'Platform Admin' }}</p>
          </div>
          <button
            type="button"
            @click="handleLogout"
            class="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-cyber-light hover:bg-cyber-accent/10 hover:text-cyber-accent focus:bg-cyber-accent/10 focus:text-cyber-accent focus:outline-none"
            role="menuitem"
          >
            <svg class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign out
          </button>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { checkSession, logout } from '../composables/useAuth'

const router = useRouter()
const route = useRoute()
const menuRef = ref<HTMLElement | null>(null)
const open = ref(false)
const userEmail = ref('')
const userName = ref('')

const routeTitles: Record<string, { title: string; subtitle: string }> = {
  '/dashboard': { title: 'Dashboard', subtitle: 'Session and overview' },
  '/users': { title: 'User Management', subtitle: 'Identities, roles, and access' },
  '/permissions': { title: 'Permissions', subtitle: 'Keto & OAuth clients' },
}

const pageTitle = computed(() => routeTitles[route.path]?.title ?? 'Admin')
const pageSubtitle = computed(() => routeTitles[route.path]?.subtitle ?? '')

function handleClickOutside(e: MouseEvent) {
  if (menuRef.value && !menuRef.value.contains(e.target as Node)) {
    open.value = false
  }
}

async function handleLogout() {
  open.value = false
  try {
    const data = await logout()
    if (data.logout_url) {
      window.location.href = data.logout_url
    } else {
      router.push('/')
    }
  } catch (_) {
    router.push('/')
  }
}

onMounted(async () => {
  try {
    const session = await checkSession()
    if (session?.identity?.traits) {
      userEmail.value = session.identity.traits.email ?? ''
      userName.value = session.identity.traits.full_name ?? ''
    }
  } catch (_) {}
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>
