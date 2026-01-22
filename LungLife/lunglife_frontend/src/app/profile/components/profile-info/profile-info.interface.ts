/**
 * ℹ️ Profile Info Interfaces
 * Interfaces específicas para el componente información de perfil
 */

// ========== INTERFACES PARA INFORMACIÓN BÁSICA ==========

export interface ProfileInfoConfig {
  showBackButton: boolean;
  showCreateButton: boolean;
  showDashboardButton: boolean;
}

export interface ProfileInfoLink {
  label: string;
  route: string;
  icon: string;
  color: string;
  description: string;
}

export interface ModuleStatus {
  name: string;
  status: 'completed' | 'in-progress' | 'pending';
  description: string;
  progress: number;
}