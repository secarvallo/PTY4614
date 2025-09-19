/**
 * � JWT Service
 * Handles JWT     const refreshToken = (jwt as any).sign(refreshPayload, jwtConfig.refreshTokenSecret, {
      expiresIn: jwtConfig.refreshTokenExpiry,
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience,
    }); generation, verification, and management
 */

import jwt from 'jsonwebtoken';
import { Injectable } from '../core/di/container';
import { IJWTService, TokenPair } from '../core/interfaces/index';
import { config } from '../core/config/config';

@Injectable()
export class JWTService implements IJWTService {
  /**
   * Generate access and refresh token pair
   */
  async generateTokenPair(userId: number, email: string, deviceInfo?: any): Promise<TokenPair> {
    const jwtConfig = config.getJWTConfig();

    const payload = {
      userId,
      email,
      type: 'access',
      deviceInfo,
    };

    const accessToken = (jwt as any).sign(payload, jwtConfig.accessTokenSecret, {
      expiresIn: jwtConfig.accessTokenExpiry,
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience,
    });

    const refreshPayload = {
      userId,
      email,
      type: 'refresh',
      deviceInfo,
    };

    const refreshToken = (jwt as any).sign(refreshPayload, jwtConfig.refreshTokenSecret, {
      expiresIn: jwtConfig.refreshTokenExpiry,
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: this.getTokenExpirationTime(jwtConfig.accessTokenExpiry),
      tokenType: 'Bearer',
    };
  }

  /**
   * Verify refresh token and generate new token pair
   */
  async verifyAndRefreshTokens(refreshToken: string, deviceInfo?: any): Promise<TokenPair | null> {
    try {
      const jwtConfig = config.getJWTConfig();

      // Verify refresh token
      const decoded = (jwt as any).verify(refreshToken, jwtConfig.refreshTokenSecret, {
        issuer: jwtConfig.issuer,
        audience: jwtConfig.audience,
      }) as any;

      if (decoded.type !== 'refresh') {
        return null;
      }

      // Generate new token pair
      return await this.generateTokenPair(decoded.userId, decoded.email, deviceInfo || decoded.deviceInfo);

    } catch (error) {
      console.error('Token verification error:', error);
      return null;
    }
  }

  /**
   * Revoke specific refresh token
   */
  async revokeRefreshToken(userId: number, token: string): Promise<void> {
    // In a production system, you would store tokens in a database
    // and mark them as revoked. For now, we'll just log the action.
    console.log(`Revoking refresh token for user ${userId}`);
  }

  /**
   * Revoke all refresh tokens for a user
   */
  async revokeAllUserTokens(userId: number): Promise<void> {
    // In a production system, you would update all tokens for the user
    // in the database to mark them as revoked.
    console.log(`Revoking all refresh tokens for user ${userId}`);
  }

  /**
   * Verify access token (utility method)
   */
  verifyAccessToken(token: string): any {
    try {
      const jwtConfig = config.getJWTConfig();
      return (jwt as any).verify(token, jwtConfig.accessTokenSecret, {
        issuer: jwtConfig.issuer,
        audience: jwtConfig.audience,
      });
    } catch (error) {
      console.error('Access token verification error:', error);
      return null;
    }
  }

  /**
   * Extract user info from token without verification (for middleware)
   */
  decodeToken(token: string): any {
    try {
      return jwt.decode(token);
    } catch (error) {
      console.error('Token decode error:', error);
      return null;
    }
  }

  /**
   * Convert token expiry string to seconds
   */
  private getTokenExpirationTime(expiry: string): number {
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) return 900; // 15 minutes default

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 60 * 60;
      case 'd': return value * 60 * 60 * 24;
      default: return 900;
    }
  }
}