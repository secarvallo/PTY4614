/**
 * RBAC Constants for Backend
 * Role-Based Access Control system for LungLife
 */

// ===== Role IDs =====
export const ROLE_IDS = {
  PATIENT: 1,
  DOCTOR: 2,
  ADMINISTRATOR: 3
} as const;

export type RoleId = typeof ROLE_IDS[keyof typeof ROLE_IDS];

// ===== Role Names =====
export const ROLE_NAMES: Record<RoleId, string> = {
  [ROLE_IDS.PATIENT]: 'Paciente',
  [ROLE_IDS.DOCTOR]: 'Médico',
  [ROLE_IDS.ADMINISTRATOR]: 'Administrador'
};

// ===== Permissions =====
export const PERMISSIONS = {
  // Doctor-related
  VIEW_DOCTORS: 'view_doctors',
  ASSIGN_DOCTOR: 'assign_doctor',
  VIEW_DOCTOR_DETAILS: 'view_doctor_details',
  
  // Patient-related
  VIEW_OWN_PATIENTS: 'view_own_patients',
  VIEW_ALL_PATIENTS: 'view_all_patients',
  VIEW_PATIENT_DETAILS: 'view_patient_details',
  
  // Assignment-related
  MANAGE_ASSIGNMENTS: 'manage_assignments',
  
  // Admin-related
  ACTIVATE_USERS: 'activate_users',
  EXPORT_DATA: 'export_data',
  VIEW_STATISTICS: 'view_statistics'
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

// ===== Permission Matrix =====
export const ROLE_PERMISSIONS: Record<RoleId, Permission[]> = {
  [ROLE_IDS.PATIENT]: [
    PERMISSIONS.VIEW_DOCTORS,
    PERMISSIONS.ASSIGN_DOCTOR,
    PERMISSIONS.VIEW_DOCTOR_DETAILS
  ],
  [ROLE_IDS.DOCTOR]: [
    PERMISSIONS.VIEW_DOCTORS,
    PERMISSIONS.VIEW_OWN_PATIENTS,
    PERMISSIONS.VIEW_DOCTOR_DETAILS,
    PERMISSIONS.VIEW_PATIENT_DETAILS
  ],
  [ROLE_IDS.ADMINISTRATOR]: [
    PERMISSIONS.VIEW_DOCTORS,
    PERMISSIONS.VIEW_ALL_PATIENTS,
    PERMISSIONS.VIEW_DOCTOR_DETAILS,
    PERMISSIONS.VIEW_PATIENT_DETAILS,
    PERMISSIONS.MANAGE_ASSIGNMENTS,
    PERMISSIONS.ACTIVATE_USERS,
    PERMISSIONS.EXPORT_DATA,
    PERMISSIONS.VIEW_STATISTICS
  ]
};

// ===== Utility Functions =====

/**
 * Check if a role has a specific permission
 */
export function hasPermission(roleId: number | undefined, permission: Permission): boolean {
  if (!roleId || !ROLE_PERMISSIONS[roleId as RoleId]) return false;
  return ROLE_PERMISSIONS[roleId as RoleId].includes(permission);
}

/**
 * Check if a role has any of the specified permissions
 */
export function hasAnyPermission(roleId: number | undefined, permissions: Permission[]): boolean {
  return permissions.some(p => hasPermission(roleId, p));
}

/**
 * Check if user is a patient
 */
export function isPatient(roleId: number | undefined): boolean {
  return roleId === ROLE_IDS.PATIENT;
}

/**
 * Check if user is a doctor
 */
export function isDoctor(roleId: number | undefined): boolean {
  return roleId === ROLE_IDS.DOCTOR;
}

/**
 * Check if user is an administrator
 */
export function isAdmin(roleId: number | undefined): boolean {
  return roleId === ROLE_IDS.ADMINISTRATOR;
}

/**
 * Get role name for display
 */
export function getRoleName(roleId: number | undefined): string {
  if (!roleId || !ROLE_NAMES[roleId as RoleId]) return 'Usuario';
  return ROLE_NAMES[roleId as RoleId];
}
