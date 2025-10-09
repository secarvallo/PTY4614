import { Observable } from 'rxjs';

// Tablas maestras
export interface Country {
  id: number;
  country_code: string;
  country_name: string;
  created_at?: Date;
}

export interface City {
  id: number;
  country_id: number;
  city_name: string;
  timezone?: string;
  created_at?: Date;
}

export interface DeviceType {
  id: number;
  type_name: string;
  description?: string;
  created_at?: Date;
}

export interface Browser {
  id: number;
  browser_name: string;
  browser_family?: string;
  created_at?: Date;
}

export interface OperatingSystem {
  id: number;
  os_name: string;
  os_family?: string;
  created_at?: Date;
}

// Datos personales
export interface UserProfile {
  user_id: number;
  nombre: string;
  apellido?: string;
  telefono?: string;
  fecha_nacimiento?: Date;
  avatar_url?: string;
  bio?: string;
  language_preference?: string;
  timezone?: string;
  created_at?: Date;
  updated_at?: Date;
}

// Configuración de seguridad
export interface UserSecuritySettings {
  id: number;
  user_id: number;
  totp_enabled: boolean;
  email_2fa_enabled: boolean;
  sms_2fa_enabled: boolean;
  backup_codes_generated: boolean;
  password_expiry_days: number;
  require_password_change: boolean;
  notify_new_device: boolean;
  notify_location_change: boolean;
  notify_password_change: boolean;
  notify_login_attempt: boolean;
  max_concurrent_sessions: number;
  session_timeout_minutes: number;
  allowed_countries?: number[];
  created_at?: Date;
  updated_at?: Date;
}

// Dispositivos
export interface UserDevice {
  id: number;
  user_id: number;
  device_fingerprint: string;
  device_name?: string;
  device_type_id?: number;
  browser_id?: number;
  os_id?: number;
  user_agent?: string;
  screen_resolution?: string;
  is_trusted: boolean;
  first_used?: Date;
  last_used?: Date;
}

// Sesiones
export interface UserSession {
  id: number;
  user_id: number;
  device_id: number;
  session_token: string;
  ip_address?: string;
  city_id?: number;
  is_current: boolean;
  created_at?: Date;
  last_activity?: Date;
  expires_at: Date;
}

// Usuario principal
export interface User {
  id: number;
  email: string;
  email_verified: boolean;
  two_fa_enabled: boolean;
  is_active: boolean;
  failed_login_attempts: number;
  locked_until?: Date;
  password_changed_at?: Date;
  created_at: Date;
  updated_at?: Date;
  last_login?: Date;
  last_login_ip?: string;
  login_count: number;
  profile?: UserProfile;
  security_settings?: UserSecuritySettings;
  devices?: UserDevice[];
  sessions?: UserSession[];
  // --- Compatibilidad con código previo (camelCase) ---
  firstName?: string; // -> profile.nombre
  lastName?: string; // -> profile.apellido
  isEmailVerified?: boolean; // -> email_verified
  twoFAEnabled?: boolean; // -> two_fa_enabled
  createdAt?: Date; // -> created_at
  updatedAt?: Date; // -> updated_at
  lastLogin?: Date; // -> last_login
  phone?: string; // -> profile.telefono
  birthDate?: Date; // -> profile.fecha_nacimiento
  isActive?: boolean; // -> is_active
  avatar?: string; // -> profile.avatar_url
  role?: string; // (si se agrega en backend futuro)
}

export interface AuthCredentials {
  username?: string; // opcional porque el formulario usa email
  email?: string;    // compatibilidad con backend
  password: string;
  rememberMe?: boolean;
}

export interface RegisterData {
  username: string;
  password: string;
  email: string;
  firstName?: string;
  lastName?: string;
  acceptTerms?: boolean;
}

export interface AuthState {
  isAuthenticated$: Observable<boolean>;
  loading$: Observable<boolean>;
  error$: Observable<string | null>;
  requiresTwoFA$: Observable<boolean>;
  user$: Observable<User | null>;
}
