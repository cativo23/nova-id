// Role color utilities for UI (platform_admin / platform_user)
export const roleColors = {
  platform_admin: {
    bg: 'bg-purple-500/20',
    text: 'text-purple-400',
    border: 'border-purple-500/50',
    badge: 'bg-purple-500/30 text-purple-300 border-purple-500/50'
  },
  platform_user: {
    bg: 'bg-gray-500/20',
    text: 'text-gray-400',
    border: 'border-gray-500/50',
    badge: 'bg-gray-500/30 text-gray-300 border-gray-500/50'
  }
}

export function getRoleColors(role) {
  return roleColors[role] || roleColors['platform_user']
}

export function getRoleBadgeClass(role) {
  const colors = getRoleColors(role)
  return `px-2 py-1 rounded text-sm font-semibold border ${colors.badge}`
}
