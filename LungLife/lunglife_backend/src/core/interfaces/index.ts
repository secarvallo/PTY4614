/**
 * 📋 Core Interfaces and Contracts
 * Defines the contracts for all layers in the application
 */

// ========== DOMAIN INTERFACES ==========

export interface User {
  id: number;
  email: string;
  passwordHash: string;
  nombre: string;
  apellido?: string;
  telefono?: string;
  fechaNacimiento?: Date;
  emailVerified: boolean;
  twoFaEnabled: boolean;
  twoFaSecret?: string;
  backupCodes?: string[];
  isActive: boolean;
  failedLoginAttempts: number;
  lockedUntil?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  passwordChangedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
  lastLoginIp?: string;
  loginCount: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface AuthCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
  deviceInfo?: any;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  acceptTerms: boolean;
}

// ========== SERVICE INTERFACES ==========

export interface IAuthService {
  login(credentials: AuthCredentials): Promise<TokenPair | null>;
  register(data: RegisterData): Promise<User>;
  refreshToken(refreshToken: string): Promise<TokenPair | null>;
  logout(userId: number, token?: string): Promise<void>;
  validatePassword(password: string, hash: string): Promise<boolean>;
  hashPassword(password: string): Promise<string>;
}

export interface IJWTService {
  generateTokenPair(userId: number, email: string, deviceInfo?: any): Promise<TokenPair>;
  verifyAndRefreshTokens(refreshToken: string, deviceInfo?: any): Promise<TokenPair | null>;
  revokeRefreshToken(userId: number, token?: string): Promise<void>;
  revokeAllUserTokens(userId: number): Promise<void>;
}

export interface IAuditService {
  logEvent(event: AuditLogEntry): Promise<void>;
  logSuccessfulLogin(userId: number, email: string, ipAddress?: string, userAgent?: string, deviceInfo?: any): Promise<void>;
  logFailedLogin(email: string, reason: string, ipAddress?: string, userAgent?: string): Promise<void>;
  logBlockedLogin(email: string, reason: string, ipAddress?: string, userAgent?: string): Promise<void>;
  logSuccessfulRegistration(userId: number, email: string, ipAddress?: string, userAgent?: string): Promise<void>;
  getUserAuditLogs(userId: number, limit?: number): Promise<AuditLogEntry[]>;
}

export interface IRateLimitService {
  checkLoginAttempt(email: string): Promise<RateLimitResult>;
  recordFailedAttempt(email: string): Promise<void>;
  resetFailedAttempts(email: string): Promise<void>;
  isAccountLocked(email: string): Promise<boolean>;
}

export interface ISecurityService {
  hashPassword(password: string): Promise<string>;
  verifyPassword(password: string, hash: string): Promise<boolean>;
  validatePassword(password: string): Promise<PasswordValidationResult>;
  sanitizeUserData(data: any): any;
  generateSecureToken(length?: number): string;
}

export interface IEmailService {
  sendPasswordResetEmail(email: string, resetToken: string): Promise<void>;
  sendWelcomeEmail(email: string, userName: string): Promise<void>;
  sendTwoFAEnabledEmail(email: string): Promise<void>;
}

// ========== EMAIL INTERFACES ==========

export interface EmailOptions {
  from?: string;
  to: string;
  subject: string;
  html?: string;
  text?: string;
}

export enum EmailTemplate {
  WELCOME = 'welcome',
  PASSWORD_RESET = 'password_reset',
  TWO_FA_ENABLED = 'two_fa_enabled',
}

// ========== REPOSITORY INTERFACES ==========

export interface IUserRepository {
  create(userData: CreateUserDTO): Promise<User>;
  findById(id: number): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  update(id: number, updateData: UpdateUserDTO): Promise<User | null>;
  delete(id: number): Promise<boolean>;
  findMany(filters: UserFilters): Promise<User[]>;
  count(filters?: UserFilters): Promise<number>;
  updatePassword(id: number, newPasswordHash: string): Promise<boolean>;
  emailExists(email: string, excludeId?: number): Promise<boolean>;
  incrementFailedLoginAttempts(id: number): Promise<void>;
  resetFailedLoginAttempts(id: number): Promise<void>;
  lockAccount(id: number, lockUntil: Date): Promise<void>;
  close(): Promise<void>;
}

export interface ITokenRepository {
  saveRefreshToken(tokenData: RefreshTokenData): Promise<void>;
  findRefreshToken(tokenHash: string): Promise<RefreshTokenData | null>;
  deleteRefreshToken(tokenHash: string): Promise<void>;
  deleteUserTokens(userId: number): Promise<void>;
  cleanExpiredTokens(): Promise<void>;
  getUserActiveSessions(userId: number): Promise<RefreshTokenData[]>;
}

export interface IAuditRepository {
  save(entry: AuditLogEntry): Promise<void>;
  findByUserId(userId: number, limit?: number): Promise<AuditLogEntry[]>;
  findRecentEvents(hours?: number): Promise<AuditLogEntry[]>;
  cleanOldLogs(days?: number): Promise<void>;
}

// ========== DATA TRANSFER OBJECTS ==========

export interface AuditLogEntry {
  userId?: number;
  email?: string;
  eventType: AuditEventType;
  ipAddress?: string;
  userAgent?: string;
  deviceInfo?: any;
  metadata?: any;
  success: boolean;
  errorMessage?: string;
  createdAt?: Date;
}

export interface RateLimitResult {
  allowed: boolean;
  remainingAttempts: number;
  message?: string;
  lockoutUntil?: Date;
}

export interface PasswordValidationResult {
  isValid: boolean;
  strength: 'weak' | 'medium' | 'strong';
  errors: string[];
}

export interface RefreshTokenData {
  id: string;
  userId: number;
  tokenHash: string;
  expiresAt: Date;
  deviceInfo?: any;
  ipAddress?: string;
  createdAt?: Date;
}

// ========== USER DTOs ==========

export interface CreateUserDTO {
  email: string;
  passwordHash: string;
  nombre: string;
  apellido?: string;
  telefono?: string;
  fechaNacimiento?: Date;
  emailVerified?: boolean;
  twoFaEnabled?: boolean;
}

export interface UpdateUserDTO {
  nombre?: string;
  apellido?: string;
  telefono?: string;
  fechaNacimiento?: Date;
  emailVerified?: boolean;
  twoFaEnabled?: boolean;
  twoFaSecret?: string;
  backupCodes?: string[];
  failedLoginAttempts?: number;
  lockedUntil?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  lastLogin?: Date;
  lastLoginIp?: string;
  loginCount?: number;
}

export interface UserFilters {
  email?: string;
  nombre?: string;
  apellido?: string;
  emailVerified?: boolean;
  twoFaEnabled?: boolean;
  limit?: number;
  offset?: number;
}

// ========== ENUMS ==========

export enum AuditEventType {
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILED = 'LOGIN_FAILED',
  LOGIN_BLOCKED = 'LOGIN_BLOCKED',
  LOGOUT = 'LOGOUT',
  REGISTER_SUCCESS = 'REGISTER_SUCCESS',
  REGISTER_FAILED = 'REGISTER_FAILED',
  PASSWORD_RESET_REQUEST = 'PASSWORD_RESET_REQUEST',
  PASSWORD_RESET_SUCCESS = 'PASSWORD_RESET_SUCCESS',
  PASSWORD_RESET_FAILED = 'PASSWORD_RESET_FAILED',
  TWO_FA_SETUP = 'TWO_FA_SETUP',
  TWO_FA_ENABLED = 'TWO_FA_ENABLED',
  TWO_FA_DISABLED = 'TWO_FA_DISABLED',
  TWO_FA_VERIFIED = 'TWO_FA_VERIFIED',
  TWO_FA_FAILED = 'TWO_FA_FAILED',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  ACCOUNT_UNLOCKED = 'ACCOUNT_UNLOCKED',
  EMAIL_VERIFIED = 'EMAIL_VERIFIED',
  TOKEN_REFRESH = 'TOKEN_REFRESH'
}

// ========== HTTP INTERFACES ==========

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  errorCode?: string;
  message?: string;
  timestamp?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ========== CONFIGURATION INTERFACES ==========
// Re-export from centralized config interfaces
export type {
  DatabaseConfig,
  JWTConfig,
  SecurityConfig,
  EmailConfig,
  AppConfig
} from './config.interface';