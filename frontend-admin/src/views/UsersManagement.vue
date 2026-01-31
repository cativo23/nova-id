<template>
  <div class="users-management">
    <div class="users-management__header">
      <div>
        <h1 class="users-management__title">User Management</h1>
        <p class="users-management__subtitle">Manage identities and access</p>
      </div>
      <button
        v-if="permissions.canAdd"
        type="button"
        @click="showAddUser = true"
        class="btn-primary inline-flex items-center gap-2"
      >
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        Add user
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="card p-12 text-center">
      <div class="inline-flex h-10 w-10 animate-spin rounded-full border-2 border-cyber-accent/30 border-t-cyber-accent" aria-hidden="true" />
      <p class="mt-4 text-sm font-medium text-cyber-light/80">Loading users…</p>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="alert-error mb-6 flex items-start gap-3">
      <svg class="h-5 w-5 shrink-0 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p class="text-red-400">{{ error }}</p>
      <button type="button" @click="error = null" class="ml-auto shrink-0 rounded p-1 text-red-400 hover:bg-red-500/20" aria-label="Dismiss">×</button>
    </div>

    <!-- Recovery Code/Link Modal -->
    <div
      v-if="recoveryData"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      @click.self="closeRecoveryModal"
    >
      <div class="card mx-4 w-full max-w-2xl p-6 shadow-modal">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-xl font-semibold text-cyber-light">Email sent</h3>
          <button
            type="button"
            @click="closeRecoveryModal"
            class="rounded p-1 text-cyber-light/70 hover:text-cyber-light hover:bg-cyber-accent/20 transition-colors text-2xl leading-none"
            title="Close"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div class="text-center mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 text-emerald-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p class="text-cyber-light mb-2">
            Recovery link created for <span class="font-semibold text-cyber-accent">{{ recoveryData.userEmail }}</span>
          </p>
          <p class="text-cyber-light/70 text-sm">
            Kratos does not send the email when the admin creates a recovery code. Copy the link below and send it to the user (e.g. by email). When they open it and complete the flow, their email will be verified.
          </p>
        </div>

        <div class="mb-6">
          <label class="block text-sm font-medium text-cyber-light mb-2">Recovery link — copy and send to the user</label>
          <div class="flex gap-2">
            <input
              :value="recoveryData.recovery_url"
              readonly
              class="input-base flex-1 font-mono text-xs break-all"
            />
            <button
              type="button"
              @click="copyToClipboard(recoveryData.recovery_url, 'url')"
              class="btn-primary whitespace-nowrap"
            >
              {{ recoveryData.copiedUrl ? '✓ Copied' : 'Copy link' }}
            </button>
          </div>
        </div>

        <div v-if="recoveryData.recovery_code" class="mb-6">
          <label class="block text-sm font-medium text-cyber-light mb-2">Recovery code — user must enter this on the recovery page</label>
          <div class="flex gap-2">
            <input
              :value="recoveryData.recovery_code"
              readonly
              class="input-base flex-1 font-mono text-lg tracking-widest text-center"
            />
            <button
              type="button"
              @click="copyToClipboard(recoveryData.recovery_code, 'code')"
              class="btn-primary whitespace-nowrap"
            >
              {{ recoveryData.copiedCode ? '✓ Copied' : 'Copy code' }}
            </button>
          </div>
          <p class="text-cyber-light/50 text-xs mt-2">
            Send the link and this code to the user. They open the link and enter the code to reset their password.
          </p>
        </div>

        <p class="text-cyber-light/50 text-xs mb-6">
          Link and code expire in 24 hours. Self-service recovery (user requests reset from the auth UI) does send an email via the courier.
        </p>

        <div class="flex justify-end gap-2">
          <button type="button" @click="closeRecoveryModal" class="btn-secondary">
            Close
          </button>
        </div>
      </div>
    </div>

    <!-- Success (when not showing recovery modal) -->
    <div v-if="success && !recoveryData" class="alert-success mb-6">
      <svg class="h-5 w-5 shrink-0 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
      </svg>
      <p class="text-emerald-400">{{ success }}</p>
      <button type="button" @click="success = null" class="ml-auto shrink-0 rounded p-1 text-emerald-400 hover:bg-emerald-500/20" aria-label="Dismiss">×</button>
    </div>

    <!-- Search bar and page size selector -->
    <div v-if="!loading && !error" class="mb-4 flex flex-col sm:flex-row gap-3">
      <div class="flex gap-2 flex-1">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search by email, name, or role..."
          class="input-base flex-1"
          @keyup.enter="handleSearch"
        />
        <button
          type="button"
          @click="handleSearch"
          class="btn-primary px-4 whitespace-nowrap"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>
        <button
          v-if="searchQuery"
          type="button"
          @click="searchQuery = ''; handleSearch()"
          class="btn-secondary px-4"
          title="Clear search"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div class="flex items-center gap-2">
        <label class="text-sm text-cyber-light/70 whitespace-nowrap">Show:</label>
        <select
          v-model.number="pageSize"
          @change="handlePageSizeChange"
          class="input-base w-20 text-sm"
        >
          <option :value="5">5</option>
          <option :value="10">10</option>
          <option :value="25">25</option>
          <option :value="50">50</option>
          <option :value="100">100</option>
        </select>
      </div>
    </div>

    <!-- Users table -->
    <div v-if="!loading && !error" class="card overflow-hidden">
      <div v-if="users.length === 0" class="flex flex-col items-center justify-center py-16 px-6">
        <div class="rounded-full bg-cyber-accent/10 p-4 mb-4">
          <svg class="h-10 w-10 text-cyber-accent/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        </div>
        <p class="text-base font-medium text-cyber-light">No users yet</p>
        <p class="mt-1 text-sm text-cyber-light/60">Add your first user to get started.</p>
        <button v-if="permissions.canAdd" type="button" @click="showAddUser = true" class="btn-primary mt-6">Add user</button>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="users-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Name</th>
              <th>Role</th>
              <th>Status</th>
              <th>Email verified</th>
              <th class="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(user, idx) in users" :key="user.id" class="users-table__row" :style="{ animationDelay: `${idx * 0.02}s` }">
              <td>
                <span class="font-medium text-cyber-light">{{ user.traits?.email || '—' }}</span>
              </td>
              <td class="text-cyber-light/90">{{ user.traits?.full_name || '—' }}</td>
              <td>
                <span
                  class="role-badge"
                  :class="getRoleBadgeClass(user.traits?.role)"
                >
                  {{ formatRole(user.traits?.role) }}
                </span>
              </td>
              <td>
                <span
                  class="status-badge"
                  :class="user.state === 'active' ? 'status-badge--active' : 'status-badge--inactive'"
                >
                  {{ user.state === 'active' ? 'Active' : 'Inactive' }}
                </span>
              </td>
              <td>
                <span
                  class="status-badge"
                  :class="isEmailVerified(user) ? 'status-badge--active' : 'status-badge--inactive'"
                >
                  {{ isEmailVerified(user) ? 'Verified' : 'Unverified' }}
                </span>
              </td>
              <td class="text-right">
                <div class="flex flex-wrap justify-end gap-1">
                  <button
                    v-if="permissions.canEdit"
                    type="button"
                    @click="editUser(user)"
                    class="action-btn action-btn--icon action-btn--primary"
                    title="Edit user"
                    aria-label="Edit user"
                  >
                    <svg class="action-btn__icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    v-if="permissions.canChangePerms"
                    type="button"
                    @click="viewPermissions(user)"
                    class="action-btn action-btn--icon action-btn--secondary"
                    title="View permissions"
                    aria-label="View permissions"
                  >
                    <svg class="action-btn__icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </button>
                  <button
                    v-if="!isEmailVerified(user)"
                    type="button"
                    @click="verifyEmail(user)"
                    :disabled="verifyingEmail === user.id"
                    class="action-btn action-btn--icon action-btn--verify"
                    :title="verifyingEmail === user.id ? 'Sending…' : 'Send verification email'"
                    aria-label="Send verification email"
                  >
                    <svg class="action-btn__icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    @click="sendRecoveryPassword(user)"
                    :disabled="sendingRecovery === user.id"
                    class="action-btn action-btn--icon action-btn--recovery"
                    :title="sendingRecovery === user.id ? 'Sending…' : 'Send password recovery email'"
                    aria-label="Send password recovery"
                  >
                    <svg class="action-btn__icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </button>
                  <button
                    v-if="permissions.canEdit && user.id !== currentUser?.id && user.state === 'active'"
                    type="button"
                    @click="confirmDeactivate(user)"
                    :disabled="togglingState === user.id"
                    class="action-btn action-btn--icon action-btn--secondary"
                    :title="togglingState === user.id ? 'Updating…' : 'Deactivate user'"
                    aria-label="Deactivate user"
                  >
                    <svg class="action-btn__icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                  </button>
                  <button
                    v-if="permissions.canEdit && user.state !== 'active'"
                    type="button"
                    @click="activateUser(user)"
                    :disabled="togglingState === user.id"
                    class="action-btn action-btn--icon action-btn--primary"
                    :title="togglingState === user.id ? 'Updating…' : 'Activate user'"
                    aria-label="Activate user"
                  >
                    <svg class="action-btn__icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                  <button
                    v-if="permissions.canDelete && user.id !== currentUser?.id"
                    type="button"
                    @click="confirmDelete(user)"
                    class="action-btn action-btn--icon action-btn--danger"
                    title="Delete user"
                    aria-label="Delete user"
                  >
                    <svg class="action-btn__icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination controls -->
      <div v-if="users.length > 0 || currentPageToken" class="border-t border-cyber-accent/10 px-6 py-4">
        <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
          <!-- Info section -->
          <div class="flex items-center gap-2 text-sm text-cyber-light/70">
            <svg class="h-4 w-4 text-cyber-accent/70" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span>Showing <strong class="text-cyber-light">{{ users.length }}</strong> {{ users.length === 1 ? 'user' : 'users' }}</span>
          </div>
          
          <!-- Navigation buttons -->
          <div class="flex items-center gap-1">
            <button
              type="button"
              @click="firstPage"
              :disabled="!currentPageToken"
              class="pagination-btn pagination-btn--icon"
              :class="{ 'pagination-btn--disabled': !currentPageToken }"
              title="First page"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
            <button
              type="button"
              @click="prevPage"
              :disabled="!pagination.hasPrev"
              class="pagination-btn"
              :class="{ 'pagination-btn--disabled': !pagination.hasPrev }"
              title="Previous page"
            >
              <svg class="h-4 w-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
              Previous
            </button>
            <div class="px-3 py-2 text-sm text-cyber-light/50 hidden sm:block">
              •
            </div>
            <button
              type="button"
              @click="nextPage"
              :disabled="!pagination.hasNext"
              class="pagination-btn"
              :class="{ 'pagination-btn--disabled': !pagination.hasNext }"
              title="Next page"
            >
              Next
              <svg class="h-4 w-4 ml-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>

          <!-- Edit User Modal -->
          <div
            v-if="editingUser"
            class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            @click.self="editingUser = null"
          >
            <div class="card mx-4 w-full max-w-md p-6 shadow-modal">
              <h3 class="text-lg font-semibold text-cyber-light mb-4">Edit user</h3>
              <form @submit.prevent="saveUser" class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-cyber-light mb-2">Email</label>
                  <input
                    v-model="editForm.email"
                    type="email"
                    class="input-base"
                    required
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-cyber-light mb-2">Full Name</label>
                  <input
                    v-model="editForm.full_name"
                    type="text"
                    class="input-base"
                    required
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-cyber-light mb-2">Role</label>
                  <select v-model="editForm.role" class="input-base" required>
                    <option value="platform_user">Platform user</option>
                    <option value="platform_admin">Platform admin</option>
                  </select>
                </div>
                <div class="flex justify-end gap-3 pt-2">
                  <button type="button" @click="editingUser = null" class="btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" :disabled="saving" class="btn-primary disabled:opacity-50">
                    {{ saving ? 'Saving…' : 'Save' }}
                  </button>
                </div>
              </form>
            </div>
          </div>

          <!-- Add User Modal -->
          <div
            v-if="showAddUser"
            class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            @click.self="showAddUser = false"
          >
            <div class="card mx-4 w-full max-w-md p-6 shadow-modal">
              <h3 class="text-lg font-semibold text-cyber-light mb-4">Add user</h3>
              <form @submit.prevent="createUserAction" class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-cyber-light mb-2">Email</label>
                  <input
                    v-model="addUserForm.email"
                    type="email"
                    class="input-base"
                    required
                    placeholder="user@example.com"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-cyber-light mb-2">Full Name</label>
                  <input
                    v-model="addUserForm.full_name"
                    type="text"
                    class="input-base"
                    required
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-cyber-light mb-2">Role</label>
                  <select v-model="addUserForm.role" class="input-base" required>
                    <option value="platform_user">Platform user</option>
                    <option value="platform_admin">Platform admin</option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium text-cyber-light mb-2">Password</label>
                  <input
                    v-model="addUserForm.password"
                    type="password"
                    class="input-base"
                    required
                    placeholder="Set initial password"
                    minlength="8"
                  />
                  <p class="text-xs text-cyber-light/50 mt-1">Minimum 8 characters. User can change it after first login.</p>
                </div>
                <div class="flex justify-end gap-3 pt-2">
                  <button type="button" @click="showAddUser = false" class="btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" :disabled="creatingUser" class="btn-primary disabled:opacity-50">
                    {{ creatingUser ? 'Creating…' : 'Create user' }}
                  </button>
                </div>
              </form>
            </div>
          </div>

          <!-- Delete Confirmation Modal -->
          <div
            v-if="userToDelete"
            class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            @click.self="userToDelete = null"
          >
            <div class="card mx-4 w-full max-w-md p-6 shadow-modal">
              <h3 class="text-lg font-semibold text-red-400 mb-4">Delete user</h3>
              <p class="text-cyber-light mb-4">
                Are you sure you want to delete user <strong>{{ userToDelete.traits?.email }}</strong>?
                This action cannot be undone.
              </p>
              <div class="flex justify-end gap-3 pt-4">
                <button type="button" @click="userToDelete = null" class="btn-secondary">
                  Cancel
                </button>
                <button type="button" @click="deleteUserAction" :disabled="deleting" class="btn-danger disabled:opacity-50">
                  {{ deleting ? 'Deleting…' : 'Delete' }}
                </button>
              </div>
            </div>
          </div>

          <!-- Deactivate Confirmation Modal -->
          <div
            v-if="userToDeactivate"
            class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            @click.self="userToDeactivate = null"
          >
            <div class="card mx-4 w-full max-w-md p-6 shadow-modal">
              <h3 class="text-lg font-semibold text-cyber-light mb-4">Deactivate user</h3>
              <p class="text-cyber-light mb-4">
                Deactivate <strong>{{ userToDeactivate.traits?.email }}</strong>? They will not be able to sign in until you activate them again.
              </p>
              <div class="flex justify-end gap-3 pt-4">
                <button type="button" @click="userToDeactivate = null" class="btn-secondary">
                  Cancel
                </button>
                <button type="button" @click="deactivateUserAction" :disabled="togglingState" class="btn-primary disabled:opacity-50">
                  {{ togglingState ? 'Updating…' : 'Deactivate' }}
                </button>
              </div>
            </div>
          </div>

          <!-- Permissions Modal -->
          <div
            v-if="viewingPermissions"
            class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            @click.self="viewingPermissions = null"
          >
            <div class="card mx-4 w-full max-w-md p-6 shadow-modal">
              <h3 class="text-lg font-semibold text-cyber-light mb-4">
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
                <button type="button" @click="viewingPermissions = null" class="btn-primary">
                  Close
                </button>
              </div>
            </div>
          </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { checkSession, listUsers, updateUser, deleteUser, createUser, createRecoveryLink, markEmailAsVerified, setIdentityState } from '../composables/useAuth'
import { getRoleBadgeClass } from '../utils/roleColors'
// Note: Individual permission checkers are no longer imported
// We use getAllUserPermissionFlags() for optimized single API call
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
  full_name: ''
})
const loadingUserPermissions = ref(false)
const userPermissionsList = ref([])
const verifyingEmail = ref(null)

// Pagination and search state
const searchQuery = ref('')
const currentPageToken = ref(null)
const pagination = ref({
  hasNext: false,
  hasPrev: false,
  nextToken: null,
  prevToken: null,
  firstToken: null
})
const pageSize = ref(5)

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

const loadUsers = async (pageToken = null) => {
  loading.value = true
  error.value = null
  success.value = null
  try {
    const response = await listUsers({
      pageToken,
      pageSize: pageSize.value,
      searchQuery: searchQuery.value
    })
    
    // Response now contains identities and pagination info
    users.value = response.identities || []
    pagination.value = response.pagination || {
      hasNext: false,
      hasPrev: false,
      nextToken: null,
      prevToken: null,
      firstToken: null
    }
    currentPageToken.value = pageToken
  } catch (err) {
    console.error('Error loading users:', err)
    error.value = err.message || 'Failed to load users. Please ensure Kratos Admin API is accessible.'
  } finally {
    loading.value = false
  }
}

const nextPage = () => {
  if (pagination.value.hasNext && pagination.value.nextToken) {
    loadUsers(pagination.value.nextToken)
  }
}

const prevPage = () => {
  if (pagination.value.hasPrev && pagination.value.prevToken) {
    loadUsers(pagination.value.prevToken)
  }
}

const firstPage = () => {
  loadUsers(null)
}

const handleSearch = () => {
  // Reset to first page when searching
  currentPageToken.value = null
  loadUsers(null)
}

const handlePageSizeChange = () => {
  // Reset to first page when changing page size
  currentPageToken.value = null
  loadUsers(null)
}

const showAddUser = ref(false)
const userToDelete = ref(null)
const userToDeactivate = ref(null)
const creatingUser = ref(false)
const togglingState = ref(null)
const sendingRecovery = ref(null)
const recoveryData = ref(null)
const addUserForm = ref({
  email: '',
  full_name: '',
  password: '',
  role: 'platform_user'
})

const confirmDelete = (user) => {
  userToDelete.value = user
}

const confirmDeactivate = (user) => {
  userToDeactivate.value = user
}

const deactivateUserAction = async () => {
  if (!userToDeactivate.value) return
  if (!permissions.value.canEdit) {
    error.value = 'You do not have permission to edit users'
    userToDeactivate.value = null
    return
  }
  const id = userToDeactivate.value.id
  togglingState.value = id
  error.value = null
  success.value = null
  try {
    await setIdentityState(id, 'inactive')
    userToDeactivate.value = null
    success.value = 'User deactivated'
    await loadUsers()
    setTimeout(() => { success.value = null }, 3000)
  } catch (err) {
    error.value = err.message || 'Failed to deactivate user'
  } finally {
    togglingState.value = null
  }
}

const activateUser = async (user) => {
  if (!permissions.value.canEdit) {
    error.value = 'You do not have permission to edit users'
    return
  }
  togglingState.value = user.id
  error.value = null
  success.value = null
  try {
    await setIdentityState(user.id, 'active')
    success.value = 'User activated'
    await loadUsers()
    setTimeout(() => { success.value = null }, 3000)
  } catch (err) {
    error.value = err.message || 'Failed to activate user'
  } finally {
    togglingState.value = null
  }
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
        full_name: addUserForm.value.full_name
      },
      addUserForm.value.password
    )
    
    addUserForm.value = {
      email: '',
      full_name: '',
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
    
    // Store recovery data for the modal (link + code from Kratos)
    recoveryData.value = {
      userEmail: user.traits?.email || user.id,
      recovery_url: result.recovery_url || '',
      recovery_code: result.recovery_code ?? '',
      copiedUrl: false,
      copiedCode: false
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
    if (type === 'url' && recoveryData.value) {
      recoveryData.value.copiedUrl = true
      setTimeout(() => {
        if (recoveryData.value) recoveryData.value.copiedUrl = false
      }, 2000)
    } else if (type === 'code' && recoveryData.value) {
      recoveryData.value.copiedCode = true
      setTimeout(() => {
        if (recoveryData.value) recoveryData.value.copiedCode = false
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

function isEmailVerified(user) {
  const email = user?.traits?.email
  if (!email) return false
  const addrs = user.verifiable_addresses ?? []
  const addr = addrs.find((a) => a.value === email)
  return addr ? (addr.status === 'completed' || addr.verified === true) : false
}

function formatRole(role) {
  if (!role) return '—'
  return role.replace('platform_', '').replace(/_/g, ' ')
}

const editUser = (user) => {
  editingUser.value = user
  editForm.value = {
    email: user.traits?.email || '',
    full_name: user.traits?.full_name || '',
    role: user.traits?.role || 'platform_user'
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
  
  try {
    await updateUser(editingUser.value.id, {
      email: editForm.value.email,
      full_name: editForm.value.full_name
    })
    editingUser.value = null
    success.value = 'User updated successfully'
    await loadUsers()
    setTimeout(() => { success.value = null }, 3000)
  } catch (err) {
    console.error('Error updating user:', err)
    error.value = err.response?.data?.error?.message || err.message || 'Failed to update user'
  } finally {
    saving.value = false
  }
}

const verifyEmail = async (user) => {
  verifyingEmail.value = user.id
  error.value = null
  success.value = null

  try {
    const result = await markEmailAsVerified(user.id)
    success.value = `Verification email sent to ${result?.userEmail || user.traits?.email}.`
  } catch (err) {
    console.error('Error sending verification email:', err)
    error.value = err.response?.data?.error?.message || err.message || 'Failed to send verification email'
  } finally {
    verifyingEmail.value = null
  }
}

const viewPermissions = async (user) => {
  viewingPermissions.value = user
  loadingUserPermissions.value = true
  userPermissionsList.value = []

  try {
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

<style scoped>
.users-management {
  @apply max-w-6xl;
}
.users-management__header {
  @apply flex flex-wrap items-center justify-between gap-4 mb-6;
}
.users-management__title {
  @apply text-2xl font-semibold text-cyber-light tracking-tight;
}
.users-management__subtitle {
  @apply mt-0.5 text-sm text-cyber-light/60;
}
.users-table {
  @apply w-full border-collapse text-left text-sm;
}
.users-table th {
  @apply bg-cyber-bg/80 px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-cyber-light/70 border-b border-cyber-accent/15;
}
.users-table td {
  @apply px-5 py-3.5 border-b border-cyber-accent/10 text-cyber-light/90;
}
.users-table__row {
  @apply transition-colors duration-150;
  animation: row-in 0.25s ease-out backwards;
}
.users-table__row:hover {
  @apply bg-cyber-dark/40;
}
@keyframes row-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
.status-badge {
  @apply inline-flex items-center rounded-badge px-2.5 py-1 text-xs font-medium;
}
.status-badge--active {
  @apply bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30;
}
.status-badge--inactive {
  @apply bg-red-500/15 text-red-400 ring-1 ring-red-500/30;
}
.action-btn {
  @apply inline-flex items-center justify-center rounded-input px-3 py-1.5 text-xs font-medium transition-colors duration-150;
}
.action-btn--icon {
  @apply p-2 rounded-input;
}
.action-btn--icon .action-btn__icon {
  @apply h-4 w-4;
}
.action-btn--primary {
  @apply bg-cyber-accent/15 text-cyber-accent hover:bg-cyber-accent/25;
}
.action-btn--secondary {
  @apply bg-cyber-accent/10 text-cyber-light/90 hover:bg-cyber-accent/20 hover:text-cyber-light;
}
.action-btn--verify {
  @apply bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 disabled:opacity-50;
}
.action-btn--recovery {
  @apply bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 disabled:opacity-50;
}
.action-btn--danger {
  @apply bg-red-500/15 text-red-400 hover:bg-red-500/25;
}
.role-badge {
  @apply inline-flex items-center rounded-badge px-2.5 py-1 text-xs font-medium;
}
.pagination-btn {
  @apply inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-input transition-all duration-150;
  @apply bg-cyber-accent/10 text-cyber-light hover:bg-cyber-accent/20 hover:text-cyber-light;
  @apply border border-cyber-accent/20 hover:border-cyber-accent/40;
}
.pagination-btn--icon {
  @apply px-3;
}
.pagination-btn--disabled {
  @apply opacity-40 cursor-not-allowed pointer-events-none;
}
</style>
