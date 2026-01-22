/**
 * RBAC Utilities
 * Helper functions for role-based access control
 */

import { 
  RoleId, 
  Permission, 
  DirectoryMode,
  ROLE_PERMISSIONS, 
  DIRECTORY_CONFIG,
  DIRECTORY_TABS,
  ROLE_NAMES,
  ROLE_IDS
} from './rbac.constants';

/**
 * Check if a role has a specific permission
 */
export function hasPermission(roleId: RoleId | undefined, permission: Permission): boolean {
  if (!roleId) return false;
  const permissions = ROLE_PERMISSIONS[roleId];
  return permissions?.includes(permission) ?? false;
}

/**
 * Check if a role has any of the specified permissions
 */
export function hasAnyPermission(roleId: RoleId | undefined, permissions: Permission[]): boolean {
  if (!roleId) return false;
  return permissions.some(p => hasPermission(roleId, p));
}

/**
 * Check if a role has all of the specified permissions
 */
export function hasAllPermissions(roleId: RoleId | undefined, permissions: Permission[]): boolean {
  if (!roleId) return false;
  return permissions.every(p => hasPermission(roleId, p));
}

/**
 * Get all permissions for a role
 */
export function getPermissions(roleId: RoleId | undefined): Permission[] {
  if (!roleId) return [];
  return ROLE_PERMISSIONS[roleId] ?? [];
}

/**
 * Get directory configuration for a role
 */
export function getDirectoryConfig(roleId: RoleId | undefined) {
  if (!roleId) return DIRECTORY_CONFIG[ROLE_IDS.PATIENT]; // Default to patient
  return DIRECTORY_CONFIG[roleId] ?? DIRECTORY_CONFIG[ROLE_IDS.PATIENT];
}

/**
 * Get directory tabs for a role
 */
export function getDirectoryTabs(roleId: RoleId | undefined) {
  if (!roleId) return DIRECTORY_TABS[ROLE_IDS.PATIENT];
  return DIRECTORY_TABS[roleId] ?? DIRECTORY_TABS[ROLE_IDS.PATIENT];
}

/**
 * Get role name for display
 */
export function getRoleName(roleId: RoleId | undefined): string {
  if (!roleId) return 'Usuario';
  return ROLE_NAMES[roleId] ?? 'Usuario';
}

/**
 * Check if user is a patient
 */
export function isPatient(roleId: RoleId | undefined): boolean {
  return roleId === ROLE_IDS.PATIENT;
}

/**
 * Check if user is a doctor
 */
export function isDoctor(roleId: RoleId | undefined): boolean {
  return roleId === ROLE_IDS.DOCTOR;
}

/**
 * Check if user is an administrator
 */
export function isAdmin(roleId: RoleId | undefined): boolean {
  return roleId === ROLE_IDS.ADMINISTRATOR;
}

/**
 * Check if a mode is available for a role
 */
export function isModeAvailable(roleId: RoleId | undefined, mode: DirectoryMode): boolean {
  if (!roleId) return false;
  const config = DIRECTORY_CONFIG[roleId];
  return config?.modes.includes(mode) ?? false;
}

/**
 * Get the default mode for a role
 */
export function getDefaultMode(roleId: RoleId | undefined): DirectoryMode {
  if (!roleId) return 'doctors';
  return DIRECTORY_CONFIG[roleId]?.defaultMode ?? 'doctors';
}

/**
 * Check if an action is available for a role in the directory
 */
export function isActionAvailable(roleId: RoleId | undefined, action: string): boolean {
  if (!roleId) return false;
  const config = DIRECTORY_CONFIG[roleId];
  return config?.cardActions.includes(action) ?? false;
}
