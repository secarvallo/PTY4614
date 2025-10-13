// Interfaces para autenticación avanzada
export interface User {
  id: number;
  email: string;
  password_hash?: string; // Solo para backend
  email_verified: boolean;
  two_fa_enabled: boolean;
  two_fa_secret?: string;
  backup_codes?: string[];
  is_active: boolean;
  failed_login_attempts: number;
  locked_until?: Date;
  password_reset_token?: string;
  password_reset_expires?: Date;
  password_changed_at: Date;
  created_at: Date;
  updated_at: Date;
  last_login?: Date;
  last_login_ip?: string;
  login_count: number;

  // Relación con perfil
  profile?: UserProfile;

  // Propiedades computadas para compatibilidad
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatar?: string;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

export interface UserProfile {
  userId: number; // Changed from user_id to userId for consistency
  nombre: string;
  apellido?: string;
  telefono?: string;
  fecha_nacimiento?: Date;
  avatar_url?: string;
  bio?: string;
  language_preference: string;
  timezone: string;
  created_at: Date;
  updated_at: Date;

  // Propiedades computadas
  firstName: string;
  lastName?: string;
  phone?: string;
  birthDate?: Date;
  avatar?: string;
  language: string;
}

export interface DeviceType {
  id: number;
  type_name: string;
  description?: string;
  created_at: Date;
}

export interface Browser {
  id: number;
  browser_name: string;
  browser_family?: string;
  created_at: Date;
}

export interface OperatingSystem {
  id: number;
  os_name: string;
  os_family?: string;
  created_at: Date;
}

export interface Country {
  id: number;
  country_code: string;
  country_name: string;
  created_at: Date;
}

export interface City {
  id: number;
  country_id: number;
  city_name: string;
  timezone?: string;
  created_at: Date;

  // Relación
  country?: Country;
}

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
  first_used: Date;
  last_used: Date;

  // Datos relacionados
  deviceType?: DeviceType;
  browser?: Browser;
  operatingSystem?: OperatingSystem;
}

// Interfaces para autenticación
export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
  deviceId?: string;
  deviceName?: string;
  deviceFingerprint?: string;
  screenResolution?: string;
  userAgent?: string;
}

export interface LoginResponse {
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  user?: User;
  requiresTwoFactor?: boolean;
  twoFactorToken?: string;
  error?: string;
  sessionId?: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  acceptTerms: boolean;
  acceptPrivacy: boolean;
  acceptMarketing?: boolean; // Campo añadido para compliance de marketing
  deviceId?: string;
  deviceName?: string;
}

export interface RegisterResponse {
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  user?: User;
  error?: string;
  verificationRequired?: boolean;
}

// Interfaces para 2FA
export interface TwoFactorSetupRequest {
  method: 'totp' | 'sms' | 'email';
}

export interface TwoFactorSetupResponse {
  success: boolean;
  qrCode?: string;
  secret?: string;
  backupCodes?: string[];
  error?: string;
}

export interface TwoFactorVerifyRequest {
  code: string;
  token?: string;
  isBackupCode?: boolean;
}

export interface TwoFactorVerifyResponse {
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  user?: User;
  error?: string;
  sessionId?: string;
}

export interface TwoFactorDisableRequest {
  password: string;
  code?: string;
}

// Interfaces para recuperación de contraseña
export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
  confirmPassword: string;
}

export interface ResetPasswordResponse {
  success: boolean;
  message?: string;
  error?: string;
}

// Interfaces para gestión de sesiones
export interface UserSession {
  id: number;
  userId: number; // Changed from user_id to userId for consistency
  device_id: number;
  session_token: string;
  ip_address?: string;
  city_id?: number;
  is_current: boolean;
  created_at: Date;
  last_activity: Date;
  expires_at: Date;

  // Relaciones
  user?: User;
  device?: UserDevice;
  city?: City;

  // Propiedades computadas para compatibilidad
  deviceName?: string;
  deviceType: 'web' | 'mobile' | 'tablet' | 'desktop';
  ipAddress?: string;
  userAgent?: string;
  location?: SessionLocation;
  isActive: boolean;
  isCurrent: boolean;
  lastActivity: Date;
  expiresAt: Date;
}

export interface SessionLocation {
  country?: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
}

export interface SessionsResponse {
  success: boolean;
  sessions?: UserSession[];
  error?: string;
}

export interface RevokeSessionRequest {
  sessionId?: string;
  revokeAll?: boolean;
}

// Interfaces para tokens JWT
export interface JWTPayload {
  sub: string; // user id
  email: string;
  iat: number; // issued at
  exp: number; // expires at
  jti: string; // JWT ID
  sessionId: string;
  deviceId: string;
  twoFactorVerified?: boolean;
}

export interface RefreshTokenRequest {
  refreshToken: string;
  deviceId: string; // Changed back to string for consistency with frontend
}

export interface RefreshTokenResponse {
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  error?: string;
}

// Interfaces para estado de autenticación
export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
  error: string | null;
  requiresTwoFactor: boolean;
  twoFactorToken: string | null;
  sessionId: string | null;
}

// Enums para tipos de autenticación
export enum AuthProvider {
  LOCAL = 'local',
  GOOGLE = 'google',
  FACEBOOK = 'facebook',
  APPLE = 'apple'
}

export enum TwoFactorMethod {
  TOTP = 'totp',
  SMS = 'sms',
  EMAIL = 'email'
}

export enum SessionStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  REVOKED = 'revoked'
}

// Interfaces para vistas de la base de datos
export interface ActiveUserComplete {
  id: number;
  email: string;
  email_verified: boolean;
  two_fa_enabled: boolean;
  last_login?: Date;
  login_count: number;
  failed_login_attempts: number;
  is_active: boolean;
  nombre: string;
  apellido?: string;
  telefono?: string;
  language_preference: string;
  totp_enabled?: boolean;
  email_2fa_enabled?: boolean;
  max_concurrent_sessions?: number;
  notify_new_device?: boolean;
}

export interface ActiveSessionDetailed {
  id: number;
  user_id: number;
  email: string;
  nombre: string;
  apellido?: string;
  device_name?: string;
  device_type?: string;
  browser_name?: string;
  os_name?: string;
  city_name?: string;
  country_name?: string;
  ip_address?: string;
  last_activity: Date;
  expires_at: Date;
}

export interface UserDeviceDetailed {
  id: number;
  user_id: number;
  email: string;
  device_fingerprint: string;
  device_name?: string;
  device_type?: string;
  browser_name?: string;
  os_name?: string;
  is_trusted: boolean;
  first_used: Date;
  last_used: Date;
}
