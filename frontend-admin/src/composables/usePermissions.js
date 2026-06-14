// Permissions composable — reads from BFF /api/me/permissions (A1.3+).
// Keto is no longer called directly from the frontend; all permission logic
// is server-side in the BFF (KetoService).
//
// This module is the single source of truth for the cached /me/permissions
// response: fetchMyPermissions() memoizes into _cachedPermsPromise so that every
// entry point (main.js route guard, Home.vue, Dashboard.vue, UsersManagement.vue,
// PermissionsManagement.vue) shares ONE network fetch per page load.
// usePermissionCache.js delegates here (this is the leaf module → no import cycle).
const oathkeeperUrl = import.meta.env.VITE_OATHKEEPER_URL || 'http://localhost:4455'

// Module-level memoized promise for the raw /me/permissions response.
let _cachedPermsPromise = null

async function fetchMyPermissions(forceRefresh = false) {
  if (forceRefresh) {
    _cachedPermsPromise = null
  }
  if (!_cachedPermsPromise) {
    _cachedPermsPromise = (async () => {
      const res = await fetch(`${oathkeeperUrl}/api/me/permissions`, { credentials: 'include' })
      if (!res.ok) throw new Error(`GET /me/permissions → ${res.status}`)
      return res.json()
    })()
  }
  return _cachedPermsPromise
}

// canAccessAdmin: true if the current user has the Platform:nova#administer permit.
// Called by main.js route guard and Home.vue with the session userId.
// The BFF returns canAccessAdmin keyed off the session, so userId is accepted
// for API compatibility but the BFF ignores it (uses the id_token subject).
export async function canAccessAdmin(_userId) {
  try {
    const perms = await fetchMyPermissions()
    return perms.canAccessAdmin === true
  } catch (error) {
    console.error('canAccessAdmin failed:', error)
    return false
  }
}

// canManagePermissions: administer (platform admin)
export async function canManagePermissions(_userId) {
  try {
    const perms = await fetchMyPermissions()
    return perms.canManagePermissions === true
  } catch (error) {
    console.error('canManagePermissions failed:', error)
    return false
  }
}

// ── Bulk helper used by usePermissionCache ────────────────────────────────────

// Returns all capability flags from the (cached) BFF response in the shape
// expected by Dashboard.vue, UsersManagement.vue, and PermissionsManagement.vue.
export async function getAllUserPermissionFlags(_userId, forceRefresh = false) {
  try {
    const perms = await fetchMyPermissions(forceRefresh)
    return {
      canViewUsers: perms.canViewUsers === true,
      // All user-write operations require manage_users
      canAddUsers: perms.canManageUsers === true,
      canEditUsers: perms.canManageUsers === true,
      canDeleteUsers: perms.canManageUsers === true,
      canChangePermissions: perms.canManagePermissions === true,
      canManagePermissions: perms.canManagePermissions === true,
      canAccessAdmin: perms.canAccessAdmin === true,
    }
  } catch (error) {
    console.error('Error getting user permission flags:', error)
    return {
      canViewUsers: false,
      canAddUsers: false,
      canEditUsers: false,
      canDeleteUsers: false,
      canChangePermissions: false,
      canManagePermissions: false,
      canAccessAdmin: false,
    }
  }
}

// TODO(A1-plan-2): canAccessApp per-app check (App:<appId>#access) — no BFF endpoint
// yet. Intentionally NOT exported until A1-plan-2 lands, so no caller depends on the
// always-true stub.
// eslint-disable-next-line no-unused-vars
async function canAccessApp(_userId, _appName) {
  return true
}
