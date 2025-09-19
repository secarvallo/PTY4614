/**
 * 📊 User Repository Implementation
 * PostgreSQL implementation of IUserRepository
 */

import { Pool, PoolClient } from 'pg';
import { IUserRepository, User, CreateUserDTO, UpdateUserDTO, UserFilters } from '../core/interfaces/index';
import { Injectable } from '../core/di/container';
import { config } from '../core/config/config';

@Injectable()
export class UserRepository implements IUserRepository {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      host: config.getDatabaseConfig().host,
      port: config.getDatabaseConfig().port,
      database: config.getDatabaseConfig().database,
      user: config.getDatabaseConfig().user,
      password: config.getDatabaseConfig().password,
      max: config.getDatabaseConfig().maxConnections,
      idleTimeoutMillis: config.getDatabaseConfig().idleTimeoutMillis,
      connectionTimeoutMillis: config.getDatabaseConfig().connectionTimeoutMillis,
    });

    // Handle connection errors
    this.pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
      process.exit(-1);
    });
  }

  /**
   * Create a new user
   */
  async create(userData: CreateUserDTO): Promise<User> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const query = `
        INSERT INTO users (
          email, password_hash, nombre, apellido, telefono, fecha_nacimiento,
          email_verified, two_fa_enabled, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *
      `;

      const values = [
        userData.email,
        userData.passwordHash,
        userData.nombre,
        userData.apellido || null,
        userData.telefono || null,
        userData.fechaNacimiento || null,
        userData.emailVerified || false,
        userData.twoFaEnabled || false,
      ];

      const result = await client.query(query, values);
      await client.query('COMMIT');

      return this.mapRowToUser(result.rows[0]);

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Find user by ID
   */
  async findById(id: number): Promise<User | null> {
    const client = await this.pool.connect();

    try {
      const query = 'SELECT * FROM users WHERE id = $1 AND is_active = true';
      const result = await client.query(query, [id]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToUser(result.rows[0]);

    } finally {
      client.release();
    }
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    const client = await this.pool.connect();

    try {
      const query = 'SELECT * FROM users WHERE email = $1';
      const result = await client.query(query, [email]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToUser(result.rows[0]);

    } finally {
      client.release();
    }
  }

  /**
   * Update user by ID
   */
  async update(id: number, updateData: UpdateUserDTO): Promise<User | null> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const fields: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      // Build dynamic update query
      if (updateData.nombre !== undefined) {
        fields.push(`nombre = $${paramCount++}`);
        values.push(updateData.nombre);
      }
      if (updateData.apellido !== undefined) {
        fields.push(`apellido = $${paramCount++}`);
        values.push(updateData.apellido);
      }
      if (updateData.telefono !== undefined) {
        fields.push(`telefono = $${paramCount++}`);
        values.push(updateData.telefono);
      }
      if (updateData.fechaNacimiento !== undefined) {
        fields.push(`fecha_nacimiento = $${paramCount++}`);
        values.push(updateData.fechaNacimiento);
      }
      if (updateData.emailVerified !== undefined) {
        fields.push(`email_verified = $${paramCount++}`);
        values.push(updateData.emailVerified);
      }
      if (updateData.twoFaEnabled !== undefined) {
        fields.push(`two_fa_enabled = $${paramCount++}`);
        values.push(updateData.twoFaEnabled);
      }
      if (updateData.twoFaSecret !== undefined) {
        fields.push(`two_fa_secret = $${paramCount++}`);
        values.push(updateData.twoFaSecret);
      }
      if (updateData.backupCodes !== undefined) {
        fields.push(`backup_codes = $${paramCount++}`);
        values.push(updateData.backupCodes);
      }
      if (updateData.failedLoginAttempts !== undefined) {
        fields.push(`failed_login_attempts = $${paramCount++}`);
        values.push(updateData.failedLoginAttempts);
      }
      if (updateData.lockedUntil !== undefined) {
        fields.push(`locked_until = $${paramCount++}`);
        values.push(updateData.lockedUntil);
      }
      if (updateData.passwordResetToken !== undefined) {
        fields.push(`password_reset_token = $${paramCount++}`);
        values.push(updateData.passwordResetToken);
      }
      if (updateData.passwordResetExpires !== undefined) {
        fields.push(`password_reset_expires = $${paramCount++}`);
        values.push(updateData.passwordResetExpires);
      }
      if (updateData.lastLogin !== undefined) {
        fields.push(`last_login = $${paramCount++}`);
        values.push(updateData.lastLogin);
      }
      if (updateData.lastLoginIp !== undefined) {
        fields.push(`last_login_ip = $${paramCount++}`);
        values.push(updateData.lastLoginIp);
      }
      if (updateData.loginCount !== undefined) {
        fields.push(`login_count = $${paramCount++}`);
        values.push(updateData.loginCount);
      }

      if (fields.length === 0) {
        // No fields to update
        const user = await this.findById(id);
        await client.query('COMMIT');
        return user;
      }

      fields.push(`updated_at = CURRENT_TIMESTAMP`);

      const query = `
        UPDATE users
        SET ${fields.join(', ')}
        WHERE id = $${paramCount} AND is_active = true
        RETURNING *
      `;

      values.push(id);
      const result = await client.query(query, values);

      await client.query('COMMIT');

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToUser(result.rows[0]);

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Delete user by ID (soft delete)
   */
  async delete(id: number): Promise<boolean> {
    const client = await this.pool.connect();

    try {
      const query = 'UPDATE users SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND is_active = true';
      const result = await client.query(query, [id]);

      return (result.rowCount ?? 0) > 0;

    } finally {
      client.release();
    }
  }

  /**
   * Find users with filters
   */
  async findMany(filters: UserFilters): Promise<User[]> {
    const client = await this.pool.connect();

    try {
      let query = 'SELECT * FROM users WHERE is_active = true';
      const values: any[] = [];
      let paramCount = 1;

      // Add filters
      if (filters.email) {
        query += ` AND email ILIKE $${paramCount++}`;
        values.push(`%${filters.email}%`);
      }

      if (filters.nombre) {
        query += ` AND nombre ILIKE $${paramCount++}`;
        values.push(`%${filters.nombre}%`);
      }

      if (filters.apellido) {
        query += ` AND apellido ILIKE $${paramCount++}`;
        values.push(`%${filters.apellido}%`);
      }

      if (filters.emailVerified !== undefined) {
        query += ` AND email_verified = $${paramCount++}`;
        values.push(filters.emailVerified);
      }

      if (filters.twoFaEnabled !== undefined) {
        query += ` AND two_fa_enabled = $${paramCount++}`;
        values.push(filters.twoFaEnabled);
      }

      // Add ordering
      query += ' ORDER BY created_at DESC';

      // Add pagination
      if (filters.limit) {
        query += ` LIMIT $${paramCount++}`;
        values.push(filters.limit);
      }

      if (filters.offset) {
        query += ` OFFSET $${paramCount++}`;
        values.push(filters.offset);
      }

      const result = await client.query(query, values);
      return result.rows.map(row => this.mapRowToUser(row));

    } finally {
      client.release();
    }
  }

  /**
   * Count users with filters
   */
  async count(filters: UserFilters = {}): Promise<number> {
    const client = await this.pool.connect();

    try {
      let query = 'SELECT COUNT(*) as count FROM users WHERE is_active = true';
      const values: any[] = [];
      let paramCount = 1;

      // Add filters
      if (filters.email) {
        query += ` AND email ILIKE $${paramCount++}`;
        values.push(`%${filters.email}%`);
      }

      if (filters.nombre) {
        query += ` AND nombre ILIKE $${paramCount++}`;
        values.push(`%${filters.nombre}%`);
      }

      if (filters.apellido) {
        query += ` AND apellido ILIKE $${paramCount++}`;
        values.push(`%${filters.apellido}%`);
      }

      if (filters.emailVerified !== undefined) {
        query += ` AND email_verified = $${paramCount++}`;
        values.push(filters.emailVerified);
      }

      if (filters.twoFaEnabled !== undefined) {
        query += ` AND two_fa_enabled = $${paramCount++}`;
        values.push(filters.twoFaEnabled);
      }

      const result = await client.query(query, values);
      return parseInt(result.rows[0].count);

    } finally {
      client.release();
    }
  }

  /**
   * Update password hash
   */
  async updatePassword(id: number, newPasswordHash: string): Promise<boolean> {
    const client = await this.pool.connect();

    try {
      const query = `
        UPDATE users
        SET password_hash = $1, password_changed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2 AND is_active = true
      `;
      const result = await client.query(query, [newPasswordHash, id]);

      return (result.rowCount ?? 0) > 0;

    } finally {
      client.release();
    }
  }

  /**
   * Check if email exists
   */
  async emailExists(email: string, excludeId?: number): Promise<boolean> {
    const client = await this.pool.connect();

    try {
      let query = 'SELECT COUNT(*) as count FROM users WHERE email = $1';
      const values: any[] = [email];

      if (excludeId) {
        query += ' AND id != $2';
        values.push(excludeId);
      }

      const result = await client.query(query, values);
      return parseInt(result.rows[0].count) > 0;

    } finally {
      client.release();
    }
  }

  /**
   * Increment failed login attempts
   */
  async incrementFailedLoginAttempts(id: number): Promise<void> {
    const client = await this.pool.connect();

    try {
      const query = `
        UPDATE users
        SET failed_login_attempts = failed_login_attempts + 1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND is_active = true
      `;
      await client.query(query, [id]);

    } finally {
      client.release();
    }
  }

  /**
   * Reset failed login attempts
   */
  async resetFailedLoginAttempts(id: number): Promise<void> {
    const client = await this.pool.connect();

    try {
      const query = `
        UPDATE users
        SET failed_login_attempts = 0, locked_until = NULL, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND is_active = true
      `;
      await client.query(query, [id]);

    } finally {
      client.release();
    }
  }

  /**
   * Lock user account
   */
  async lockAccount(id: number, lockUntil: Date): Promise<void> {
    const client = await this.pool.connect();

    try {
      const query = `
        UPDATE users
        SET locked_until = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND is_active = true
      `;
      await client.query(query, [lockUntil, id]);

    } finally {
      client.release();
    }
  }

  /**
   * Close database connection pool
   */
  async close(): Promise<void> {
    await this.pool.end();
  }

  /**
   * Map database row to User object
   */
  private mapRowToUser(row: any): User {
    return {
      id: row.id,
      email: row.email,
      passwordHash: row.password_hash,
      nombre: row.nombre,
      apellido: row.apellido,
      telefono: row.telefono,
      fechaNacimiento: row.fecha_nacimiento ? new Date(row.fecha_nacimiento) : undefined,
      emailVerified: row.email_verified,
      twoFaEnabled: row.two_fa_enabled,
      twoFaSecret: row.two_fa_secret,
      backupCodes: row.backup_codes,
      isActive: row.is_active,
      failedLoginAttempts: row.failed_login_attempts,
      lockedUntil: row.locked_until ? new Date(row.locked_until) : undefined,
      passwordResetToken: row.password_reset_token,
      passwordResetExpires: row.password_reset_expires ? new Date(row.password_reset_expires) : undefined,
      passwordChangedAt: row.password_changed_at ? new Date(row.password_changed_at) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      lastLogin: row.last_login ? new Date(row.last_login) : undefined,
      lastLoginIp: row.last_login_ip,
      loginCount: row.login_count,
    };
  }
}