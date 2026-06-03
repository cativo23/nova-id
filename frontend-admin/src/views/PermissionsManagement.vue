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
          <!-- Grant Permission Form -->
          <div class="bg-cyber-bg border border-cyber-accent/20 rounded p-6">
            <h3 class="text-xl font-semibold text-cyber-accent mb-4">Grant Permission</h3>
            <form @submit.prevent="grantPermission" class="space-y-4">
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-cyber-light mb-2">Namespace</label>
                  <select
                    v-model="permissionForm.namespace"
                    class="w-full px-4 py-2 bg-cyber-dark border border-cyber-accent/30 rounded text-cyber-light"
                    required
                  >
                    <option value="Platform">Platform - Platform-wide</option>
                    <option value="App">App - Per-application</option>
                    <option value="User" disabled>User - no active OPL permits (read-only; tuples here are never evaluated)</option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium text-cyber-light mb-2">Object</label>
                  <input
                    v-model="permissionForm.object"
                    type="text"
                    placeholder="document:123"
                    class="w-full px-4 py-2 bg-cyber-dark border border-cyber-accent/30 rounded text-cyber-light"
                    required
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-cyber-light mb-2">Relation</label>
                  <select
                    v-model="permissionForm.relation"
                    class="w-full px-4 py-2 bg-cyber-dark border border-cyber-accent/30 rounded text-cyber-light"
                    required
                  >
                    <option value="admins">admins (direct membership)</option>
                    <option value="administer">administer (computed permit)</option>
                    <option value="manage_users">manage_users (computed permit)</option>
                    <option value="access">access</option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium text-cyber-light mb-2">Subject (User ID or Email)</label>
                  <input
                    v-model="permissionForm.subject"
                    type="text"
                    placeholder="user:abc123 or user@example.com"
                    class="w-full px-4 py-2 bg-cyber-dark border border-cyber-accent/30 rounded text-cyber-light"
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                :disabled="granting"
                class="px-6 py-2 bg-cyber-accent text-cyber-bg rounded hover:bg-cyber-accent/80 transition-colors disabled:opacity-50"
              >
                {{ granting ? 'Granting...' : 'Grant Permission' }}
              </button>
            </form>
          </div>

          <!-- Current Permissions List -->
          <div class="bg-cyber-bg border border-cyber-accent/20 rounded p-6">
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-xl font-semibold text-cyber-accent">Current Permissions</h3>
              <button
                @click="loadPermissions"
                class="px-4 py-2 bg-cyber-accent/20 text-cyber-accent rounded hover:bg-cyber-accent/30 transition-colors text-sm"
              >
                Refresh
              </button>
            </div>
            <div v-if="loading" class="text-center py-8">
              <p class="text-cyber-light/70">Loading permissions...</p>
            </div>
            <div v-else-if="permissions.length === 0" class="text-center py-8">
              <p class="text-cyber-light/70">No permissions found.</p>
            </div>
            <div v-else class="overflow-x-auto">
              <table class="w-full">
                <thead>
                  <tr class="border-b border-cyber-accent/20">
                    <th class="text-left py-3 px-4 text-cyber-accent font-semibold">Namespace</th>
                    <th class="text-left py-3 px-4 text-cyber-accent font-semibold">Object</th>
                    <th class="text-left py-3 px-4 text-cyber-accent font-semibold">Relation</th>
                    <th class="text-left py-3 px-4 text-cyber-accent font-semibold">Subject</th>
                    <th class="text-left py-3 px-4 text-cyber-accent font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(perm, idx) in permissions"
                    :key="idx"
                    class="border-b border-cyber-accent/10 hover:bg-cyber-dark/50 transition-colors"
                  >
                    <td class="py-3 px-4 text-cyber-light">{{ perm.namespace }}</td>
                    <td class="py-3 px-4 text-cyber-light">{{ perm.object }}</td>
                    <td class="py-3 px-4 text-cyber-light">{{ perm.relation }}</td>
                    <td class="py-3 px-4 text-cyber-light font-mono text-sm">{{ perm.subject }}</td>
                    <td class="py-3 px-4">
                      <button
                        @click="revokePermission(perm)"
                        class="px-3 py-1 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors text-sm"
                      >
                        Revoke
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Test Permissions Tab -->
        <div v-if="activeTab === 'test'" class="space-y-6">
          <div class="bg-cyber-bg border border-cyber-accent/20 rounded p-6">
            <h3 class="text-xl font-semibold text-cyber-accent mb-4">Test Permission Check</h3>
            <form @submit.prevent="testPermission" class="space-y-4">
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-cyber-light mb-2">Namespace</label>
                  <select
                    v-model="testForm.namespace"
                    class="w-full px-4 py-2 bg-cyber-dark border border-cyber-accent/30 rounded text-cyber-light"
                  >
                    <option value="Platform">Platform - Platform-wide</option>
                    <option value="App">App - Per-application</option>
                    <option value="User" disabled>User - no active OPL permits (tuples here are never evaluated)</option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium text-cyber-light mb-2">Object</label>
                  <input
                    v-model="testForm.object"
                    type="text"
                    :placeholder="getObjectPlaceholder(testForm.namespace)"
                    class="w-full px-4 py-2 bg-cyber-dark border border-cyber-accent/30 rounded text-cyber-light"
                    required
                    list="object-suggestions"
                  />
                  <datalist id="object-suggestions">
                    <option v-for="obj in getObjectSuggestions(testForm.namespace)" :key="obj" :value="obj" />
                  </datalist>
                </div>
                <div>
                  <label class="block text-sm font-medium text-cyber-light mb-2">Relation</label>
                  <select
                    v-model="testForm.relation"
                    class="w-full px-4 py-2 bg-cyber-dark border border-cyber-accent/30 rounded text-cyber-light"
                    required
                  >
                    <option v-for="relation in availableRelations" :key="relation.value" :value="relation.value">
                      {{ relation.label }}
                    </option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium text-cyber-light mb-2">Subject</label>
                  <input
                    v-model="testForm.subject"
                    type="text"
                    :placeholder="currentUser ? `Current: ${currentUser.id}` : 'user:abc123'"
                    class="w-full px-4 py-2 bg-cyber-dark border border-cyber-accent/30 rounded text-cyber-light"
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                :disabled="testing"
                class="px-6 py-2 bg-cyber-accent text-cyber-bg rounded hover:bg-cyber-accent/80 transition-colors disabled:opacity-50"
              >
                {{ testing ? 'Testing...' : 'Test Permission' }}
              </button>
            </form>

            <!-- Test Result -->
            <div v-if="testResult !== null" class="mt-6 p-4 rounded" :class="testResult ? 'bg-green-500/20 border border-green-500/50' : 'bg-red-500/20 border border-red-500/50'">
              <p :class="testResult ? 'text-green-400' : 'text-red-400'" class="font-semibold">
                {{ testResult ? '✓ Permission Granted' : '✗ Permission Denied' }}
              </p>
            </div>
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
                    @click="deleteOAuthClient(client.client_id)"
                    class="px-3 py-1 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
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

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { checkSession } from '../composables/useAuth'
import {
  checkPermission,
  getNamespaceRelations
} from '../composables/useKeto'
import {
  listClients,
  createClient,
  deleteClient
} from '../composables/useHydra'

const router = useRouter()
const activeTab = ref('permissions')
const loading = ref(false)
const loadingClients = ref(false)
const error = ref(null)
const success = ref(null)
const currentUser = ref(null)
const permissions = ref([])
const oauthClients = ref([])
const testResult = ref(null)
const granting = ref(false)
const testing = ref(false)
const creatingClient = ref(false)
const showCreateClient = ref(false)

const permissionForm = ref({
  namespace: 'Platform',  // OPL: Platform namespace
  object: 'nova',         // OPL: Platform object is always "nova"
  relation: 'admins',
  subject: ''
})

const testForm = ref({
  namespace: 'Platform',  // OPL: Platform namespace
  object: 'nova',         // OPL: Platform object is always "nova"
  relation: 'administer', // OPL: most common check
  subject: ''  // Will be populated with current user ID if available
})

// OPL namespace → available relations for the test form.
// Platform object is always "nova"; App object is the app ID.
const namespaceRelations = {
  Platform: [
    { value: 'administer', label: 'administer - Platform admin (computed permit)' },
    { value: 'manage_users', label: 'manage_users - Manage users (computed permit)' },
    { value: 'admins', label: 'admins - Direct admin membership' }
  ],
  App: [
    { value: 'access', label: 'access - Access application' },
    { value: 'administer', label: 'administer - Administer application' }
  ],
  User: [
    { value: 'self', label: 'self - Self reference' }
  ]
}

// Computed property for available relations based on selected namespace
const availableRelations = computed(() => {
  return namespaceRelations[testForm.value.namespace] || []
})

// Watch namespace changes and update relation and object defaults (OPL model).
watch(() => testForm.value.namespace, (newNamespace) => {
  // Platform object is always "nova"; App object is the app ID (user fills it in).
  const defaultObjects = {
    Platform: 'nova',
    App: '',
    User: ''
  }
  testForm.value.object = defaultObjects[newNamespace] ?? ''

  // Reset relation to first available for the new namespace.
  if (availableRelations.value.length > 0) {
    testForm.value.relation = availableRelations.value[0].value
  }
})

// Get object placeholder based on OPL namespace.
const getObjectPlaceholder = (namespace) => {
  const placeholders = {
    Platform: 'nova',
    App: 'app-id (e.g., analytics, reports)',
    User: 'user-id'
  }
  return placeholders[namespace] || 'object'
}

// Get object suggestions based on OPL namespace.
const getObjectSuggestions = (namespace) => {
  const suggestions = {
    Platform: ['nova'],
    App: ['analytics', 'reports', 'api', 'dashboard'],
    User: []
  }
  return suggestions[namespace] || []
}

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
    console.error('Error checking permission:', error)
    router.push('/dashboard')
    return
  }
  
  currentUser.value = session.identity
  // Pre-fill test form with current user ID
  if (!testForm.value.subject) {
    testForm.value.subject = session.identity.id
  }
  await loadPermissions()
  await loadOAuthClients()
})

const loadPermissions = async () => {
  loading.value = true
  error.value = null
  try {
    // Load permissions from OPL namespaces (A0.7: ranks/users/system/admin removed).
    const namespaces = ['Platform', 'App', 'User']
    const allRelations = []
    
    for (const ns of namespaces) {
      try {
        const relations = await getNamespaceRelations(ns)
        allRelations.push(...relations)
      } catch (_) {}
    }
    
    permissions.value = allRelations.map(r => ({
      namespace: r.namespace,
      object: r.object,
      relation: r.relation,
      subject: r.subject_id || r.subject || ''
    }))
  } catch (err) {
    console.error('Error loading permissions:', err)
    error.value = err.message || 'Failed to load permissions'
  } finally {
    loading.value = false
  }
}

const grantPermission = async () => {
  // Permission writes moved to the BFF admin API (A1). Direct browser Keto writes were removed in A0.3.
  error.value = 'Permission writes moved to the BFF admin API (A1)'
}

const revokePermission = async (perm) => {
  // Permission writes moved to the BFF admin API (A1). Direct browser Keto writes were removed in A0.3.
  error.value = 'Permission writes moved to the BFF admin API (A1)'
}

const testPermission = async () => {
  testing.value = true
  testResult.value = null
  error.value = null
  try {
    const subject = testForm.value.subject.startsWith('user:') || testForm.value.subject.startsWith('user@')
      ? testForm.value.subject
      : `user:${testForm.value.subject}`
    
    const allowed = await checkPermission(
      testForm.value.namespace,
      testForm.value.object,
      testForm.value.relation,
      subject
    )
    testResult.value = allowed
  } catch (err) {
    error.value = err.message || 'Failed to test permission'
    testResult.value = false
  } finally {
    testing.value = false
  }
}

const loadOAuthClients = async () => {
  loadingClients.value = true
  error.value = null
  try {
    oauthClients.value = await listClients()
  } catch (err) {
    console.error('Error loading OAuth clients:', err)
    error.value = err.message || 'Failed to load OAuth clients'
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
    error.value = err.message || 'Failed to create OAuth client'
  } finally {
    creatingClient.value = false
  }
}

const deleteOAuthClient = async (clientId) => {
  if (!confirm('Are you sure you want to delete this OAuth client?')) return
  
  error.value = null
  success.value = null
  try {
    await deleteClient(clientId)
    success.value = 'OAuth client deleted successfully'
    await loadOAuthClients()
    setTimeout(() => { success.value = null }, 3000)
  } catch (err) {
    error.value = err.message || 'Failed to delete OAuth client'
  }
}
</script>
