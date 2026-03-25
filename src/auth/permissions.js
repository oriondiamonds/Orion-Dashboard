/**
 * RBAC Permission Matrix
 *
 * Modules: tracking, orders, products, coupons, agencies, pricing, admin-users
 * Roles: super_admin, manager, marketing, viewer
 * Actions: read, write
 */

export const PERMISSIONS = {
  super_admin: {
    tracking: ['read'],
    orders: ['read', 'write'],
    products: ['read', 'write'],
    coupons: ['read', 'write'],
    agencies: ['read', 'write'],
    pricing: ['read', 'write'],
    'admin-users': ['read', 'write'],
  },
  manager: {
    tracking: ['read'],
    orders: ['read', 'write'],
    products: ['read', 'write'],
    coupons: ['read', 'write'],
    agencies: ['read', 'write'],
  },
  marketing: {
    tracking: ['read'],
    coupons: ['read', 'write'],
  },
  viewer: {
    tracking: ['read'],
    orders: ['read'],
  },
}

/**
 * Check if a role has permission for a module+action
 */
export function hasPermission(role, module, action = 'read') {
  const rolePerms = PERMISSIONS[role]
  if (!rolePerms) return false
  const modulePerms = rolePerms[module]
  if (!modulePerms) return false
  return modulePerms.includes(action)
}

/**
 * Get all modules accessible by a role (for sidebar rendering)
 */
export function getAccessibleModules(role) {
  const rolePerms = PERMISSIONS[role]
  if (!rolePerms) return []
  return Object.keys(rolePerms)
}

/**
 * Resolve effective permissions for a user (custom overrides role if set)
 */
export function getEffectivePermissions(user) {
  if (!user) return {}
  const custom = user.custom_permissions
  if (custom && Object.keys(custom).length > 0) return custom
  return PERMISSIONS[user.role] || {}
}

/**
 * Check if role can write to a module
 */
export function canWrite(role, module) {
  return hasPermission(role, module, 'write')
}

// All modules in sidebar order — used for permissions editor
export const ALL_MODULES = ['tracking', 'orders', 'products', 'coupons', 'agencies', 'pricing', 'admin-users']

export const ROLES = ['super_admin', 'manager', 'marketing', 'viewer']

export const ROLE_LABELS = {
  super_admin: 'Super Admin',
  manager: 'Manager',
  marketing: 'Marketing',
  viewer: 'Viewer',
}

export const MODULE_LABELS = {
  tracking: 'Tracking & Analytics',
  orders: 'Orders',
  products: 'Products',
  coupons: 'Coupons',
  agencies: 'Agencies',
  pricing: 'Pricing Config',
  'admin-users': 'Admin Users',
}
