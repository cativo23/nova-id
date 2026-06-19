// Permissions helper — reads from BFF /api/v1/me/permissions (A1.3+).
// Keto is no longer called directly from the frontend; all permission logic
// is server-side in the BFF (KetoService).
//
// These are plain async functions (NOT Vue composables) because they are called
// from the router navigation guard (main.ts) and from view onMounted hooks — i.e.
// outside a component setup() where TanStack Query hooks cannot run. They consume
// the generated api-client's plain `meControllerPermissions` function, which routes
// through the shared axios mutator (baseURL '/api', withCredentials). Components that
// render permission state should prefer the `useMeControllerPermissions` query hook.
//
// This module is the single source of truth for the cached /me/permissions
// response: fetchMyPermissions() memoizes into _cachedPermsPromise so that every
// entry point (main.ts route guard, Home.vue, Dashboard.vue, UsersManagement.vue,
// PermissionsManagement.vue) shares ONE network fetch per page load.
// usePermissionCache.ts delegates here (this is the leaf module → no import cycle).
import { meControllerPermissions } from '@nova-id/api-client'
import type { PermissionsResponseDto } from '@nova-id/api-client'
import { logger, errMessage } from '../utils/logger'

// Module-level memoized promise for the raw /me/permissions response.
let _cachedPermsPromise: Promise<PermissionsResponseDto> | null = null

async function fetchMyPermissions(forceRefresh = false): Promise<PermissionsResponseDto> {
  if (forceRefresh) {
    _cachedPermsPromise = null
  }
  if (!_cachedPermsPromise) {
    // Store the promise before it resolves so concurrent callers share one fetch.
    // On rejection we null out the cache so the next call retries (avoids permanent
    // negative-caching after transient network errors or 401s).
    _cachedPermsPromise = meControllerPermissions().catch((e) => {
      _cachedPermsPromise = null
      throw e
    })
  }
  return _cachedPermsPromise
}

// canAccessAdmin: true if the current user has the Platform:nova#administer permit.
// Called by main.ts route guard and Home.vue with the session userId.
// The BFF returns canAccessAdmin keyed off the session, so userId is accepted
// for API compatibility but the BFF ignores it (uses the id_token subject).
export async function canAccessAdmin(_userId?: string): Promise<boolean> {
  try {
    const perms = await fetchMyPermissions()
    return perms.canAccessAdmin === true
  } catch (error) {
    logger.error('canAccessAdmin failed:', errMessage(error))
    return false
  }
}

// canManagePermissions: administer (platform admin)
export async function canManagePermissions(_userId?: string): Promise<boolean> {
  try {
    const perms = await fetchMyPermissions()
    return perms.canManagePermissions === true
  } catch (error) {
    logger.error('canManagePermissions failed:', errMessage(error))
    return false
  }
}

// ── Bulk helper used by usePermissionCache ────────────────────────────────────

export interface PermissionFlags {
  canViewUsers: boolean
  canAddUsers: boolean
  canEditUsers: boolean
  canDeleteUsers: boolean
  canChangePermissions: boolean
  canManagePermissions: boolean
  canAccessAdmin: boolean
}

// Returns all capability flags from the (cached) BFF response in the shape
// expected by Dashboard.vue, UsersManagement.vue, and PermissionsManagement.vue.
export async function getAllUserPermissionFlags(_userId?: string, forceRefresh = false): Promise<PermissionFlags> {
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
    logger.error('Error getting user permission flags:', errMessage(error))
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
