// Permission cache composable.
// The actual memoization lives in usePermissions.js (single source of truth for
// the /api/me/permissions response). This module is a thin convenience layer that
// exposes the cached flags and a derived human-readable permission list, so the
// view-permissions modal and the dashboard never trigger an uncached round-trip.
import { getAllUserPermissionFlags } from './usePermissions'

/**
 * Get permission flags (cached per page load via usePermissions.js).
 * The userId argument is accepted for API compatibility with existing callers
 * but is not forwarded to the BFF (the gateway derives identity from the cookie).
 * @param {string} _userId - Ignored; kept for backward compatibility.
 * @param {boolean} forceRefresh - When true, busts the shared cache.
 * @returns {Promise<Object>} Permission flags object
 */
export async function getCachedPermissionFlags(_userId, forceRefresh = false) {
  return getAllUserPermissionFlags(_userId, forceRefresh)
}

/**
 * Get a human-readable permission list derived from the cached flags.
 * Reads through getCachedPermissionFlags so no extra BFF fetch is issued.
 * @param {string} _userId - Ignored; kept for backward compatibility.
 * @param {boolean} forceRefresh - When true, busts the shared cache.
 * @returns {Promise<Array>} Array of permission strings
 */
export async function getCachedUserPermissions(_userId, forceRefresh = false) {
  const flags = await getCachedPermissionFlags(_userId, forceRefresh)
  const permissions = []
  if (flags.canViewUsers)         permissions.push('View Users')
  if (flags.canAddUsers)          permissions.push('Add Users')
  if (flags.canEditUsers)         permissions.push('Edit Users')
  if (flags.canDeleteUsers)       permissions.push('Delete Users')
  if (flags.canChangePermissions) permissions.push('Change Permissions')
  if (flags.canManagePermissions) permissions.push('Manage Permissions')
  if (flags.canAccessAdmin)       permissions.push('Access Admin Panel')
  return permissions
}
