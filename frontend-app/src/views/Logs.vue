<template>
  <div class="min-h-[calc(100vh-4rem)] bg-cyber-bg">
    <!-- Access guard: redirect handled in script -->
    <div v-if="!allowed" class="flex items-center justify-center min-h-[calc(100vh-4rem)] px-4">
      <div class="text-center max-w-sm">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 mb-5" aria-hidden="true">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h2 class="text-xl font-semibold text-cyber-light mb-2">Access restricted</h2>
        <p class="text-cyber-light/70 text-sm mb-5">This page is only available to app administrators.</p>
        <router-link
          to="/"
          class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyber-accent/20 text-cyber-accent border border-cyber-accent/30 hover:bg-cyber-accent/30 transition-all duration-200 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-cyber-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-cyber-bg"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to home
        </router-link>
      </div>
    </div>

    <div v-else class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <!-- Breadcrumb -->
      <nav class="mb-6 flex items-center gap-2 text-sm" aria-label="Breadcrumb">
        <router-link
          to="/"
          class="text-cyber-light/60 hover:text-cyber-accent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cyber-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-cyber-bg rounded"
        >
          Home
        </router-link>
        <span class="text-cyber-light/40" aria-hidden="true">/</span>
        <span class="text-cyber-accent font-medium" aria-current="page">Access logs</span>
      </nav>
      <!-- Page header -->
      <div class="mb-8">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 class="text-2xl sm:text-3xl font-bold text-cyber-accent tracking-tight">Access logs</h1>
            <p class="mt-1 text-sm text-cyber-light/60">API request history and metrics. App admin only.</p>
          </div>
          <div class="flex items-center gap-3">
            <button
              type="button"
              @click="loadLogs"
              :disabled="loading"
              class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-cyber-accent/20 text-cyber-accent border border-cyber-accent/40 hover:bg-cyber-accent/30 hover:border-cyber-accent/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-cyber-accent/40 focus:ring-offset-2 focus:ring-offset-cyber-bg"
            >
              <svg v-if="loading" class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <svg v-else class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {{ loading ? 'Refreshing…' : 'Refresh' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Stats cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div class="bg-cyber-dark/80 border border-cyber-accent/20 rounded-xl p-5 shadow-lg transition-all duration-200 hover:border-cyber-accent/30 hover:shadow-glow/50 animate-fade-in-up" style="animation-delay: 0.05s">
          <p class="text-xs font-medium uppercase tracking-wider text-cyber-light/50 mb-1">Total requests</p>
          <p class="text-2xl font-bold text-cyber-accent">{{ stats.totalRequests ?? '—' }}</p>
        </div>
        <div
          v-for="(count, name) in (stats.byFrontend || {})"
          :key="'frontend-' + name"
          class="bg-cyber-dark/80 border border-cyber-accent/20 rounded-xl p-5 shadow-lg transition-all duration-200 hover:border-cyber-accent/30 animate-fade-in-up"
          :style="{ animationDelay: '0.1s' }"
        >
          <p class="text-xs font-medium uppercase tracking-wider text-cyber-light/50 mb-1 truncate" :title="name">{{ name || 'unknown' }}</p>
          <p class="text-2xl font-bold text-cyber-accent">{{ count }}</p>
        </div>
        <div v-if="stats.byFrontend && Object.keys(stats.byFrontend).length === 0" class="bg-cyber-dark/80 border border-cyber-accent/20 rounded-xl p-5 shadow-lg col-span-2">
          <p class="text-xs font-medium uppercase tracking-wider text-cyber-light/50 mb-1">By frontend</p>
          <p class="text-cyber-light/60 text-sm">No traffic yet</p>
        </div>
      </div>

      <!-- Charts (solo si hay datos) -->
      <div
        v-if="stats.totalRequests > 0 && (chartMethodEntries.length > 0 || chartStatusEntries.length > 0)"
        class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8"
      >
        <div class="bg-cyber-dark/80 border border-cyber-accent/20 rounded-xl p-6 shadow-lg animate-fade-in-up" style="animation-delay: 0.08s">
          <h3 class="text-sm font-semibold text-cyber-light/80 mb-4">Por método HTTP</h3>
          <div class="space-y-3">
            <div
              v-for="item in chartMethodEntries"
              :key="'method-' + item.label"
              class="flex items-center gap-3"
            >
              <span class="w-12 text-xs font-medium text-cyber-light/80 shrink-0">{{ item.label }}</span>
              <div class="flex-1 h-6 rounded-md bg-cyber-bg/80 overflow-hidden">
                <div
                  :class="['h-full rounded-md transition-all duration-500', item.barClass]"
                  :style="{ width: item.percent + '%' }"
                  :title="item.count + ' requests'"
                />
              </div>
              <span class="text-xs font-mono text-cyber-light/60 w-8 text-right">{{ item.count }}</span>
            </div>
          </div>
        </div>
        <div class="bg-cyber-dark/80 border border-cyber-accent/20 rounded-xl p-6 shadow-lg animate-fade-in-up" style="animation-delay: 0.1s">
          <h3 class="text-sm font-semibold text-cyber-light/80 mb-4">Por código de estado</h3>
          <div class="space-y-3">
            <div
              v-for="item in chartStatusEntries"
              :key="'status-' + item.label"
              class="flex items-center gap-3"
            >
              <span class="w-10 text-xs font-medium text-cyber-light/80 shrink-0">{{ item.label }}</span>
              <div class="flex-1 h-6 rounded-md bg-cyber-bg/80 overflow-hidden">
                <div
                  :class="['h-full rounded-md transition-all duration-500', item.barClass]"
                  :style="{ width: item.percent + '%' }"
                  :title="item.count + ' requests'"
                />
              </div>
              <span class="text-xs font-mono text-cyber-light/60 w-8 text-right">{{ item.count }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div class="flex flex-wrap items-center gap-4 mb-6">
        <div class="flex items-center gap-2">
          <label for="filter-limit" class="text-sm text-cyber-light/70">Limit</label>
          <select
            id="filter-limit"
            v-model="limit"
            @change="loadLogs"
            class="rounded-lg border border-cyber-accent/30 bg-cyber-dark/80 text-cyber-light px-3 py-2 text-sm focus:ring-2 focus:ring-cyber-accent/50 focus:border-cyber-accent/50 outline-none"
          >
            <option :value="50">50</option>
            <option :value="100">100</option>
            <option :value="250">250</option>
            <option :value="500">500</option>
          </select>
        </div>
        <div class="flex items-center gap-2">
          <label for="filter-method" class="text-sm text-cyber-light/70">Method</label>
          <select
            id="filter-method"
            v-model="methodFilter"
            @change="loadLogs"
            class="rounded-lg border border-cyber-accent/30 bg-cyber-dark/80 text-cyber-light px-3 py-2 text-sm focus:ring-2 focus:ring-cyber-accent/50 focus:border-cyber-accent/50 outline-none min-w-[100px]"
          >
            <option value="">All</option>
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="PATCH">PATCH</option>
            <option value="DELETE">DELETE</option>
          </select>
        </div>
        <div class="flex items-center gap-2">
          <label for="filter-status" class="text-sm text-cyber-light/70">Status</label>
          <select
            id="filter-status"
            v-model="statusFilter"
            @change="loadLogs"
            class="rounded-lg border border-cyber-accent/30 bg-cyber-dark/80 text-cyber-light px-3 py-2 text-sm focus:ring-2 focus:ring-cyber-accent/50 focus:border-cyber-accent/50 outline-none min-w-[100px]"
          >
            <option value="">All</option>
            <option value="2xx">2xx</option>
            <option value="4xx">4xx</option>
            <option value="5xx">5xx</option>
          </select>
        </div>
        <div class="flex items-center gap-2">
          <label for="filter-frontend" class="text-sm text-cyber-light/70">Frontend</label>
          <select
            id="filter-frontend"
            v-model="frontend"
            @change="loadLogs"
            class="rounded-lg border border-cyber-accent/30 bg-cyber-dark/80 text-cyber-light px-3 py-2 text-sm focus:ring-2 focus:ring-cyber-accent/50 focus:border-cyber-accent/50 outline-none min-w-[140px]"
          >
            <option value="">All</option>
            <option v-for="f in frontendOptions" :key="f" :value="f">{{ f }}</option>
          </select>
        </div>
      </div>

      <!-- Log table -->
      <div class="bg-cyber-dark/80 border border-cyber-accent/20 rounded-xl shadow-xl overflow-hidden animate-fade-in-up" style="animation-delay: 0.15s">
        <div class="overflow-x-auto">
          <table class="w-full text-left">
            <thead>
              <tr class="border-b border-cyber-accent/20 bg-cyber-dark/50">
                <th class="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-cyber-light/70">Time</th>
                <th class="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-cyber-light/70">Method</th>
                <th class="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-cyber-light/70">Path</th>
                <th class="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-cyber-light/70">Status</th>
                <th class="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-cyber-light/70">Duration</th>
                <th class="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-cyber-light/70">Source</th>
                <th class="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-cyber-light/70">User</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loading && logs.length === 0">
                <td colspan="7" class="px-4 py-12 text-center text-cyber-light/50 text-sm">Loading…</td>
              </tr>
              <tr v-else-if="!loading && logs.length === 0">
                <td colspan="7" class="px-4 py-16 text-center">
                  <p class="text-cyber-light/50 text-sm mb-1">No log entries yet.</p>
                  <p class="text-cyber-light/40 text-xs">Trigger API calls from the home page to see entries here.</p>
                </td>
              </tr>
              <tr
                v-else
                v-for="(entry, i) in logs"
                :key="entry.timestamp + entry.url + String(i)"
                class="border-b border-cyber-accent/10 hover:bg-cyber-accent/5 transition-colors duration-150"
              >
                <td class="px-4 py-3 text-xs font-mono text-cyber-light/80 whitespace-nowrap">{{ formatTime(entry.timestamp) }}</td>
                <td class="px-4 py-3">
                  <span
                    :class="[
                      'inline-flex px-2 py-0.5 text-[10px] font-bold uppercase rounded',
                      methodClass(entry.method)
                    ]"
                  >
                    {{ entry.method }}
                  </span>
                </td>
                <td class="px-4 py-3 text-xs font-mono text-cyber-light/90 truncate max-w-[200px]" :title="entry.url">{{ entry.url }}</td>
                <td class="px-4 py-3">
                  <span
                    :class="[
                      'inline-flex px-2 py-0.5 text-xs font-semibold rounded',
                      statusClass(entry.statusCode)
                    ]"
                  >
                    {{ entry.statusCode }}
                  </span>
                </td>
                <td class="px-4 py-3 text-xs text-cyber-light/70 font-mono">{{ entry.duration }}</td>
                <td class="px-4 py-3 text-xs text-cyber-light/80">{{ entry.frontendSource || '—' }}</td>
                <td class="px-4 py-3 text-xs text-cyber-light/80">
                  <span class="block truncate max-w-[140px]" :title="entry.user?.email">{{ entry.user?.email ?? '—' }}</span>
                  <span v-if="entry.user?.role" class="block text-cyber-light/50 text-[10px]">{{ entry.user.role }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <p class="mt-4 text-xs text-cyber-light/40">Showing {{ logs.length }} most recent entries. Logs are kept in memory and written to disk.</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getApiTestBaseUrl } from '../composables/useApiTest'

const router = useRouter()
const allowed = ref(false)
const loading = ref(false)
const logs = ref([])
const stats = ref({})
const limit = ref(100)
const frontend = ref('')
const methodFilter = ref('')
const statusFilter = ref('')

const frontendOptions = computed(() => {
  const s = stats.value?.byFrontend || {}
  return Object.keys(s).filter(Boolean).sort()
})

const chartMethodEntries = computed(() => {
  const byMethod = stats.value?.byMethod || {}
  const entries = Object.entries(byMethod).map(([label, count]) => ({ label, count: Number(count) }))
  if (entries.length === 0) return []
  const max = Math.max(...entries.map((e) => e.count), 1)
  const methodColors = {
    GET: 'bg-emerald-500/70',
    POST: 'bg-amber-500/70',
    PUT: 'bg-blue-500/70',
    PATCH: 'bg-blue-400/70',
    DELETE: 'bg-red-500/70',
  }
  return entries
    .sort((a, b) => b.count - a.count)
    .map((e) => ({
      label: e.label,
      count: e.count,
      percent: Math.round((e.count / max) * 100),
      barClass: methodColors[e.label] || 'bg-cyber-accent/60',
    }))
})

const chartStatusEntries = computed(() => {
  const byStatus = stats.value?.byStatus || {}
  const entries = Object.entries(byStatus).map(([label, count]) => ({ label, count: Number(count) }))
  if (entries.length === 0) return []
  const max = Math.max(...entries.map((e) => e.count), 1)
  const statusColor = (code) => {
    const n = parseInt(code, 10)
    if (n >= 200 && n < 300) return 'bg-emerald-500/70'
    if (n >= 400 && n < 500) return 'bg-amber-500/70'
    if (n >= 500) return 'bg-red-500/70'
    return 'bg-cyber-accent/60'
  }
  return entries
    .sort((a, b) => b.count - a.count)
    .map((e) => ({
      label: e.label,
      count: e.count,
      percent: Math.round((e.count / max) * 100),
      barClass: statusColor(e.label),
    }))
})

function methodClass(method) {
  if (method === 'GET') return 'bg-emerald-500/20 text-emerald-400'
  if (method === 'POST') return 'bg-amber-500/20 text-amber-400'
  if (method === 'PUT' || method === 'PATCH') return 'bg-blue-500/20 text-blue-400'
  if (method === 'DELETE') return 'bg-red-500/20 text-red-400'
  return 'bg-cyber-accent/20 text-cyber-accent'
}

function statusClass(code) {
  if (!code) return 'bg-cyber-accent/20 text-cyber-accent'
  if (code >= 200 && code < 300) return 'bg-emerald-500/20 text-emerald-400'
  if (code >= 400 && code < 500) return 'bg-amber-500/20 text-amber-400'
  if (code >= 500) return 'bg-red-500/20 text-red-400'
  return 'bg-cyber-accent/20 text-cyber-accent'
}

function formatTime(ts) {
  if (!ts) return '—'
  try {
    const d = new Date(ts)
    return d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'medium' })
  } catch {
    return ts
  }
}

async function ensureAllowed() {
  try {
    const res = await fetch(`${getApiTestBaseUrl()}/me`, { credentials: 'include' })
    if (res.ok) {
      const me = await res.json()
      const user = me?.user || me
      // app_admin (SQLite) is the sole gate — platform_admin alone is not sufficient (ADR-0003)
      allowed.value = user?.appRole === 'app_admin'
    } else {
      allowed.value = false
    }
    if (!allowed.value) { router.replace('/'); return }
  } catch {
    allowed.value = false
    router.replace('/')
  }
}

async function loadLogs() {
  if (!allowed.value) return
  loading.value = true
  try {
    const baseUrl = getApiTestBaseUrl()
    const params = new URLSearchParams()
    params.set('limit', String(limit.value))
    if (frontend.value) params.set('frontend', frontend.value)
    if (methodFilter.value) params.set('method', methodFilter.value)
    if (statusFilter.value) params.set('status', statusFilter.value)
    const logUrl = `${baseUrl}/logs?${params.toString()}`
    const opts = {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-Frontend-Source': 'frontend-app' },
    }
    const [logsRes, statsRes] = await Promise.all([
      fetch(logUrl, opts),
      fetch(`${baseUrl}/logs/stats`, opts)
    ])
    if (!logsRes.ok) throw new Error(`Logs: ${logsRes.status} ${logsRes.statusText}`)
    if (!statsRes.ok) throw new Error(`Stats: ${statsRes.status} ${statsRes.statusText}`)
    logs.value = await logsRes.json()
    stats.value = await statsRes.json()
  } catch (err) {
    logs.value = []
    stats.value = {}
    console.error('Failed to load logs:', err)
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await ensureAllowed()
  if (allowed.value) await loadLogs()
})
</script>
