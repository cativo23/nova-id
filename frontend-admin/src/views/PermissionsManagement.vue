<template>
  <div class="mx-auto max-w-6xl space-y-6">
    <nav class="flex items-center gap-2 text-sm text-cyber-light/50" aria-label="Breadcrumb">
      <router-link to="/dashboard" class="hover:text-cyber-accent transition-colors">Dashboard</router-link>
      <span aria-hidden="true">/</span>
      <span class="text-cyber-light font-medium" aria-current="page">Permissions</span>
    </nav>

    <div v-if="error" class="alert-error">
      <svg class="h-5 w-5 shrink-0 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      <p class="text-sm text-red-300">{{ error }}</p>
    </div>
    <div v-if="success" class="alert-success">
      <svg class="h-5 w-5 shrink-0 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      <p class="text-sm text-green-300">{{ success }}</p>
    </div>

    <div class="card overflow-hidden p-6 sm:p-8">
      <!-- Tabs -->
      <div class="-mx-6 mb-6 flex gap-1 border-b border-cyber-accent/15 px-6 sm:-mx-8 sm:px-8">
        <button
          @click="activeTab = 'permissions'"
          :class="activeTab === 'permissions' ? 'border-b-2 border-cyber-accent text-cyber-accent' : 'text-cyber-light/60 hover:text-cyber-light'"
          class="border-b-2 border-transparent px-4 py-3 text-sm font-medium transition-colors"
        >
          Keto Permissions
        </button>
        <button
          @click="activeTab = 'test'"
          :class="activeTab === 'test' ? 'border-b-2 border-cyber-accent text-cyber-accent' : 'text-cyber-light/60 hover:text-cyber-light'"
          class="border-b-2 border-transparent px-4 py-3 text-sm font-medium transition-colors"
        >
          Test Permissions
        </button>
        <button
          @click="activeTab = 'oauth'"
          :class="activeTab === 'oauth' ? 'border-b-2 border-cyber-accent text-cyber-accent' : 'text-cyber-light/60 hover:text-cyber-light'"
          class="border-b-2 border-transparent px-4 py-3 text-sm font-medium transition-colors"
        >
          OAuth Clients (Hydra)
        </button>
      </div>

        <!-- Keto Permissions Tab -->
        <div v-if="activeTab === 'permissions'" class="space-y-6">
          <!-- Grant Permission — disabled until A1-plan-2 BFF write endpoint -->
          <!-- TODO(A1-plan-2): BFF endpoint to grant/revoke Platform/App relations -->
          <div class="bg-cyber-bg border border-cyber-accent/20 rounded p-6">
            <h3 class="text-xl font-semibold text-cyber-accent mb-4">Grant Permission</h3>
            <p class="text-cyber-light/60 text-sm">
              Granting and revoking permissions is unavailable in this release. This feature is coming in a later release.
            </p>
          </div>

          <!-- Current Permissions List — disabled until A1-plan-2 BFF endpoint -->
          <!-- TODO(A1-plan-2): BFF endpoint to list Platform/App relations -->
          <div class="bg-cyber-bg border border-cyber-accent/20 rounded p-6">
            <h3 class="text-xl font-semibold text-cyber-accent mb-4">Current Permissions</h3>
            <p class="text-cyber-light/60 text-sm">
              Relation listing is unavailable in this release. This feature is coming in a later release.
            </p>
          </div>
        </div>

        <!-- Test Permissions Tab — direct Keto checks removed; BFF endpoint pending A1-plan-2 -->
        <!-- TODO(A1-plan-2): re-enable test form once BFF exposes an arbitrary check endpoint -->
        <div v-if="activeTab === 'test'" class="space-y-6">
          <div class="bg-cyber-bg border border-amber-500/20 rounded p-6">
            <h3 class="text-xl font-semibold text-amber-400 mb-2">Test Permission Check</h3>
            <p class="text-cyber-light/60 text-sm">
              Direct Keto permission checks have been removed from the frontend.
              An arbitrary permission check endpoint is coming in a later release.
            </p>
          </div>
        </div>

        <!-- OAuth Clients Tab -->
        <div v-if="activeTab === 'oauth'" class="space-y-6">
          <div class="bg-cyber-bg border border-cyber-accent/20 rounded p-6">
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-xl font-semibold text-cyber-accent">OAuth2 Clients (Hydra)</h3>
              <button
                @click="showCreateClient = true"
                class="px-4 py-2 bg-cyber-accent text-cyber-bg rounded hover:bg-cyber-accent/80 transition-colors text-sm"
              >
                Create Client
              </button>
            </div>
            <div v-if="loadingClients" class="text-center py-8">
              <p class="text-cyber-light/70">Loading clients...</p>
            </div>
            <div v-else-if="oauthClients.length === 0" class="text-center py-8">
              <p class="text-cyber-light/70">No OAuth clients found.</p>
            </div>
            <div v-else class="space-y-4">
              <div
                v-for="client in oauthClients"
                :key="client.client_id"
                class="bg-cyber-dark border border-cyber-accent/20 rounded p-4"
              >
                <div class="flex justify-between items-start">
                  <div>
                    <h4 class="text-cyber-accent font-semibold mb-2">{{ client.client_name || client.client_id }}</h4>
                    <p class="text-cyber-light/70 text-sm mb-1">Client ID: <code class="text-cyber-light">{{ client.client_id }}</code></p>
                    <p v-if="client.redirect_uris" class="text-cyber-light/70 text-sm">
                      Redirect URIs: {{ client.redirect_uris.join(', ') }}
                    </p>
                  </div>
                  <button
                    @click="clientToDelete = client.client_id"
                    class="px-3 py-1 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Delete OAuth Client Confirmation Modal -->
        <div
          v-if="clientToDelete"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          @click.self="clientToDelete = null"
        >
          <div class="card mx-4 w-full max-w-md p-6 shadow-modal">
            <h3 class="text-lg font-semibold text-red-400 mb-4">Delete OAuth client</h3>
            <p class="text-cyber-light mb-4">
              Are you sure you want to delete client <code class="text-cyber-light font-mono">{{ clientToDelete }}</code>?
              This action cannot be undone.
            </p>
            <div class="flex justify-end gap-3 pt-4">
              <button type="button" @click="clientToDelete = null" class="btn-secondary">
                Cancel
              </button>
              <button type="button" @click="deleteOAuthClient" class="btn-danger disabled:opacity-50">
                Delete
              </button>
            </div>
          </div>
        </div>

        <!-- Create OAuth Client Modal -->
        <div
          v-if="showCreateClient"
          class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          @click.self="showCreateClient = false"
        >
          <div class="bg-cyber-dark border border-cyber-accent/20 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 class="text-xl font-semibold text-cyber-accent mb-4">Create OAuth Client</h3>
            <form @submit.prevent="createOAuthClient" class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-cyber-light mb-2">Client Name</label>
                <input
                  v-model="clientForm.client_name"
                  type="text"
                  class="w-full px-4 py-2 bg-cyber-bg border border-cyber-accent/30 rounded text-cyber-light"
                  required
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-cyber-light mb-2">Redirect URIs (comma-separated)</label>
                <input
                  v-model="clientForm.redirect_uris"
                  type="text"
                  placeholder="http://localhost:5173/callback, http://localhost:3000/callback"
                  class="w-full px-4 py-2 bg-cyber-bg border border-cyber-accent/30 rounded text-cyber-light"
                  required
                />
              </div>
              <div class="flex justify-end space-x-3">
                <button
                  type="button"
                  @click="showCreateClient = false"
                  class="px-4 py-2 bg-cyber-bg border border-cyber-accent/30 text-cyber-light rounded hover:bg-cyber-bg/80 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  :disabled="creatingClient"
                  class="px-4 py-2 bg-cyber-accent text-cyber-bg rounded hover:bg-cyber-accent/80 transition-colors disabled:opacity-50"
                >
                  {{ creatingClient ? 'Creating...' : 'Create' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { checkSession } from '../composables/useAuth'
// TODO(A1-plan-2): BFF endpoints to list/grant Platform/App relations and to run
// arbitrary permission checks — direct Keto reads/writes removed from the frontend.
import {
  listClients,
  createClient,
  deleteClient
} from '../composables/useHydra'
import type { OAuthClient } from '../composables/useHydra'
import { logger, errMessage } from '../utils/logger'

const router = useRouter()
const activeTab = ref<'permissions' | 'test' | 'oauth'>('permissions')
const loadingClients = ref(false)
const error = ref<string | null>(null)
const success = ref<string | null>(null)
const oauthClients = ref<OAuthClient[]>([])
const creatingClient = ref(false)
const showCreateClient = ref(false)
const clientToDelete = ref<string | null>(null)

const clientForm = ref({
  client_name: '',
  redirect_uris: ''
})

onMounted(async () => {
  const session = await checkSession()
  if (!session || !session.identity?.id) {
    router.push('/dashboard')
    return
  }

  try {
    // Use optimized function with caching
    const { getCachedPermissionFlags } = await import('../composables/usePermissionCache')
    const permissionFlags = await getCachedPermissionFlags(session.identity.id)
    if (!permissionFlags.canManagePermissions) {
      router.push('/dashboard')
      return
    }
  } catch (error) {
    logger.error('Error checking permission', String((error as { response?: { status?: number } })?.response?.status ?? ''))
    router.push('/dashboard')
    return
  }

  await loadOAuthClients()
})

const loadOAuthClients = async () => {
  loadingClients.value = true
  error.value = null
  try {
    oauthClients.value = await listClients()
  } catch (err) {
    logger.error('Error loading OAuth clients:', errMessage(err))
    error.value = (err as Error).message || 'Failed to load OAuth clients'
  } finally {
    loadingClients.value = false
  }
}

const createOAuthClient = async () => {
  creatingClient.value = true
  error.value = null
  success.value = null
  try {
    const redirectUris = clientForm.value.redirect_uris.split(',').map(uri => uri.trim())
    await createClient({
      client_name: clientForm.value.client_name,
      redirect_uris: redirectUris,
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      scope: 'openid profile email'
    })
    success.value = 'OAuth client created successfully'
    showCreateClient.value = false
    clientForm.value = { client_name: '', redirect_uris: '' }
    await loadOAuthClients()
    setTimeout(() => { success.value = null }, 3000)
  } catch (err) {
    error.value = (err as Error).message || 'Failed to create OAuth client'
  } finally {
    creatingClient.value = false
  }
}

const deleteOAuthClient = async () => {
  if (!clientToDelete.value) return

  const clientId = clientToDelete.value
  clientToDelete.value = null
  error.value = null
  success.value = null
  try {
    await deleteClient(clientId)
    success.value = 'OAuth client deleted successfully'
    await loadOAuthClients()
    setTimeout(() => { success.value = null }, 3000)
  } catch (err) {
    error.value = (err as Error).message || 'Failed to delete OAuth client'
  }
}
</script>
