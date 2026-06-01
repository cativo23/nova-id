<template>
  <div class="flex items-center justify-center min-h-[calc(100vh-4rem)] px-4">
    <div class="w-full max-w-6xl">
      <div class="bg-cyber-dark border border-cyber-accent/20 rounded-lg p-8 shadow-xl">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-3xl font-bold text-cyber-accent">Users Management</h2>
          <router-link
            to="/dashboard"
            class="px-4 py-2 text-cyber-light hover:text-cyber-accent transition-colors"
          >
            ← Back to Dashboard
          </router-link>
        </div>

        <div v-if="loading" class="text-center py-8">
          <p class="text-cyber-light/70">Loading users...</p>
        </div>

        <div v-else-if="error" class="bg-red-500/20 border border-red-500/50 rounded p-4 mb-6">
          <p class="text-red-400">{{ error }}</p>
        </div>

        <!-- Recovery Code/Link Modal -->
        <div
          v-if="recoveryData"
          class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          @click.self="closeRecoveryModal"
        >
          <div class="bg-cyber-dark border border-cyber-accent/20 rounded-lg p-6 max-w-2xl w-full mx-4">
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-xl font-semibold text-cyber-accent">Recovery Email Sent</h3>
              <button
                @click="closeRecoveryModal"
                class="text-cyber-light hover:text-cyber-accent transition-colors text-2xl leading-none"
                title="Close"
              >
                ×
              </button>
            </div>
            
            <div class="text-center mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 text-green-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p class="text-cyber-light mb-2">
                Recovery email sent successfully to <span class="font-semibold text-cyber-accent">{{ recoveryData.userEmail }}</span>
              </p>
              <p class="text-cyber-light/70 text-sm">
                The user will receive an email with instructions to reset their password.
              </p>
            </div>
            
            <!-- Recovery Link (for admin reference) -->
            <div class="mb-6">
              <label class="block text-sm font-medium text-cyber-light mb-2">Recovery Link (Admin Reference)</label>
              <div class="flex gap-2">
                <input
                  :value="recoveryData.recovery_url"
                  readonly
                  class="flex-1 px-4 py-2 bg-cyber-bg border border-cyber-accent/30 rounded text-cyber-light font-mono text-xs break-all"
                />
                <button
                  @click="copyToClipboard(recoveryData.recovery_url, 'url')"
                  class="px-4 py-2 bg-cyber-accent text-cyber-bg font-semibold rounded hover:bg-cyber-accent/80 transition-colors whitespace-nowrap"
                >
                  {{ recoveryData.copiedUrl ? '✓ Copied!' : 'Copy Link' }}
                </button>
              </div>
              <p class="text-cyber-light/50 text-xs mt-2">
                This link can be used if the email doesn't arrive or for manual password reset.
              </p>
            </div>
            
            <div class="flex justify-end gap-2">
              <button
                @click="closeRecoveryModal"
                class="px-4 py-2 bg-cyber-bg border border-cyber-accent/30 text-cyber-light rounded hover:bg-cyber-accent/20 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>

        <div v-if="success && !recoveryData" class="bg-green-500/20 border border-green-500/50 rounded p-4 mb-6">
          <div class="flex justify-between items-center">
            <p class="text-green-400">{{ success }}</p>
            <button
              @click="success = null"
              class="text-green-400 hover:text-green-300 transition-colors text-xl leading-none ml-4"
              title="Close"
            >
              ×
            </button>
          </div>
        </div>

        <div v-else>
          <!-- Users Table -->
          <div class="bg-cyber-bg border border-cyber-accent/20 rounded p-6 mb-6">
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-xl font-semibold text-cyber-accent">All Users</h3>
              <button
                v-if="permissions.canAdd"
                @click="showAddUser = true"
                class="px-4 py-2 bg-cyber-accent text-cyber-bg font-semibold rounded hover:bg-cyber-accent/80 transition-colors"
              >
                + Add User
              </button>
            </div>
            
            <div v-if="users.length === 0" class="text-center py-8">
              <p class="text-cyber-light/70">No users found.</p>
            </div>

            <div v-else class="overflow-x-auto">
              <table class="w-full">
                <thead>
                  <tr class="border-b border-cyber-accent/20">
                    <th class="text-left py-3 px-4 text-cyber-accent font-semibold">Email</th>
                    <th class="text-left py-3 px-4 text-cyber-accent font-semibold">Full Name</th>
                    <th class="text-left py-3 px-4 text-cyber-accent font-semibold">Rank</th>
                    <th class="text-left py-3 px-4 text-cyber-accent font-semibold">Status</th>
                    <th class="text-left py-3 px-4 text-cyber-accent font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="user in users"
                    :key="user.id"
                    class="border-b border-cyber-accent/10 hover:bg-cyber-dark/50 transition-colors"
                  >
                    <td class="py-3 px-4 text-cyber-light">{{ user.traits?.email || 'N/A' }}</td>
                    <td class="py-3 px-4 text-cyber-light">{{ user.traits?.full_name || 'N/A' }}</td>
                    <td class="py-3 px-4">
                      <span
                        class="px-2 py-1 rounded text-sm font-semibold border"
                        :class="getRankBadgeClass(user.traits?.rank)"
                      >
                        {{ user.traits?.rank || 'N/A' }}
                      </span>
                    </td>
                    <td class="py-3 px-4">
                      <span
                        class="px-2 py-1 rounded text-xs"
                        :class="user.state === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'"
                      >
                        {{ user.state || 'unknown' }}
                      </span>
                    </td>
                    <td class="py-3 px-4">
                      <div class="flex gap-2">
                        <button
                          v-if="permissions.canEdit"
                          @click="editUser(user)"
                          class="px-3 py-1 bg-cyber-accent/20 text-cyber-accent rounded hover:bg-cyber-accent/30 transition-colors text-sm"
                        >
                          Edit
                        </button>
                        <button
                          v-if="permissions.canChangePerms"
                          @click="viewPermissions(user)"
                          class="px-3 py-1 bg-cyber-accent/20 text-cyber-accent rounded hover:bg-cyber-accent/30 transition-colors text-sm"
                        >
                          Permissions
                        </button>
                        <button
                          @click="sendRecoveryPassword(user)"
                          :disabled="sendingRecovery === user.id"
                          class="px-3 py-1 bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30 transition-colors text-sm disabled:opacity-50"
                          title="Send password recovery email"
                        >
                          {{ sendingRecovery === user.id ? 'Sending...' : 'Recovery' }}
                        </button>
                        <button
                          v-if="permissions.canDelete && user.id !== currentUser?.id"
                          @click="confirmDelete(user)"
                          class="px-3 py-1 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Edit User Modal -->
          <div
            v-if="editingUser"
            class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            @click.self="editingUser = null"
          >
            <div class="bg-cyber-dark border border-cyber-accent/20 rounded-lg p-6 max-w-md w-full mx-4">
              <h3 class="text-xl font-semibold text-cyber-accent mb-4">Edit User</h3>
              <form @submit.prevent="saveUser" class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-cyber-light mb-2">Email</label>
                  <input
                    v-model="editForm.email"
                    type="email"
                    class="w-full px-4 py-2 bg-cyber-bg border border-cyber-accent/30 rounded text-cyber-light"
                    required
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-cyber-light mb-2">Full Name</label>
                  <input
                    v-model="editForm.full_name"
                    type="text"
                    class="w-full px-4 py-2 bg-cyber-bg border border-cyber-accent/30 rounded text-cyber-light"
                    required
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-cyber-light mb-2">Rank</label>
                  <select
                    v-model="editForm.rank"
                    class="w-full px-4 py-2 bg-cyber-bg border border-cyber-accent/30 rounded text-cyber-light"
                    required
                  >
                    <option value="Private">Private</option>
                    <option value="Corporal">Corporal</option>
                    <option value="Sergeant">Sergeant</option>
                    <option value="Lieutenant">Lieutenant</option>
                    <option value="Captain">Captain</option>
                    <option value="Major">Major</option>
                    <option value="Colonel">Colonel</option>
                    <option value="General">General</option>
                  </select>
                </div>
                <div class="flex justify-end space-x-3">
                  <button
                    type="button"
                    @click="editingUser = null"
                    class="px-4 py-2 bg-cyber-bg border border-cyber-accent/30 text-cyber-light rounded hover:bg-cyber-bg/80 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    :disabled="saving"
                    class="px-4 py-2 bg-cyber-accent text-cyber-bg rounded hover:bg-cyber-accent/80 transition-colors disabled:opacity-50"
                  >
                    {{ saving ? 'Saving...' : 'Save' }}
                  </button>
                </div>
              </form>
            </div>
          </div>

          <!-- Add User Modal -->
          <div
            v-if="showAddUser"
            class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            @click.self="showAddUser = false"
          >
            <div class="bg-cyber-dark border border-cyber-accent/20 rounded-lg p-6 max-w-md w-full mx-4">
              <h3 class="text-xl font-semibold text-cyber-accent mb-4">Add New User</h3>
              <form @submit.prevent="createUserAction" class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-cyber-light mb-2">Email</label>
                  <input
                    v-model="addUserForm.email"
                    type="email"
                    class="w-full px-4 py-2 bg-cyber-bg border border-cyber-accent/30 rounded text-cyber-light"
                    required
                    placeholder="user@example.com"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-cyber-light mb-2">Full Name</label>
                  <input
                    v-model="addUserForm.full_name"
                    type="text"
                    class="w-full px-4 py-2 bg-cyber-bg border border-cyber-accent/30 rounded text-cyber-light"
                    required
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-cyber-light mb-2">Rank</label>
                  <select
                    v-model="addUserForm.rank"
                    class="w-full px-4 py-2 bg-cyber-bg border border-cyber-accent/30 rounded text-cyber-light"
                    required
                  >
                    <option value="Private">Private</option>
                    <option value="Corporal">Corporal</option>
                    <option value="Sergeant">Sergeant</option>
                    <option value="Lieutenant">Lieutenant</option>
                    <option value="Captain">Captain</option>
                    <option value="Major">Major</option>
                    <option value="Colonel">Colonel</option>
                    <option value="General">General</option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium text-cyber-light mb-2">Password</label>
                  <input
                    v-model="addUserForm.password"
                    type="password"
                    class="w-full px-4 py-2 bg-cyber-bg border border-cyber-accent/30 rounded text-cyber-light"
                    required
                    placeholder="Set initial password"
                    minlength="8"
                  />
                  <p class="text-xs text-cyber-light/50 mt-1">Minimum 8 characters. User can change it after first login.</p>
                </div>
                <div class="flex justify-end space-x-3">
                  <button
                    type="button"
                    @click="showAddUser = false"
                    class="px-4 py-2 bg-cyber-bg border border-cyber-accent/30 text-cyber-light rounded hover:bg-cyber-bg/80 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    :disabled="creatingUser"
                    class="px-4 py-2 bg-cyber-accent text-cyber-bg rounded hover:bg-cyber-accent/80 transition-colors disabled:opacity-50"
                  >
                    {{ creatingUser ? 'Creating...' : 'Create User' }}
                  </button>
                </div>
              </form>
            </div>
          </div>

          <!-- Delete Confirmation Modal -->
          <div
            v-if="userToDelete"
            class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            @click.self="userToDelete = null"
          >
            <div class="bg-cyber-dark border border-cyber-accent/20 rounded-lg p-6 max-w-md w-full mx-4">
              <h3 class="text-xl font-semibold text-red-400 mb-4">Confirm Delete</h3>
              <p class="text-cyber-light mb-4">
                Are you sure you want to delete user <strong>{{ userToDelete.traits?.email }}</strong>?
                This action cannot be undone.
              </p>
              <div class="flex justify-end space-x-3">
                <button
                  @click="userToDelete = null"
                  class="px-4 py-2 bg-cyber-bg border border-cyber-accent/30 text-cyber-light rounded hover:bg-cyber-bg/80 transition-colors"
                >
                  Cancel
                </button>
                <button
                  @click="deleteUserAction"
                  :disabled="deleting"
                  class="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  {{ deleting ? 'Deleting...' : 'Delete' }}
                </button>
              </div>
            </div>
          </div>

          <!-- Permissions Modal -->
          <div
            v-if="viewingPermissions"
            class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            @click.self="viewingPermissions = null"
          >
            <div class="bg-cyber-dark border border-cyber-accent/20 rounded-lg p-6 max-w-md w-full mx-4">
              <h3 class="text-xl font-semibold text-cyber-accent mb-4">
                Permissions for {{ viewingPermissions.traits?.email }}
              </h3>
              <div v-if="loadingUserPermissions" class="text-cyber-light/70 text-sm">
                Loading permissions...
              </div>
              <div v-else class="space-y-3">
                <div
                  v-for="permission in userPermissionsList"
                  :key="permission"
                  class="flex items-center space-x-2"
                >
                  <span class="text-cyber-accent">✓</span>
                  <span class="text-cyber-light">{{ permission }}</span>
                </div>
                <p v-if="userPermissionsList.length === 0" class="text-cyber-light/70">
                  No permissions assigned to this user.
                </p>
              </div>
              <div class="mt-6 flex justify-end">
                <button
                  @click="viewingPermissions = null"
                  class="px-4 py-2 bg-cyber-accent text-cyber-bg rounded hover:bg-cyber-accent/80 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { checkSession, listUsers, updateUser, deleteUser, createUser, createRecoveryLink } from '../composables/useAuth'
// Note: Individual permission checkers are no longer imported
// We use getAllUserPermissionFlags() for optimized single API call
import { getRankBadgeClass } from '../utils/rankColors'

const router = useRouter()
const users = ref([])
const loading = ref(true)
const error = ref(null)
const success = ref(null)
const editingUser = ref(null)
const viewingPermissions = ref(null)
const saving = ref(false)
const deleting = ref(false)
const currentUser = ref(null)
const permissions = ref({
  canView: false,
  canAdd: false,
  canEdit: false,
  canDelete: false,
  canChangePerms: false
})
const editForm = ref({
  email: '',
  full_name: '',
  rank: ''
})
const loadingUserPermissions = ref(false)
const userPermissionsList = ref([])

onMounted(async () => {
  // Check if user has permission to view users (via Keto)
  const session = await checkSession()
  if (!session || !session.identity?.id) {
    router.push('/dashboard')
    return
  }

  currentUser.value = session.identity

  try {
    const userId = session.identity.id
    // Use optimized function with caching
    const { getCachedPermissionFlags } = await import('../composables/usePermissionCache')
    const permissionFlags = await getCachedPermissionFlags(userId)
    
    permissions.value = {
      canView: permissionFlags.canViewUsers,
      canAdd: permissionFlags.canAddUsers,
      canEdit: permissionFlags.canEditUsers,
      canDelete: permissionFlags.canDeleteUsers,
      canChangePerms: permissionFlags.canChangePermissions
    }

    if (!permissions.value.canView) {
      router.push('/dashboard')
      return
    }
  } catch (error) {
    console.error('Error checking permission:', error)
    router.push('/dashboard')
    return
  }

  await loadUsers()
})

const loadUsers = async () => {
  loading.value = true
  error.value = null
  success.value = null
  try {
    const response = await listUsers()
    // Kratos Admin API returns an array of identities directly
    users.value = Array.isArray(response) ? response : []
  } catch (err) {
    console.error('Error loading users:', err)
    error.value = err.message || 'Failed to load users. Please ensure Kratos Admin API is accessible.'
  } finally {
    loading.value = false
  }
}

const showAddUser = ref(false)
const userToDelete = ref(null)
const creatingUser = ref(false)
const sendingRecovery = ref(null)
const recoveryData = ref(null)
const addUserForm = ref({
  email: '',
  full_name: '',
  rank: 'Private',
  password: ''
})

const confirmDelete = (user) => {
  userToDelete.value = user
}

const createUserAction = async () => {
  // Check permission before creating
  if (!permissions.value.canAdd) {
    error.value = 'You do not have permission to add users'
    return
  }
  
  creatingUser.value = true
  error.value = null
  success.value = null
  
  try {
    await createUser(
      {
        email: addUserForm.value.email,
        full_name: addUserForm.value.full_name,
        rank: addUserForm.value.rank
      },
      addUserForm.value.password
    )
    
    // Reset form
    addUserForm.value = {
      email: '',
      full_name: '',
      rank: 'Private',
      password: ''
    }
    showAddUser.value = false
    success.value = 'User created successfully'
    await loadUsers()
    setTimeout(() => { success.value = null }, 3000)
  } catch (err) {
    console.error('Error creating user:', err)
    error.value = err.response?.data?.error?.message || err.message || 'Failed to create user'
  } finally {
    creatingUser.value = false
  }
}

const deleteUserAction = async () => {
  if (!userToDelete.value) return
  
  // Check permission before deleting
  if (!permissions.value.canDelete) {
    error.value = 'You do not have permission to delete users'
    userToDelete.value = null
    return
  }
  
  deleting.value = true
  error.value = null
  success.value = null
  
  try {
    await deleteUser(userToDelete.value.id)
    userToDelete.value = null
    success.value = 'User deleted successfully'
    await loadUsers()
    setTimeout(() => { success.value = null }, 3000)
  } catch (err) {
    console.error('Error deleting user:', err)
    error.value = err.message || 'Failed to delete user'
  } finally {
    deleting.value = false
  }
}

const sendRecoveryPassword = async (user) => {
  sendingRecovery.value = user.id
  error.value = null
  success.value = null
  recoveryData.value = null
  
  try {
    const result = await createRecoveryLink(user.id)
    console.log('Recovery code created:', result)
    
    // Store recovery data for the modal
    recoveryData.value = {
      userEmail: user.traits?.email || user.id,
      recovery_url: result.recovery_url || '',
      copiedUrl: false
    }
  } catch (err) {
    console.error('Error creating recovery link:', err)
    error.value = err.response?.data?.error?.message || err.message || 'Failed to send recovery email'
  } finally {
    sendingRecovery.value = null
  }
}

const copyToClipboard = async (text, type) => {
  try {
    await navigator.clipboard.writeText(text)
    if (type === 'url') {
      recoveryData.value.copiedUrl = true
      setTimeout(() => {
        if (recoveryData.value) {
          recoveryData.value.copiedUrl = false
        }
      }, 2000)
    }
  } catch (err) {
    console.error('Failed to copy to clipboard:', err)
    // Fallback for older browsers
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.opacity = '0'
    document.body.appendChild(textArea)
    textArea.select()
    try {
      document.execCommand('copy')
      if (type === 'code') {
        recoveryData.value.copiedCode = true
        setTimeout(() => {
          if (recoveryData.value) {
            recoveryData.value.copiedCode = false
          }
        }, 2000)
      } else if (type === 'url') {
        recoveryData.value.copiedUrl = true
        setTimeout(() => {
          if (recoveryData.value) {
            recoveryData.value.copiedUrl = false
          }
        }, 2000)
      }
    } catch (fallbackErr) {
      console.error('Fallback copy failed:', fallbackErr)
    }
    document.body.removeChild(textArea)
  }
}

const closeRecoveryModal = () => {
  recoveryData.value = null
}

const editUser = (user) => {
  editingUser.value = user
  editForm.value = {
    email: user.traits?.email || '',
    full_name: user.traits?.full_name || '',
    rank: user.traits?.rank || ''
  }
}

const saveUser = async () => {
  // Check permission before saving
  if (!permissions.value.canEdit) {
    error.value = 'You do not have permission to edit users'
    return
  }
  
  saving.value = true
  error.value = null
  success.value = null
  
  // Store old rank to check if current user's rank changed
  const oldRank = editingUser.value?.traits?.rank
  const newRank = editForm.value.rank
  const isCurrentUser = editingUser.value?.id === currentUser.value?.id
  
  try {
    await updateUser(editingUser.value.id, {
      email: editForm.value.email,
      full_name: editForm.value.full_name,
      rank: editForm.value.rank
    })
    editingUser.value = null
    success.value = 'User updated successfully'
    await loadUsers()
    
    // If current user's rank changed, refresh their permissions (real-time check)
    if (isCurrentUser && oldRank !== newRank) {
      console.log('Current user rank changed, refreshing permissions...')
      const { getCachedPermissionFlags } = await import('../composables/usePermissionCache')
      const permissionFlags = await getCachedPermissionFlags(currentUser.value.id, true)
      permissions.value = {
        canView: permissionFlags.canViewUsers,
        canAdd: permissionFlags.canAddUsers,
        canEdit: permissionFlags.canEditUsers,
        canDelete: permissionFlags.canDeleteUsers,
        canChangePerms: permissionFlags.canChangePermissions
      }
    }
    
    // Clear success message after 3 seconds
    setTimeout(() => {
      success.value = null
    }, 3000)
  } catch (err) {
    console.error('Error updating user:', err)
    error.value = err.response?.data?.error?.message || err.message || 'Failed to update user'
  } finally {
    saving.value = false
  }
}

const viewPermissions = async (user) => {
  viewingPermissions.value = user
  loadingUserPermissions.value = true
  userPermissionsList.value = []
  
  try {
    // Use cached version for better performance
    const { getCachedUserPermissions } = await import('../composables/usePermissionCache')
    userPermissionsList.value = await getCachedUserPermissions(user.id)
  } catch (err) {
    console.error('Error loading user permissions:', err)
    userPermissionsList.value = []
  } finally {
    loadingUserPermissions.value = false
  }
}

</script>
