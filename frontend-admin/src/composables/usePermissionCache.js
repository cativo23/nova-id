// Permission cache composable
// NOTE: Caching is disabled - all permissions are checked in real-time
// This ensures permissions are always up-to-date, especially after role changes.
import { getAllUserPermissionFlags, getUserPermissions } from './usePermissions'

/**
 * Get permission flags for a user (real-time, no caching)
 * @param {string} userId - User ID
 * @param {boolean} forceRefresh - Ignored (kept for API compatibility)
 * @returns {Promise<Object>} Permission flags object
 */
export async function getCachedPermissionFlags(userId, _forceRefresh = false) {
  return await getAllUserPermissionFlags(userId)
}

/**
 * Get user permissions list (real-time, no caching)
 * @param {string} userId - User ID
 * @param {boolean} forceRefresh - Ignored (kept for API compatibility)
 * @returns {Promise<Array>} Array of permission strings
 */
export async function getCachedUserPermissions(userId, _forceRefresh = false) {
  return await getUserPermissions(userId)
}

/**
 * Clear cache for a specific user
 * @param {string} userId - User ID (optional, clears all if not provided)
 * @deprecated Caching is disabled - this function does nothing
 */
export function clearPermissionCache(_userId = null) {
  // Caching is disabled - no-op
}

/**
 * Check if cache is valid for a user
 * @param {string} userId - User ID
 * @returns {boolean} Always returns false (caching is disabled)
 * @deprecated Caching is disabled - this function always returns false
 */
export function isCacheValid(userId) {
  // Caching is disabled - always return false
  return false
}
