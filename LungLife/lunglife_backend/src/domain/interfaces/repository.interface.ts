/**
 * 🏛️ Base Repository Interface
 * Abstracción base para todos los repositorios
 * Implementa patrón Repository con principios SOLID
 */

export interface IRepository<T, ID = number> {
  /**
   * Buscar entidad por ID
   */
  findById(id: ID): Promise<T | null>;
  
  /**
   * Buscar todas las entidades
   */
  findAll(): Promise<T[]>;
  
  /**
   * Buscar entidades con filtros
   */
  findBy(criteria: Partial<T>): Promise<T[]>;
  
  /**
   * Crear nueva entidad (acepta DTO o entidad parcial)
   */
  create(entity: any): Promise<T>;
  
  /**
   * Actualizar entidad existente
   */
  update(id: ID, entity: Partial<T>): Promise<T | null>;
  
  /**
   * Eliminar entidad
   */
  delete(id: ID): Promise<boolean>;
  
  /**
   * Verificar si entidad existe
   */
  exists(id: ID): Promise<boolean>;
  
  /**
   * Contar entidades con criterios
   */
  count(criteria?: Partial<T>): Promise<number>;
}

/**
 * 🔄 Unit of Work Interface
 * Maneja transacciones y coordina repositorios
 */
export interface IUnitOfWork {
  /**
   * Inicia una nueva unidad de trabajo
   */
  start(): Promise<void>;
  
  /**
   * Confirma todos los cambios
   */
  commit(): Promise<void>;
  
  /**
   * Revierte todos los cambios
   */
  rollback(): Promise<void>;
  
  /**
   * Obtiene un repositorio específico
   */
  getRepository<T>(repositoryType: new (...args: any[]) => T): T;
  
  /**
   * Verifica si hay una transacción activa
   */
  isActive(): boolean;
}

/**
 * 🎭 User Role Type
 */
export type UserRole = 'PATIENT' | 'DOCTOR' | 'ADMINISTRATOR';

/**
 * 👤 User Entity Interface
 */
export interface IUser {
  id: number;
  email: string;
  password_hash: string;
  nombre: string;
  apellido?: string;
  phone?: string;
  fecha_nacimiento?: string; // Fecha de nacimiento
  email_verified: boolean;
  two_fa_enabled: boolean;
  two_fa_secret?: string;
  is_active: boolean;
  failed_login_attempts: number;
  locked_until?: Date;
  
  // Role fields - Para navegación post-login (opcionales, se obtienen de la BD)
  role_id?: number;           // 1=PATIENT, 2=DOCTOR, 3=ADMINISTRATOR
  role?: UserRole;            // Nombre del rol para uso en frontend
  
  // Password reset fields
  password_reset_token?: string;
  password_reset_expires?: Date;
  password_changed_at?: Date;
  
  created_at: Date;
  updated_at: Date;
  last_login_at?: Date;
  login_count: number;
  // Campos de aceptación - CRÍTICOS PARA COMPLIANCE
  accept_terms: boolean;      // OBLIGATORIO: Términos y condiciones
  accept_privacy: boolean;    // OBLIGATORIO: Política de privacidad  
  marketing_consent?: boolean; // OPCIONAL: Marketing/comunicaciones
}

/**
 * 👤 User Repository Interface
 */
export interface IUserRepository extends IRepository<IUser> {
  /**
   * Buscar usuario por email
   */
  findByEmail(email: string): Promise<IUser | null>;
  
  /**
   * Verificar si email existe
   */
  emailExists(email: string): Promise<boolean>;
  
  /**
   * Actualizar último login
   */
  updateLastLogin(userId: number, ipAddress?: string): Promise<void>;
  
  /**
   * Incrementar intentos fallidos de login
   */
  incrementFailedAttempts(userId: number): Promise<void>;
  
  /**
   * Resetear intentos fallidos
   */
  resetFailedAttempts(userId: number): Promise<void>;
  
  /**
   * Buscar usuarios activos
   */
  findActiveUsers(): Promise<IUser[]>;
  
  /**
   * Bloquear usuario hasta una fecha específica
   */
  lockUser(userId: number, lockUntil: Date): Promise<void>;

  /**
   * Obtener el rol de un usuario
   */
  getUserRole(userId: number): Promise<string | null>;

  /**
   * Actualizar el rol de un usuario
   */
  updateUserRole(userId: number, roleName: string): Promise<void>;
}

/**
 * 🔑 Refresh Token Entity Interface
 */
export interface IRefreshToken {
  id: number;
  user_id: number;
  token_hash: string;
  jti: string;
  user_agent?: string;
  ip_address?: string;
  device_fingerprint?: string;
  issued_at: Date;
  expires_at: Date;
  revoked_at?: Date;
  is_revoked: boolean;
  revocation_reason?: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * 🔑 Refresh Token Repository Interface
 */
export interface IRefreshTokenRepository extends IRepository<IRefreshToken> {
  /**
   * Find token by token hash
   */
  findByTokenHash(tokenHash: string): Promise<IRefreshToken | null>;
  
  /**
   * Find token by JWT ID
   */
  findByJti(jti: string): Promise<IRefreshToken | null>;
  
  /**
   * Find all active tokens for a user
   */
  findActiveTokensByUserId(userId: number): Promise<IRefreshToken[]>;
  
  /**
   * Revoke a specific token
   */
  revokeToken(tokenHash: string, reason: string): Promise<boolean>;
  
  /**
   * Revoke all tokens for a user
   */
  revokeAllUserTokens(userId: number, reason: string): Promise<number>;
  
  /**
   * Delete expired tokens (cleanup)
   */
  deleteExpiredTokens(): Promise<number>;
}