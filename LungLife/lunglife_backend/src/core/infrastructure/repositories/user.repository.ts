/**
 * User Repository Implementation
 * Implementación concreta del repositorio de usuarios
 * Actualizado para BD v5.0 con estructura normalizada:
 *   - users: datos básicos de autenticación
 *   - user_auth: credenciales y seguridad
 *   - patient/doctor: datos de perfil
 */

import { IDatabaseConnection } from '../../interfaces/database.interface';
import { IUser, IUserRepository } from '../../interfaces/repository.interface';
import { Logger } from '../../services/logger.service';

// Constantes para roles
const ROLE_IDS = {
  PATIENT: 1,
  DOCTOR: 2,
  ADMINISTRATOR: 3
} as const;

export class UserRepository implements IUserRepository {
  private db: IDatabaseConnection;
  private logger: Logger;

  constructor(db: IDatabaseConnection, logger: Logger) {
    this.db = db;
    this.logger = logger;
  }

  /**
   * Convierte role_id a nombre de rol
   */
  private mapRoleIdToRole(roleId: number): 'PATIENT' | 'DOCTOR' | 'ADMINISTRATOR' {
    switch (roleId) {
      case ROLE_IDS.PATIENT:
        return 'PATIENT';
      case ROLE_IDS.DOCTOR:
        return 'DOCTOR';
      case ROLE_IDS.ADMINISTRATOR:
        return 'ADMINISTRATOR';
      default:
        return 'PATIENT'; // Default fallback
    }
  }

  /**
   * Mapea el resultado de la BD al interface IUser
   * Combina datos de users + user_auth
   */
  private mapToUser(row: any): IUser {
    const roleId = row.role_id ?? ROLE_IDS.PATIENT;
    return {
      id: row.user_id || row.id,
      email: row.email,
      password_hash: row.password_hash,
      nombre: row.nombre || row.patient_name || row.doctor_name,
      apellido: row.apellido || row.patient_last_name || row.doctor_last_name,
      phone: row.phone,
      fecha_nacimiento: row.date_of_birth,
      email_verified: row.email_verified ?? false,
      two_fa_enabled: row.two_fa_enabled ?? false,
      two_fa_secret: row.two_fa_secret,
      is_active: row.is_active ?? true,
      failed_login_attempts: row.failed_login_attempts ?? 0,
      locked_until: row.account_locked_until || row.locked_until,
      role_id: roleId,
      role: this.mapRoleIdToRole(roleId),
      password_reset_token: row.password_reset_token,
      password_reset_expires: row.password_reset_expires,
      password_changed_at: row.password_changed_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
      last_login_at: row.last_login,
      login_count: row.login_count ?? 0,
      accept_terms: row.accept_terms ?? false,
      accept_privacy: row.accept_privacy ?? false,
      marketing_consent: row.marketing_consent ?? false
    };
  }

  /**
   * Query base para obtener usuario completo con JOIN a user_auth
   */
  private getBaseUserQuery(): string {
    return `
      SELECT 
        u.user_id,
        u.email,
        u.email_verified,
        u.last_login,
        u.login_count,
        u.accept_terms,
        u.accept_privacy,
        u.marketing_consent,
        u.is_active,
        u.role_id,
        u.created_at,
        u.updated_at,
        ua.password_hash,
        ua.two_fa_enabled,
        ua.two_fa_secret,
        ua.failed_login_attempts,
        ua.account_locked_until,
        ua.password_changed_at
      FROM users u
      LEFT JOIN user_auth ua ON u.user_id = ua.user_id
    `;
  }

  async findById(id: number): Promise<IUser | null> {
    try {
      const query = `${this.getBaseUserQuery()} WHERE u.user_id = $1`;
      const result = await this.db.query<any>(query, [id]);
      return result.length > 0 ? this.mapToUser(result[0]) : null;
    } catch (error) {
      this.logger.error(`Error finding user by id ${id}:`, error);
      throw error;
    }
  }

  async findAll(): Promise<IUser[]> {
    try {
      const query = `${this.getBaseUserQuery()} ORDER BY u.created_at DESC`;
      const result = await this.db.query<any>(query);
      return result.map(row => this.mapToUser(row));
    } catch (error) {
      this.logger.error('Error finding all users:', error);
      throw error;
    }
  }

  async findBy(criteria: Partial<IUser>): Promise<IUser[]> {
    try {
      const conditions: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      // Mapear campos de IUser a columnas de BD
      const fieldMapping: Record<string, string> = {
        id: 'u.user_id',
        email: 'u.email',
        email_verified: 'u.email_verified',
        is_active: 'u.is_active',
        accept_terms: 'u.accept_terms',
        accept_privacy: 'u.accept_privacy'
      };

      Object.entries(criteria).forEach(([key, value]) => {
        if (value !== undefined && fieldMapping[key]) {
          conditions.push(`${fieldMapping[key]} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
      });

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const query = `${this.getBaseUserQuery()} ${whereClause} ORDER BY u.created_at DESC`;

      const result = await this.db.query<any>(query, values);
      return result.map(row => this.mapToUser(row));
    } catch (error) {
      this.logger.error('Error finding users by criteria:', error);
      throw error;
    }
  }

  /**
   * Crea un nuevo usuario en la BD v5.0
   * Inserta en: users + user_auth (transacción)
   */
  async create(user: Omit<IUser, 'id'>): Promise<IUser> {
    try {
      this.logger.info('Creating user - Step 1: Insert into users table', {
        email: user.email,
        accept_terms: user.accept_terms,
        accept_privacy: user.accept_privacy
      });

      // 1. Insertar en tabla users
      const userResult = await this.db.query<any>(
        `INSERT INTO users (
          email, email_verified, login_count,
          accept_terms, accept_privacy, marketing_consent,
          is_active, role_id, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING user_id, email, email_verified, login_count, 
                  accept_terms, accept_privacy, marketing_consent,
                  is_active, role_id, created_at, updated_at`,
        [
          user.email.toLowerCase().trim(),
          user.email_verified ?? false,
          user.login_count ?? 0,
          user.accept_terms ?? false,
          user.accept_privacy ?? false,
          user.marketing_consent ?? false,
          user.is_active ?? true,
          ROLE_IDS.PATIENT, // Por defecto, rol PATIENT
          user.created_at || new Date(),
          user.updated_at || new Date()
        ]
      );

      this.logger.info('User inserted into users table', { result: userResult[0] });

      const newUserId = userResult[0].user_id;

      this.logger.info('Creating user - Step 2: Insert into user_auth table', { user_id: newUserId });

      // 2. Insertar en tabla user_auth (credenciales)
      await this.db.query(
        `INSERT INTO user_auth (
          user_id, password_hash, two_fa_enabled, two_fa_secret,
          failed_login_attempts, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          newUserId,
          user.password_hash,
          user.two_fa_enabled ?? false,
          user.two_fa_secret || null,
          user.failed_login_attempts ?? 0,
          user.created_at || new Date(),
          user.updated_at || new Date()
        ]
      );

      // 3. Si es PACIENTE, crear registro en tabla patient
      const roleId = user.role_id ?? ROLE_IDS.PATIENT;
      if (roleId === ROLE_IDS.PATIENT) {
        this.logger.info('Creating user - Step 3: Insert into patient table', { user_id: newUserId });
        await this.db.query(
          `INSERT INTO patient (
            user_id, patient_name, patient_last_name, country, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            newUserId,
            user.nombre || '',
            user.apellido || '',
            'Chile', // Default country
            user.created_at || new Date(),
            user.updated_at || new Date()
          ]
        );
        this.logger.info(`Patient record created for user_id: ${newUserId}`);
      }

      this.logger.info(`User created successfully with email: ${user.email}, user_id: ${newUserId}`);

      // 3. Retornar usuario completo
      const createdUser = await this.findById(newUserId);
      if (!createdUser) {
        throw new Error('Failed to retrieve created user');
      }
      return createdUser;

    } catch (error: any) {
      this.logger.error(`Error creating user with email ${user.email}:`, error);
      this.logger.error('PostgreSQL Error Details:', {
        message: error.message,
        code: error.code,
        detail: error.detail,
        hint: error.hint,
        column: error.column,
        table: error.table,
        constraint: error.constraint,
        routine: error.routine
      });
      
      // Manejar error de email duplicado
      if (error.code === '23505' && error.constraint?.includes('email')) {
        const duplicateError = new Error('Email already exists') as any;
        duplicateError.code = 'EMAIL_EXISTS';
        throw duplicateError;
      }
      
      throw error;
    }
  }

  async update(id: number, userData: Partial<IUser>): Promise<IUser | null> {
    try {
      const now = new Date();

      // Separar campos para users vs user_auth
      const userFields: string[] = [];
      const userValues: any[] = [];
      const authFields: string[] = [];
      const authValues: any[] = [];

      // Campos que van en tabla users
      const userFieldMapping: Record<string, string> = {
        email: 'email',
        email_verified: 'email_verified',
        is_active: 'is_active',
        accept_terms: 'accept_terms',
        accept_privacy: 'accept_privacy',
        marketing_consent: 'marketing_consent',
        last_login_at: 'last_login',
        login_count: 'login_count'
      };

      // Campos que van en tabla user_auth
      const authFieldMapping: Record<string, string> = {
        password_hash: 'password_hash',
        two_fa_enabled: 'two_fa_enabled',
        two_fa_secret: 'two_fa_secret',
        failed_login_attempts: 'failed_login_attempts',
        locked_until: 'account_locked_until',
        password_changed_at: 'password_changed_at'
      };

      let userParamIndex = 1;
      let authParamIndex = 1;

      Object.entries(userData).forEach(([key, value]) => {
        if (value !== undefined) {
          if (userFieldMapping[key]) {
            userFields.push(`${userFieldMapping[key]} = $${userParamIndex}`);
            userValues.push(value);
            userParamIndex++;
          } else if (authFieldMapping[key]) {
            authFields.push(`${authFieldMapping[key]} = $${authParamIndex}`);
            authValues.push(value);
            authParamIndex++;
          }
        }
      });

      // Actualizar tabla users si hay campos
      if (userFields.length > 0) {
        userFields.push(`updated_at = $${userParamIndex}`);
        userValues.push(now);
        userParamIndex++;
        userValues.push(id);

        await this.db.query(
          `UPDATE users SET ${userFields.join(', ')} WHERE user_id = $${userParamIndex}`,
          userValues
        );
      }

      // Actualizar tabla user_auth si hay campos
      if (authFields.length > 0) {
        authFields.push(`updated_at = $${authParamIndex}`);
        authValues.push(now);
        authParamIndex++;
        authValues.push(id);

        await this.db.query(
          `UPDATE user_auth SET ${authFields.join(', ')} WHERE user_id = $${authParamIndex}`,
          authValues
        );
      }

      this.logger.info(`User updated successfully with id: ${id}`);
      return await this.findById(id);

    } catch (error) {
      this.logger.error(`Error updating user with id ${id}:`, error);
      throw error;
    }
  }

  async delete(id: number): Promise<boolean> {
    try {
      // user_auth se elimina automáticamente por ON DELETE CASCADE
      const result = await this.db.query(
        'DELETE FROM users WHERE user_id = $1 RETURNING user_id',
        [id]
      );
      
      const deleted = result.length > 0;
      if (deleted) {
        this.logger.info(`User deleted successfully with id: ${id}`);
      }
      
      return deleted;
    } catch (error) {
      this.logger.error(`Error deleting user with id ${id}:`, error);
      throw error;
    }
  }

  async exists(id: number): Promise<boolean> {
    try {
      const result = await this.db.query(
        'SELECT 1 FROM users WHERE user_id = $1',
        [id]
      );
      return result.length > 0;
    } catch (error) {
      this.logger.error(`Error checking if user exists with id ${id}:`, error);
      throw error;
    }
  }

  async count(criteria?: Partial<IUser>): Promise<number> {
    try {
      let query = 'SELECT COUNT(*) as count FROM users u';
      const values: any[] = [];

      if (criteria && Object.keys(criteria).length > 0) {
        const conditions: string[] = [];
        let paramIndex = 1;

        const fieldMapping: Record<string, string> = {
          email: 'u.email',
          is_active: 'u.is_active',
          email_verified: 'u.email_verified'
        };

        Object.entries(criteria).forEach(([key, value]) => {
          if (value !== undefined && fieldMapping[key]) {
            conditions.push(`${fieldMapping[key]} = $${paramIndex}`);
            values.push(value);
            paramIndex++;
          }
        });

        if (conditions.length > 0) {
          query += ` WHERE ${conditions.join(' AND ')}`;
        }
      }

      const result = await this.db.query<{ count: string }>(query, values);
      return parseInt(result[0].count, 10);
    } catch (error) {
      this.logger.error('Error counting users:', error);
      throw error;
    }
  }

  async findByEmail(email: string): Promise<IUser | null> {
    try {
      const query = `${this.getBaseUserQuery()} WHERE LOWER(u.email) = LOWER($1)`;
      const result = await this.db.query<any>(query, [email.trim()]);
      return result.length > 0 ? this.mapToUser(result[0]) : null;
    } catch (error) {
      this.logger.error(`Error finding user by email ${email}:`, error);
      throw error;
    }
  }

  async emailExists(email: string): Promise<boolean> {
    try {
      const result = await this.db.query(
        'SELECT 1 FROM users WHERE LOWER(email) = LOWER($1)',
        [email.trim()]
      );
      return result.length > 0;
    } catch (error) {
      this.logger.error(`Error checking if email exists ${email}:`, error);
      throw error;
    }
  }

  async updateLastLogin(userId: number, ipAddress?: string): Promise<void> {
    try {
      await this.db.query(
        `UPDATE users SET 
         last_login = $1, 
         login_count = login_count + 1,
         updated_at = $2
         WHERE user_id = $3`,
        [new Date(), new Date(), userId]
      );

      this.logger.info(`Last login updated for user ${userId}`);
    } catch (error) {
      this.logger.error(`Error updating last login for user ${userId}:`, error);
      throw error;
    }
  }

  async incrementFailedAttempts(userId: number): Promise<void> {
    try {
      await this.db.query(
        `UPDATE user_auth SET 
         failed_login_attempts = failed_login_attempts + 1, 
         updated_at = $1 
         WHERE user_id = $2`,
        [new Date(), userId]
      );

      this.logger.warn(`Failed login attempts incremented for user ${userId}`);
    } catch (error) {
      this.logger.error(`Error incrementing failed attempts for user ${userId}:`, error);
      throw error;
    }
  }

  async resetFailedAttempts(userId: number): Promise<void> {
    try {
      await this.db.query(
        `UPDATE user_auth SET 
         failed_login_attempts = 0, 
         account_locked_until = NULL, 
         updated_at = $1 
         WHERE user_id = $2`,
        [new Date(), userId]
      );

      this.logger.info(`Failed login attempts reset for user ${userId}`);
    } catch (error) {
      this.logger.error(`Error resetting failed attempts for user ${userId}:`, error);
      throw error;
    }
  }

  async findActiveUsers(): Promise<IUser[]> {
    try {
      const query = `${this.getBaseUserQuery()} 
                     WHERE u.is_active = true 
                     ORDER BY u.last_login DESC NULLS LAST`;
      const result = await this.db.query<any>(query);
      return result.map(row => this.mapToUser(row));
    } catch (error) {
      this.logger.error('Error finding active users:', error);
      throw error;
    }
  }

  async lockUser(userId: number, lockUntil: Date): Promise<void> {
    try {
      await this.db.query(
        `UPDATE user_auth SET 
         account_locked_until = $1, 
         updated_at = $2 
         WHERE user_id = $3`,
        [lockUntil, new Date(), userId]
      );

      this.logger.warn(`User ${userId} locked until ${lockUntil}`);
    } catch (error) {
      this.logger.error(`Error locking user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Obtiene el rol de un usuario
   */
  async getUserRole(userId: number): Promise<string | null> {
    try {
      const result = await this.db.query<{ role_name: string }>(
        `SELECT r.role_name 
         FROM users u 
         JOIN roles r ON u.role_id = r.role_id 
         WHERE u.user_id = $1`,
        [userId]
      );
      return result.length > 0 ? result[0].role_name : null;
    } catch (error) {
      this.logger.error(`Error getting role for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Actualiza el rol de un usuario
   */
  async updateUserRole(userId: number, roleName: string): Promise<void> {
    try {
      await this.db.query(
        `UPDATE users SET 
         role_id = (SELECT role_id FROM roles WHERE role_name = $1),
         updated_at = $2
         WHERE user_id = $3`,
        [roleName.toUpperCase(), new Date(), userId]
      );

      this.logger.info(`User ${userId} role updated to ${roleName}`);
    } catch (error) {
      this.logger.error(`Error updating role for user ${userId}:`, error);
      throw error;
    }
  }
}