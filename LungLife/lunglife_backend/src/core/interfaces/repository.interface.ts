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
   * Crear nueva entidad
   */
  create(entity: Omit<T, 'id'>): Promise<T>;
  
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
  two_fa_temp_secret?: string;    // Secreto temporal antes de verificar
  two_fa_backup_codes?: string[];  // Códigos de respaldo
  is_active: boolean;
  failed_login_attempts: number;
  locked_until?: Date;
  
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

  // ===== CAMPOS DE COMPATIBILIDAD CON FRONTEND =====
  // Getters virtuales para mantener compatibilidad
  firstName?: string;    // -> mapea a nombre
  lastName?: string;     // -> mapea a apellido
  emailVerified?: boolean; // -> mapea a email_verified
  twoFAEnabled?: boolean;  // -> mapea a two_fa_enabled
  isActive?: boolean;      // -> mapea a is_active
  createdAt?: Date;        // -> mapea a created_at
  updatedAt?: Date;        // -> mapea a updated_at
  lastLogin?: Date;        // -> mapea a last_login_at
  birthDate?: string;      // -> mapea a fecha_nacimiento
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
   * Buscar usuario por ID (string)
   */
  findByUserId(userId: string): Promise<IUser | null>;
  
  /**
   * Actualizar secreto temporal de 2FA
   */
  updateTempTwoFactorSecret(userId: string, tempSecret: string, backupCodes: string[]): Promise<void>;
  
  /**
   * Activar 2FA permanentemente
   */
  activateTwoFactor(userId: string, secret: string): Promise<void>;
  
  /**
   * Desactivar 2FA
   */
  disableTwoFactor(userId: string): Promise<void>;
}