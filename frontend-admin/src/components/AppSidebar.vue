<template>
  <aside
    class="sidebar"
    aria-label="Main navigation"
  >
    <!-- Brand -->
    <div class="sidebar-brand">
      <NovaLogoIcon svg-class="h-7 w-7 flex-shrink-0" gradient-id="sidebar-admin-icon" filter-id="sidebar-admin-glow" />
      <span class="truncate text-sm font-heading font-semibold text-cyber-light tracking-tight">Nova ID Admin</span>
    </div>

    <!-- Nav -->
    <nav class="sidebar-nav" aria-label="Admin sections">
      <ul class="space-y-0.5">
        <li v-for="(item, i) in mainNav" :key="item.to" class="sidebar-item" :style="{ animationDelay: `${i * 0.04}s` }">
          <router-link
            :to="item.to"
            active-class="active"
            class="nav-link"
          >
            <component :is="item.icon" class="h-5 w-5 shrink-0" aria-hidden="true" />
            {{ item.label }}
          </router-link>
        </li>
      </ul>

      <div class="sidebar-section">
        <p class="sidebar-section-title">Identity</p>
        <ul class="mt-2 space-y-0.5">
          <li>
            <router-link to="/" active-class="" class="nav-link text-cyber-light/60">
              <BackIcon class="h-5 w-5 shrink-0" aria-hidden="true" />
              Back to portal
            </router-link>
          </li>
        </ul>
      </div>
    </nav>

    <!-- Footer: Log out -->
    <div class="sidebar-footer">
      <button
        type="button"
        @click="$emit('logout')"
        class="nav-link w-full justify-start text-left text-cyber-light/70 hover:bg-cyber-accent/10 hover:text-cyber-light"
      >
        <LogoutIcon class="h-5 w-5 shrink-0" aria-hidden="true" />
        Log out
      </button>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { h } from 'vue'
import NovaLogoIcon from './NovaLogoIcon.vue'

defineEmits(['logout'])

const DashboardIcon = () => h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
  h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' })
])
const UsersIcon = () => h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
  h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' })
])
const PermissionsIcon = () => h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
  h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' })
])
const BackIcon = () => h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
  h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1' })
])
const LogoutIcon = () => h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
  h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1' })
])

const mainNav = [
  { to: '/dashboard', label: 'Dashboard', icon: DashboardIcon },
  { to: '/users', label: 'Users', icon: UsersIcon },
  { to: '/permissions', label: 'Permissions', icon: PermissionsIcon },
]
</script>

<style scoped>
.sidebar {
  @apply fixed left-0 top-0 z-40 flex h-full w-sidebar flex-col border-r border-cyber-accent/15 bg-cyber-dark shadow-lg;
  transition: box-shadow 0.2s ease;
}
.sidebar:hover {
  box-shadow: 4px 0 24px -8px rgba(0, 0, 0, 0.35);
}
.sidebar-brand {
  @apply flex h-header shrink-0 items-center gap-2 border-b border-cyber-accent/15 px-4;
}
.sidebar-nav {
  @apply flex-1 overflow-y-auto px-3 py-4;
}
.sidebar-item {
  animation: sidebar-item-in 0.3s ease-out backwards;
}
@keyframes sidebar-item-in {
  from {
    opacity: 0;
    transform: translateX(-8px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
.sidebar-section {
  @apply mt-6 border-t border-cyber-accent/15 pt-4;
}
.sidebar-section-title {
  @apply px-3 text-xs font-medium uppercase tracking-wider text-cyber-light/40;
}
.sidebar-footer {
  @apply shrink-0 border-t border-cyber-accent/15 px-3 py-3;
}
</style>
