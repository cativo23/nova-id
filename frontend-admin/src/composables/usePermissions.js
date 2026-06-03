// Permissions composable using Keto with OPL model (A0.7+).
// OPL model: Platform (object "nova") with computed permits administer / manage_users;
// App (object = appId) with access / administer; User namespace.
// Full permission-read migration to /me/permissions BFF deferred to A1.3.
import { checkPermission } from './useKeto'

// Generic permission check (namespace/object/relation passthrough for the OPL model).
export async function hasPermission(userId, permission, namespace = 'Platform', object = 'nova') {
  try {
    const allowed = await checkPermission(
      namespace,
      object,
      permission,
      `user:${userId}`
    )
    return allowed
  } catch (error) {
    console.error('Error checking permission:', error)
    return false
  }
}

// Platform-level permissions (OPL: Platform:nova#manage_users)
export async function canViewUsers(userId) {
  return await hasPermission(userId, 'manage_users', 'Platform', 'nova')
}

// OPL: all user-mutation actions require manage_users on Platform:nova.
export async function canAddUsers(userId) {
  return await hasPermission(userId, 'manage_users', 'Platform', 'nova')
}

export async function canEditUsers(userId) {
  return await hasPermission(userId, 'manage_users', 'Platform', 'nova')
}

export async function canDeleteUsers(userId) {
  return await hasPermission(userId, 'manage_users', 'Platform', 'nova')
}

export async function canChangePermissions(userId) {
  return await hasPermission(userId, 'administer', 'Platform', 'nova')
}

// OPL: platform-level admin permit (Platform:nova#administer).
export async function canManagePermissions(userId) {
  return await hasPermission(userId, 'administer', 'Platform', 'nova')
}

// OPL: admin panel access requires Platform:nova#administer.
export async function canAccessAdmin(userId) {
  try {
    return await hasPermission(userId, 'administer', 'Platform', 'nova')
  } catch (error) {
    console.error('canAccessAdmin failed:', error)
    return false
  }
}

// Application access (OPL: App:<appId>#access). appName is the App object id.
export async function canAccessApp(userId, appName) {
  return await hasPermission(userId, 'access', 'App', appName)
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
