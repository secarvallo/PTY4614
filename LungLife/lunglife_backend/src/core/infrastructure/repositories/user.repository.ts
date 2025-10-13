/**
 * 👤 User Repository Implementation
 * Implementación concreta del repositorio de usuarios
 * Sigue patrón Repository con Clean Architecture
 */

import { IDatabaseConnection } from '../../interfaces/database.interface';
import { IUser, IUserRepository } from '../../interfaces/repository.interface';
import { Logger } from '../../services/logger.service';

export class UserRepository implements IUserRepository {
  private db: IDatabaseConnection;
  private logger: Logger;

  constructor(db: IDatabaseConnection, logger: Logger) {
    this.db = db;
    this.logger = logger;
  }

  async findById(id: number): Promise<IUser | null> {
    try {
      const result = await this.db.query<IUser>(
        'SELECT * FROM users WHERE id = $1',
        [id]
      );
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      this.logger.error(`Error finding user by id ${id}:`, error);
      throw error;
    }
  }

  async findAll(): Promise<IUser[]> {
    try {
      return await this.db.query<IUser>('SELECT * FROM users ORDER BY created_at DESC');
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

      Object.entries(criteria).forEach(([key, value]) => {
        if (value !== undefined) {
          conditions.push(`${key} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
      });

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const query = `SELECT * FROM users ${whereClause} ORDER BY created_at DESC`;

      return await this.db.query<IUser>(query, values);
    } catch (error) {
      this.logger.error('Error finding users by criteria:', error);
      throw error;
    }
  }

  async create(user: Omit<IUser, 'id'>): Promise<IUser> {
    try {
      const result = await this.db.query<IUser>(
        `INSERT INTO users (
          email, password_hash, nombre, apellido, phone, fecha_nacimiento,
          email_verified, two_fa_enabled, is_active, created_at, updated_at,
          accept_terms, accept_privacy, marketing_consent
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *`,
        [
          user.email,
          user.password_hash,
          user.nombre,
          user.apellido,
          user.phone,
          user.fecha_nacimiento,
          user.email_verified,
          user.two_fa_enabled,
          user.is_active,
          user.created_at,
          user.updated_at,
          user.accept_terms,
          user.accept_privacy,
          user.marketing_consent
        ]
      );

      this.logger.info(`User created successfully with email: ${user.email}`);
      return result[0];
    } catch (error) {
      this.logger.error(`Error creating user with email ${user.email}:`, error);
      throw error;
    }
  }

  async update(id: number, userData: Partial<IUser>): Promise<IUser | null> {
    try {
      const setClause: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      // Añadir updated_at automáticamente
      userData.updated_at = new Date();

      Object.entries(userData).forEach(([key, value]) => {
        if (value !== undefined && key !== 'id') {
          setClause.push(`${key} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
      });

      if (setClause.length === 0) {
        return await this.findById(id);
      }

      values.push(id);
      const query = `UPDATE users SET ${setClause.join(', ')} WHERE id = $${paramIndex} RETURNING *`;

      const result = await this.db.query<IUser>(query, values);
      
      if (result.length > 0) {
        this.logger.info(`User updated successfully with id: ${id}`);
        return result[0];
      }
      
      return null;
    } catch (error) {
      this.logger.error(`Error updating user with id ${id}:`, error);
      throw error;
    }
  }

  async delete(id: number): Promise<boolean> {
    try {
      const result = await this.db.query(
        'DELETE FROM users WHERE id = $1',
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
        'SELECT 1 FROM users WHERE id = $1',
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
      let query = 'SELECT COUNT(*) as count FROM users';
      const values: any[] = [];

      if (criteria && Object.keys(criteria).length > 0) {
        const conditions: string[] = [];
        let paramIndex = 1;

        Object.entries(criteria).forEach(([key, value]) => {
          if (value !== undefined) {
            conditions.push(`${key} = $${paramIndex}`);
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
      const result = await this.db.query<IUser>(
        'SELECT * FROM users WHERE email = $1',
        [email.toLowerCase()]
      );
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      this.logger.error(`Error finding user by email ${email}:`, error);
      throw error;
    }
  }

  async emailExists(email: string): Promise<boolean> {
    try {
      const result = await this.db.query(
        'SELECT 1 FROM users WHERE email = $1',
        [email.toLowerCase()]
      );
      return result.length > 0;
    } catch (error) {
      this.logger.error(`Error checking if email exists ${email}:`, error);
      throw error;
    }
  }

  async updateLastLogin(userId: number, ipAddress?: string): Promise<void> {
    try {
      const updateData: any = {
        last_login: new Date(),
        updated_at: new Date()
      };

      if (ipAddress) {
        updateData.last_login_ip = ipAddress;
      }

      await this.db.query(
        `UPDATE users SET 
         last_login = $1, 
         last_login_ip = $2, 
         login_count = login_count + 1,
         updated_at = $3
         WHERE id = $4`,
        [updateData.last_login, ipAddress, updateData.updated_at, userId]
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
        'UPDATE users SET failed_login_attempts = failed_login_attempts + 1, updated_at = $1 WHERE id = $2',
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
        'UPDATE users SET failed_login_attempts = 0, locked_until = NULL, updated_at = $1 WHERE id = $2',
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
      return await this.db.query<IUser>(
        'SELECT * FROM users WHERE is_active = true ORDER BY last_login DESC'
      );
    } catch (error) {
      this.logger.error('Error finding active users:', error);
      throw error;
    }
  }
}