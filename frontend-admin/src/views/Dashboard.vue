<template>
  <div class="mx-auto max-w-5xl space-y-8">
    <!-- Welcome section -->
    <section v-if="session" class="animate-fade-in-up">
      <h1 class="text-2xl font-heading font-bold text-cyber-light tracking-tight">
        {{ welcomeTitle }}
      </h1>
      <p class="mt-1 text-sm text-cyber-light/60">
        Here’s your session overview and quick access to admin tools.
      </p>
    </section>

    <!-- Summary cards row -->
    <section v-if="session" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 animate-fade-in-up animate-fade-in-up-delay-1">
      <!-- Session card -->
      <div class="card card-raised p-5">
        <div class="flex items-center gap-3 mb-4">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyber-accent/10 border border-cyber-accent/20">
            <svg class="h-5 w-5 text-cyber-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 class="text-base font-semibold text-cyber-light">Session</h2>
        </div>
        <dl class="space-y-2 text-sm">
          <div class="flex justify-between gap-2">
            <dt class="text-cyber-light/50">Status</dt>
            <dd>
              <span class="inline-flex items-center gap-1.5 rounded-badge bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-400 ring-1 ring-emerald-500/30">
                <span class="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                {{ session.active ? 'Active' : 'Inactive' }}
              </span>
            </dd>
          </div>
          <div class="flex justify-between gap-2">
            <dt class="text-cyber-light/50">Expires</dt>
            <dd class="font-medium text-cyber-light truncate" :title="new Date(session.expires_at).toLocaleString()">
              {{ formatExpiry(session.expires_at) }}
            </dd>
          </div>
        </dl>
        <p class="mt-3 text-xs font-mono text-cyber-light/40 truncate" :title="session.id">
          {{ session.id }}
        </p>
      </div>

      <!-- Identity card -->
      <div class="card card-raised p-5">
        <div class="flex items-center gap-3 mb-4">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyber-accent/10 border border-cyber-accent/20">
            <svg class="h-5 w-5 text-cyber-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h2 class="text-base font-semibold text-cyber-light">Identity</h2>
        </div>
        <div class="space-y-2 text-sm">
          <p v-if="session.identity?.traits?.email" class="truncate">
            <span class="text-cyber-light/50">Email</span>
            <span class="ml-2 font-medium text-cyber-light">{{ session.identity.traits.email }}</span>
          </p>
          <p v-if="session.identity?.traits?.full_name" class="truncate">
            <span class="text-cyber-light/50">Name</span>
            <span class="ml-2 font-medium text-cyber-light">{{ session.identity.traits.full_name }}</span>
          </p>
          <div v-if="session.identity?.metadata_public?.role" class="pt-1">
            <span
              class="inline-flex rounded-badge border px-2 py-0.5 text-xs font-semibold"
              :class="getRoleBadgeClass(session.identity.metadata_public.role)"
            >
              {{ (session.identity.metadata_public.role || '').replace('platform_', '') }}
            </span>
          </div>
        </div>
      </div>

      <!-- Quick actions placeholder or permissions count -->
      <div class="card card-raised p-5 sm:col-span-2 lg:col-span-1">
        <div class="flex items-center gap-3 mb-4">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyber-accent/10 border border-cyber-accent/20">
            <svg class="h-5 w-5 text-cyber-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h2 class="text-base font-semibold text-cyber-light">Your permissions</h2>
        </div>
        <p v-if="loadingPermissions" class="text-sm text-cyber-light/50">Loading…</p>
        <template v-else>
          <p v-if="userPermissions.length > 0" class="text-2xl font-bold text-cyber-accent">
            {{ userPermissions.length }}
          </p>
          <p class="text-sm text-cyber-light/60 mt-0.5">
            {{ userPermissions.length ? 'Active permissions' : 'No specific permissions' }}
          </p>
        </template>
      </div>
    </section>

    <!-- Users overview charts (when can view users) -->
    <section v-if="session && canViewUsersPermission" class="animate-fade-in-up animate-fade-in-up-delay-2">
      <div class="flex flex-wrap items-center justify-between gap-4 mb-4">
        <h2 class="text-lg font-semibold text-cyber-light">Users overview</h2>
        <router-link v-if="!loadingUsers && !usersChartError" to="/users" class="text-sm font-medium text-cyber-accent hover:text-cyber-accent/80 transition-colors">
          View all →
        </router-link>
      </div>
      <p class="text-sm text-cyber-light/50 mb-4">Snapshot by role and status (first 250 users)</p>
      <div v-if="loadingUsers" class="card p-8 text-center">
        <div class="inline-block h-8 w-8 animate-spin rounded-full border-2 border-cyber-accent/30 border-t-cyber-accent" aria-hidden="true" />
        <p class="mt-3 text-sm text-cyber-light/60">Loading users…</p>
      </div>
      <div v-else-if="usersChartError" class="card p-6 border-amber-500/30 bg-amber-500/5">
        <p class="text-sm text-amber-400">{{ usersChartError }}</p>
      </div>
      <div v-else class="grid gap-6 sm:grid-cols-2">
        <!-- Users by role -->
        <div class="card p-5">
          <h3 class="text-sm font-semibold text-cyber-light mb-4">By role</h3>
          <div v-if="roleChartData.length === 0" class="text-sm text-cyber-light/50 py-4">No users yet</div>
          <div v-else class="space-y-3">
            <div
              v-for="item in roleChartData"
              :key="item.role"
              class="flex items-center gap-3"
            >
              <span class="w-24 shrink-0 text-xs font-medium text-cyber-light/80 truncate" :title="item.label">{{ item.label }}</span>
              <div class="flex-1 h-6 rounded-md bg-cyber-bg/60 overflow-hidden">
                <div
                  class="h-full rounded-md transition-all duration-500 min-w-[2px]"
                  :style="{ width: item.percent + '%', backgroundColor: item.color }"
                />
              </div>
              <span class="w-8 shrink-0 text-right text-xs font-medium text-cyber-light">{{ item.count }}</span>
            </div>
          </div>
        </div>
        <!-- Users by status -->
        <div class="card p-5">
          <h3 class="text-sm font-semibold text-cyber-light mb-4">By status</h3>
          <div v-if="statusChartData.total === 0" class="text-sm text-cyber-light/50 py-4">No users yet</div>
          <template v-else>
            <div class="h-6 rounded-md overflow-hidden flex bg-cyber-bg/60">
              <div
                v-if="statusChartData.active > 0"
                class="h-full transition-all duration-500 min-w-[2px]"
                :style="{ width: statusChartData.activePercent + '%', backgroundColor: 'rgba(52, 211, 153, 0.7)' }"
                title="Active"
              />
              <div
                v-if="statusChartData.inactive > 0"
                class="h-full transition-all duration-500 min-w-[2px]"
                :style="{ width: statusChartData.inactivePercent + '%', backgroundColor: 'rgba(251, 191, 36, 0.7)' }"
                title="Inactive"
              />
            </div>
            <div class="flex justify-between mt-2 text-xs text-cyber-light/70">
              <span class="flex items-center gap-1.5">
                <span class="inline-block h-2 w-2 rounded-full bg-emerald-400" /> Active {{ statusChartData.active }}
              </span>
              <span class="flex items-center gap-1.5">
                <span class="inline-block h-2 w-2 rounded-full bg-amber-400" /> Inactive {{ statusChartData.inactive }}
              </span>
            </div>
          </template>
        </div>
      </div>
    </section>

    <!-- Administration quick actions -->
    <section v-if="session && (canViewUsersPermission || canManagePermissionsPermission)" class="animate-fade-in-up animate-fade-in-up-delay-2">
      <h2 class="text-lg font-semibold text-cyber-light mb-4">Administration</h2>
      <div class="grid gap-4 sm:grid-cols-2">
        <router-link
          v-if="canViewUsersPermission"
          to="/users"
          class="card card-raised p-5 flex items-center gap-4 transition-all duration-200 hover:border-cyber-accent/30 group"
        >
          <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyber-accent/10 border border-cyber-accent/20 group-hover:bg-cyber-accent/15 transition-colors">
            <svg class="h-6 w-6 text-cyber-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <div class="min-w-0 flex-1">
            <h3 class="font-semibold text-cyber-light group-hover:text-cyber-accent transition-colors">Users</h3>
            <p class="text-sm text-cyber-light/60 mt-0.5">Manage identities, roles, and access</p>
          </div>
          <svg class="h-5 w-5 shrink-0 text-cyber-light/40 group-hover:text-cyber-accent group-hover:translate-x-0.5 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </router-link>
        <router-link
          v-if="canManagePermissionsPermission"
          to="/permissions"
          class="card card-raised p-5 flex items-center gap-4 transition-all duration-200 hover:border-cyber-accent/30 group"
        >
          <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyber-accent/10 border border-cyber-accent/20 group-hover:bg-cyber-accent/15 transition-colors">
            <svg class="h-6 w-6 text-cyber-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div class="min-w-0 flex-1">
            <h3 class="font-semibold text-cyber-light group-hover:text-cyber-accent transition-colors">Permissions</h3>
            <p class="text-sm text-cyber-light/60 mt-0.5">Keto relations and OAuth clients (Hydra)</p>
          </div>
          <svg class="h-5 w-5 shrink-0 text-cyber-light/40 group-hover:text-cyber-accent group-hover:translate-x-0.5 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </router-link>
      </div>
    </section>

    <!-- Your permissions list -->
    <section v-if="session" class="card p-6 animate-fade-in-up animate-fade-in-up-delay-3">
      <h2 class="text-lg font-semibold text-cyber-light mb-1">Your permissions</h2>
      <p class="text-sm text-cyber-light/60 mb-4">Permission-based access for your account</p>
      <p v-if="loadingPermissions" class="text-sm text-cyber-light/50">Loading…</p>
      <div v-else class="space-y-3">
        <p v-if="session.identity?.metadata_public?.role" class="text-sm text-cyber-light/70 mb-2">
          Identity role:
          <span
            class="ml-2 inline-flex rounded-badge border px-2 py-0.5 text-xs font-semibold"
            :class="getRoleBadgeClass(session.identity.metadata_public.role)"
          >
            {{ (session.identity.metadata_public.role || '').replace('platform_', '') }}
          </span>
        </p>
        <ul v-if="userPermissions.length > 0" class="grid gap-2 sm:grid-cols-2">
          <li
            v-for="permission in userPermissions"
            :key="permission"
            class="flex items-center gap-2.5 rounded-panel bg-cyber-bg/50 border border-cyber-accent/10 px-3 py-2 text-sm text-cyber-light"
          >
            <span class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-medium" aria-hidden="true">✓</span>
            {{ permission }}
          </li>
        </ul>
        <p v-else class="text-sm text-cyber-light/50 py-2">
          No specific permissions. Contact an administrator to grant access.
        </p>
      </div>
    </section>

    <!-- No session -->
    <section v-else class="card p-10 text-center animate-fade-in-up">
      <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-cyber-accent/10 border border-cyber-accent/20">
        <svg class="h-7 w-7 text-cyber-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </div>
      <h2 class="text-lg font-semibold text-cyber-light mb-2">No session found</h2>
      <p class="text-sm text-cyber-light/60 mb-6 max-w-sm mx-auto">Sign in to access the admin dashboard and manage users and permissions.</p>
      <router-link to="/" class="btn-primary inline-flex">
        Sign in
      </router-link>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { checkSession, listUsers } from '../composables/useAuth'
import { getRoleBadgeClass } from '../utils/roleColors'

const router = useRouter()
const session = ref(null)
const userPermissions = ref([])
const canViewUsersPermission = ref(false)
const canManagePermissionsPermission = ref(false)
const loadingPermissions = ref(true)

const usersForCharts = ref([])
const loadingUsers = ref(false)
const usersChartError = ref(null)

const roleColorsMap = {
  platform_admin: 'rgba(168, 85, 247, 0.7)',
  platform_user: 'rgba(125, 207, 255, 0.6)'
}

const roleChartData = computed(() => {
  const users = usersForCharts.value
  if (!users.length) return []
  const counts = {}
  users.forEach((u) => {
    const role = u.metadata_public?.role || 'platform_user'
    counts[role] = (counts[role] || 0) + 1
  })
  const total = users.length
  return Object.entries(counts)
    .map(([role, count]) => ({
      role,
      label: role.replace('platform_', ''),
      count,
      percent: total ? Math.round((count / total) * 100) : 0,
      color: roleColorsMap[role] || 'rgba(125, 207, 255, 0.5)'
    }))
    .sort((a, b) => b.count - a.count)
})

const statusChartData = computed(() => {
  const users = usersForCharts.value
  const active = users.filter((u) => u.state === 'active').length
  const inactive = users.length - active
  const total = users.length
  return {
    total,
    active,
    inactive,
    activePercent: total ? Math.round((active / total) * 100) : 0,
    inactivePercent: total ? Math.round((inactive / total) * 100) : 0
  }
})

const welcomeTitle = computed(() => {
  if (!session.value?.identity?.traits) return 'Dashboard'
  const name = session.value.identity.traits.full_name || session.value.identity.traits.email?.split('@')[0]
  if (name) return `Hi, ${name}`
  return 'Dashboard'
})

function formatExpiry(expiresAt) {
  if (!expiresAt) return '—'
  const d = new Date(expiresAt)
  const now = new Date()
  const diff = d - now
  const days = Math.floor(diff / (24 * 60 * 60 * 1000))
  if (days < 0) return 'Expired'
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days < 7) return `In ${days} days`
  return d.toLocaleDateString()
}

onMounted(async () => {
  try {
    const sessionData = await checkSession()
    if (!sessionData) {
      router.push('/')
      return
    }
    session.value = sessionData
    if (sessionData.identity?.id) {
      try {
        const { getCachedPermissionFlags } = await import('../composables/usePermissionCache')
        const f = await getCachedPermissionFlags(sessionData.identity.id)
        canViewUsersPermission.value = f.canViewUsers
        canManagePermissionsPermission.value = f.canManagePermissions
        userPermissions.value = []
        if (f.canViewUsers) userPermissions.value.push('View Users')
        if (f.canAddUsers) userPermissions.value.push('Add Users')
        if (f.canEditUsers) userPermissions.value.push('Edit Users')
        if (f.canDeleteUsers) userPermissions.value.push('Delete Users')
        if (f.canChangePermissions) userPermissions.value.push('Change Permissions')
        if (f.canManagePermissions) userPermissions.value.push('Manage Permissions')
        if (f.canAccessAdmin) userPermissions.value.push('Access Admin Panel')
      } catch (_) {
        userPermissions.value = []
        canViewUsersPermission.value = false
        canManagePermissionsPermission.value = false
      } finally {
        loadingPermissions.value = false
      }

      if (canViewUsersPermission.value) {
        loadingUsers.value = true
        usersChartError.value = null
        try {
          const res = await listUsers({ pageSize: 250 })
          usersForCharts.value = res.identities || []
        } catch (_) {
          usersChartError.value = 'Could not load users for overview.'
        } finally {
          loadingUsers.value = false
        }
      }
    }
  } catch (_) {
    router.push('/')
  }
})
</script>
