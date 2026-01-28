/**
 * Refresh Token Repository Implementation
 * Implementation of the refresh tokens repository
 * Follows Repository pattern with Clean Architecture
 */

import { IDatabaseConnection } from '../../domain/interfaces/database.interface';
import { IRefreshToken, IRefreshTokenRepository } from '../../domain/interfaces/repository.interface';
import { Logger } from '../../application/services/logger.service';

export class RefreshTokenRepository implements IRefreshTokenRepository {
    private db: IDatabaseConnection;
    private logger: Logger;

    constructor(db: IDatabaseConnection, logger: Logger) {
        this.db = db;
        this.logger = logger;
    }

    async findById(tokenId: number): Promise<IRefreshToken | null> {
        try {
            const result = await this.db.query<IRefreshToken>(
                'SELECT * FROM refresh_tokens WHERE token_id = $1',
                [tokenId]
            );
            return result.length > 0 ? result[0] : null;
        } catch (error) {
            this.logger.error(`Error finding refresh token by id ${tokenId}:`, error);
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

    async update(tokenId: number, tokenData: Partial<IRefreshToken>): Promise<IRefreshToken | null> {
        try {
            const setClause: string[] = [];
            const values: any[] = [];
            let paramIndex = 1;

            // Add updated_at automatically
            tokenData.updated_at = new Date();

            Object.entries(tokenData).forEach(([key, value]) => {
                if (value !== undefined && key !== 'token_id') {
                    setClause.push(`${key} = $${paramIndex}`);
                    values.push(value);
                    paramIndex++;
                }
            });

            if (setClause.length === 0) {
                return await this.findById(tokenId);
            }

            values.push(tokenId);
            const query = `UPDATE refresh_tokens SET ${setClause.join(', ')} WHERE token_id = $${paramIndex} RETURNING *`;

            const result = await this.db.query<IRefreshToken>(query, values);

            if (result.length > 0) {
                this.logger.info(`Refresh token updated successfully with id: ${tokenId}`);
                return result[0];
            }

            return null;
        } catch (error) {
            this.logger.error(`Error updating refresh token with id ${tokenId}:`, error);
            throw error;
        }
    }

    async delete(tokenId: number): Promise<boolean> {
        try {
            const result = await this.db.query(
                'DELETE FROM refresh_tokens WHERE token_id = $1',
                [tokenId]
            );

            const deleted = result.length > 0;
            if (deleted) {
                this.logger.info(`Refresh token deleted successfully with id: ${tokenId}`);
            }

            return deleted;
        } catch (error) {
            this.logger.error(`Error deleting refresh token with id ${tokenId}:`, error);
            throw error;
        }
    }

    async exists(tokenId: number): Promise<boolean> {
        try {
            const result = await this.db.query(
                'SELECT 1 FROM refresh_tokens WHERE token_id = $1',
                [tokenId]
            );
            return result.length > 0;
        } catch (error) {
            this.logger.error(`Error checking if refresh token exists with id ${tokenId}:`, error);
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
            this.logger.info(`Revoking refresh token: ${reason}`);
            const result = await this.db.query(
                `UPDATE refresh_tokens 
         SET is_revoked = TRUE, 
             updated_at = NOW()
         WHERE token_hash = $1 
         AND is_revoked = FALSE
         RETURNING token_id`,
                [tokenHash]
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
            this.logger.info(`Revoking all tokens for user ${userId}: ${reason}`);
            const result = await this.db.query(
                `UPDATE refresh_tokens 
         SET is_revoked = TRUE, 
             updated_at = NOW()
         WHERE user_id = $1 
         AND is_revoked = FALSE
         RETURNING token_id`,
                [userId]
            );

            const count = result.length;
            this.logger.info(`Revoked ${count} tokens for user ${userId}: ${reason}`);

            return count;
        } catch (error) {
            this.logger.error(`Error revoking all tokens for user ${userId}:`, error);
            throw error;
        }
    }

    async findByJti(jti: string): Promise<IRefreshToken | null> {
        try {
            const result = await this.db.query<IRefreshToken>(
                'SELECT * FROM refresh_tokens WHERE jti = $1',
                [jti]
            );
            return result.length > 0 ? result[0] : null;
        } catch (error) {
            this.logger.error(`Error finding refresh token by jti ${jti}:`, error);
            throw error;
        }
    }

    async findActiveTokensByUserId(userId: number): Promise<IRefreshToken[]> {
        try {
            return await this.db.query<IRefreshToken>(
                `SELECT * FROM refresh_tokens 
                 WHERE user_id = $1 
                 AND is_revoked = FALSE 
                 AND expires_at > NOW()
                 ORDER BY created_at DESC`,
                [userId]
            );
        } catch (error) {
            this.logger.error(`Error finding active tokens for user ${userId}:`, error);
            throw error;
        }
    }

    async deleteExpiredTokens(): Promise<number> {
        try {
            const result = await this.db.query(
                `DELETE FROM refresh_tokens 
                 WHERE expires_at < NOW() OR is_revoked = TRUE
                 RETURNING token_id`
            );
            const count = result.length;
            this.logger.info(`Deleted ${count} expired/revoked tokens`);
            return count;
        } catch (error) {
            this.logger.error('Error deleting expired tokens:', error);
            throw error;
        }
    }
}
