/**
 * RBAC Constants
 * Role-Based Access Control system for LungLife
 * Centralized definitions for roles, permissions, and directory modes
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

// ===== Directory View Modes =====
export const DIRECTORY_MODES = {
  DOCTORS: 'doctors',      // Patient viewing doctors
  PATIENTS: 'patients',    // Doctor viewing their patients
  COLLEAGUES: 'colleagues', // Doctor viewing other doctors
  ALL_USERS: 'all-users'   // Admin viewing all users
} as const;

export type DirectoryMode = typeof DIRECTORY_MODES[keyof typeof DIRECTORY_MODES];

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

// ===== Directory Configuration per Role =====
export interface DirectoryConfig {
  title: string;
  subtitle: string;
  modes: DirectoryMode[];
  defaultMode: DirectoryMode;
  canSearch: boolean;
  canFilter: boolean;
  showAssignedBanner: boolean;
  cardActions: string[];
}

export const DIRECTORY_CONFIG: Record<RoleId, DirectoryConfig> = {
  [ROLE_IDS.PATIENT]: {
    title: 'Directorio de Médicos',
    subtitle: 'Busca y selecciona tu médico de seguimiento',
    modes: [DIRECTORY_MODES.DOCTORS],
    defaultMode: DIRECTORY_MODES.DOCTORS,
    canSearch: true,
    canFilter: true,
    showAssignedBanner: true,
    cardActions: ['assign']
  },
  [ROLE_IDS.DOCTOR]: {
    title: 'Directorio',
    subtitle: 'Gestiona tus pacientes y contacta colegas',
    modes: [DIRECTORY_MODES.PATIENTS, DIRECTORY_MODES.COLLEAGUES],
    defaultMode: DIRECTORY_MODES.PATIENTS,
    canSearch: true,
    canFilter: true,
    showAssignedBanner: false,
    cardActions: ['view', 'contact']
  },
  [ROLE_IDS.ADMINISTRATOR]: {
    title: 'Directorio General',
    subtitle: 'Gestión completa de usuarios del sistema',
    modes: [DIRECTORY_MODES.ALL_USERS, DIRECTORY_MODES.DOCTORS, DIRECTORY_MODES.PATIENTS],
    defaultMode: DIRECTORY_MODES.ALL_USERS,
    canSearch: true,
    canFilter: true,
    showAssignedBanner: false,
    cardActions: ['view', 'assign', 'activate', 'deactivate']
  }
};

// ===== Tab Configuration for Directory =====
export interface DirectoryTab {
  id: DirectoryMode;
  label: string;
  icon: string;
}

export const DIRECTORY_TABS: Record<RoleId, DirectoryTab[]> = {
  [ROLE_IDS.PATIENT]: [
    { id: DIRECTORY_MODES.DOCTORS, label: 'Médicos', icon: 'medkit-outline' }
  ],
  [ROLE_IDS.DOCTOR]: [
    { id: DIRECTORY_MODES.PATIENTS, label: 'Mis Pacientes', icon: 'people-outline' },
    { id: DIRECTORY_MODES.COLLEAGUES, label: 'Colegas', icon: 'medkit-outline' }
  ],
  [ROLE_IDS.ADMINISTRATOR]: [
    { id: DIRECTORY_MODES.ALL_USERS, label: 'Todos', icon: 'grid-outline' },
    { id: DIRECTORY_MODES.DOCTORS, label: 'Médicos', icon: 'medkit-outline' },
    { id: DIRECTORY_MODES.PATIENTS, label: 'Pacientes', icon: 'people-outline' }
  ]
};
