// Permissions composable using Keto with RBAC
// Roles: platform_admin (admin dashboard, user mgmt), platform_user (app access only).
// Permissions granted to roles; users assigned to roles. Keto resolves via subject sets.
// Namespaces: ranks (role membership), users, system, admin, nova.
import { checkPermission } from './useKeto'

// Keto resolves RBAC: user -> role membership -> permission.
export async function hasPermission(userId, permission, namespace = 'users', object = 'management') {
  try {
    const allowed = await checkPermission(
      namespace,
      object,
      permission,
      `user:${userId}` // Keto checks role membership automatically
    )
    return allowed
  } catch (error) {
    console.error('Error checking permission:', error)
    return false
  }
}

// Permission checkers - User Management (users namespace)
export async function canViewUsers(userId) {
  return await hasPermission(userId, 'view_users', 'users', 'management')
}

export async function canAddUsers(userId) {
  return await hasPermission(userId, 'add_users', 'users', 'management')
}

export async function canEditUsers(userId) {
  return await hasPermission(userId, 'edit_users', 'users', 'management')
}

export async function canDeleteUsers(userId) {
  return await hasPermission(userId, 'delete_users', 'users', 'management')
}

export async function canChangePermissions(userId) {
  return await hasPermission(userId, 'change_permissions', 'users', 'management')
}

// System permissions (system namespace)
export async function canManagePermissions(userId) {
  return await hasPermission(userId, 'manage_permissions', 'system', 'admin')
}

// Admin permissions (admin namespace)
export async function canAccessAdmin(userId) {
  try {
    return await hasPermission(userId, 'access', 'admin', 'panel')
  } catch (error) {
    console.error('canAccessAdmin failed:', error)
    return false
  }
}

// Application permissions (nova namespace)
export async function canAccessApp(userId, appName) {
  return await hasPermission(userId, 'access', 'nova', appName)
}

// Legacy compatibility
export async function canManageUsers(userId) {
  // Can manage users if they can view users (for backward compatibility)
  return await canViewUsers(userId)
}

// Get all permissions for a user (RBAC-aware; Keto resolves role membership).
export async function getUserPermissions(userId) {
  try {
    const permissions = []
    
    // Check user management permissions (users namespace)
    if (await canViewUsers(userId)) {
      permissions.push('View Users')
    }
    if (await canAddUsers(userId)) {
      permissions.push('Add Users')
    }
    if (await canEditUsers(userId)) {
      permissions.push('Edit Users')
    }
    if (await canDeleteUsers(userId)) {
      permissions.push('Delete Users')
    }
    if (await canChangePermissions(userId)) {
      permissions.push('Change Permissions')
    }
    
    // System permissions (system namespace)
    if (await canManagePermissions(userId)) {
      permissions.push('Manage Permissions')
    }
    
    // Admin permissions (admin namespace)
    if (await canAccessAdmin(userId)) {
      permissions.push('Access Admin Panel')
    }
    
    return permissions
  } catch (error) {
    console.error('Error getting user permissions:', error)
    return []
  }
}

// Get all permission flags for a user (RBAC-aware)
// Uses checkPermission which resolves role membership via Keto.
// Returns an object with all permission flags
export async function getAllUserPermissionFlags(userId) {
  try {
    // Keto's checkPermission resolves: "Is user a member of a role that has the permission?"
    
    // Check all permissions in parallel for better performance
    const [
      viewUsers,
      addUsers,
      editUsers,
      deleteUsers,
      changePerms,
      managePerms,
      accessAdmin
    ] = await Promise.all([
      canViewUsers(userId),
      canAddUsers(userId),
      canEditUsers(userId),
      canDeleteUsers(userId),
      canChangePermissions(userId),
      canManagePermissions(userId),
      canAccessAdmin(userId)
    ])
    
    return {
      canViewUsers: viewUsers,
      canAddUsers: addUsers,
      canEditUsers: editUsers,
      canDeleteUsers: deleteUsers,
      canChangePermissions: changePerms,
      canManagePermissions: managePerms,
      canAccessAdmin: accessAdmin
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
      canAccessAdmin: false
    }
  }
}
