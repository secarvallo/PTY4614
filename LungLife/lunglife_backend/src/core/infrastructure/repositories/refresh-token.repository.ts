/**
 * Refresh Token Repository Implementation
 * Implementación del repositorio de tokens de actualización
 * Sigue patrón Repository con Clean Architecture
 */

import { IDatabaseConnection } from '../../interfaces/database.interface';
import { IRefreshToken, IRefreshTokenRepository } from '../../interfaces/repository.interface';
import { Logger } from '../../services/logger.service';

export class RefreshTokenRepository implements IRefreshTokenRepository {
    private db: IDatabaseConnection;
    private logger: Logger;

    constructor(db: IDatabaseConnection, logger: Logger) {
        this.db = db;
        this.logger = logger;
    }

    async findById(id: number): Promise<IRefreshToken | null> {
        try {
            const result = await this.db.query<IRefreshToken>(
                'SELECT * FROM refresh_tokens WHERE id = $1',
                [id]
            );
            return result.length > 0 ? result[0] : null;
        } catch (error) {
            this.logger.error(`Error finding refresh token by id ${id}:`, error);
            throw error;
        }
    }

    async findAll(): Promise<IRefreshToken[]> {
        try {
            return await this.db.query<IRefreshToken>(
                'SELECT * FROM refresh_tokens ORDER BY created_at DESC'
            );
        } catch (error) {
            this.logger.error('Error finding all refresh tokens:', error);
            throw error;
        }
    }

    async findBy(criteria: Partial<IRefreshToken>): Promise<IRefreshToken[]> {
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
            const query = `SELECT * FROM refresh_tokens ${whereClause} ORDER BY created_at DESC`;

            return await this.db.query<IRefreshToken>(query, values);
        } catch (error) {
            this.logger.error('Error finding refresh tokens by criteria:', error);
            throw error;
        }
    }

    async create(token: Omit<IRefreshToken, 'id'>): Promise<IRefreshToken> {
        try {
            const result = await this.db.query<IRefreshToken>(
                `INSERT INTO refresh_tokens (
          user_id, token_hash, jti, user_agent, ip_address, device_fingerprint,
          issued_at, expires_at, is_revoked, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
                [
                    token.user_id,
                    token.token_hash,
                    token.jti,
                    token.user_agent,
                    token.ip_address,
                    token.device_fingerprint,
                    token.issued_at,
                    token.expires_at,
                    token.is_revoked || false,
                    token.created_at || new Date(),
                    token.updated_at || new Date()
                ]
            );

            this.logger.info(`Refresh token created successfully for user: ${token.user_id}`);
            return result[0];
        } catch (error) {
            this.logger.error(`Error creating refresh token for user ${token.user_id}:`, error);
            throw error;
        }
    }

    async update(id: number, tokenData: Partial<IRefreshToken>): Promise<IRefreshToken | null> {
        try {
            const setClause: string[] = [];
            const values: any[] = [];
            let paramIndex = 1;

            // Add updated_at automatically
            tokenData.updated_at = new Date();

            Object.entries(tokenData).forEach(([key, value]) => {
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
            const query = `UPDATE refresh_tokens SET ${setClause.join(', ')} WHERE id = $${paramIndex} RETURNING *`;

            const result = await this.db.query<IRefreshToken>(query, values);

            if (result.length > 0) {
                this.logger.info(`Refresh token updated successfully with id: ${id}`);
                return result[0];
            }

            return null;
        } catch (error) {
            this.logger.error(`Error updating refresh token with id ${id}:`, error);
            throw error;
        }
    }

    async delete(id: number): Promise<boolean> {
        try {
            const result = await this.db.query(
                'DELETE FROM refresh_tokens WHERE id = $1',
                [id]
            );

            const deleted = result.length > 0;
            if (deleted) {
                this.logger.info(`Refresh token deleted successfully with id: ${id}`);
            }

            return deleted;
        } catch (error) {
            this.logger.error(`Error deleting refresh token with id ${id}:`, error);
            throw error;
        }
    }

    async exists(id: number): Promise<boolean> {
        try {
            const result = await this.db.query(
                'SELECT 1 FROM refresh_tokens WHERE id = $1',
                [id]
            );
            return result.length > 0;
        } catch (error) {
            this.logger.error(`Error checking if refresh token exists with id ${id}:`, error);
            throw error;
        }
    }

    async count(criteria?: Partial<IRefreshToken>): Promise<number> {
        try {
            let query = 'SELECT COUNT(*) as count FROM refresh_tokens';
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
            this.logger.error('Error counting refresh tokens:', error);
            throw error;
        }
    }

    async findByTokenHash(tokenHash: string): Promise<IRefreshToken | null> {
        try {
            const result = await this.db.query<IRefreshToken>(
                'SELECT * FROM refresh_tokens WHERE token_hash = $1',
                [tokenHash]
            );
            return result.length > 0 ? result[0] : null;
        } catch (error) {
            this.logger.error(`Error finding refresh token by hash:`, error);
            throw error;
        }
    }

    async revokeToken(tokenHash: string, reason: string): Promise<boolean> {
        try {
            const result = await this.db.query(
                `UPDATE refresh_tokens 
         SET is_revoked = TRUE, 
             revoked_at = NOW(),
             revocation_reason = $2,
             updated_at = NOW()
         WHERE token_hash = $1 
         AND is_revoked = FALSE
         RETURNING id`,
                [tokenHash, reason]
            );

            const revoked = result.length > 0;
            if (revoked) {
                this.logger.info(`Refresh token revoked: ${reason}`);
            }

            return revoked;
        } catch (error) {
            this.logger.error(`Error revoking refresh token:`, error);
            throw error;
        }
    }

    async revokeAllUserTokens(userId: number, reason: string): Promise<number> {
        try {
            const result = await this.db.query(
                `UPDATE refresh_tokens 
         SET is_revoked = TRUE, 
             revoked_at = NOW(),
             revocation_reason = $2,
             updated_at = NOW()
         WHERE user_id = $1 
         AND is_revoked = FALSE
         RETURNING id`,
                [userId, reason]
            );

            const count = result.length;
            this.logger.info(`Revoked ${count} tokens for user ${userId}: ${reason}`);

            return count;
        } catch (error) {
            this.logger.error(`Error revoking all tokens for user ${userId}:`, error);
            throw error;
        }
    }
}
