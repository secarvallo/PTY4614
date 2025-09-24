/**
 * 🔐 Auth Controller - Clean Architecture Implementation
 * Handles all authentication endpoints for LungLife frontend
 */

import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from '../config/lunglife_db';
import { Injectable } from '../core/di/container';
import { IAuditService, IJWTService, IAuthService, AuditEventType } from '../core/interfaces/index';
import { RateLimitService } from '../services/rate-limit.service';
import { SecurityService } from '../services/security.service';

interface AuthRequest extends Request {
  body: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    acceptTerms?: boolean;
    rememberMe?: boolean;
    deviceInfo?: any;
    phone?: string;
    birthDate?: string;
  };
}

interface AuthResponse {
  success: boolean;
  user?: any;
  tokens?: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
  error?: string;
  errorCode?: string;
  requiresTwoFA?: boolean;
  sessionId?: string;
}

@Injectable()
export class AuthController {
  constructor(
    private auditService: IAuditService,
    private jwtService: IJWTService,
    private authService: IAuthService
  ) {}

  /**
   * 🔑 Login endpoint - Strategy Pattern compatible
   */
  async login(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { email, password, rememberMe, deviceInfo } = req.body;

      if (!email || !password) {
        res.status(400).json({
          success: false,
          error: 'Email and password are required',
          errorCode: 'MISSING_CREDENTIALS'
        } as AuthResponse);
        return;
      }

      // Check rate limiting before password verification
      const rateLimitCheck = await RateLimitService.checkLoginAttempt(email);
      if (!rateLimitCheck.allowed) {
        // Log blocked attempt
        await this.auditService.logBlockedLogin(
          email,
          rateLimitCheck.message || 'Rate limited',
          req.ip,
          req.get('User-Agent')
        );

        // Log failed attempt for monitoring
        console.log(`🚫 Login blocked for ${email}: ${rateLimitCheck.message}`);

        const statusCode = rateLimitCheck.lockoutUntil ? 423 : 429;
        res.status(statusCode).json({
          success: false,
          error: rateLimitCheck.message || 'Too many login attempts',
          errorCode: rateLimitCheck.lockoutUntil ? 'ACCOUNT_LOCKED' : 'RATE_LIMITED',
          remainingAttempts: rateLimitCheck.remainingAttempts,
          lockoutUntil: rateLimitCheck.lockoutUntil
        } as AuthResponse);
        return;
      }

      // Find user in database
      const userResult = await query(
        'SELECT id, email, password_hash, nombre, apellido, email_verified, two_fa_enabled, is_active FROM users WHERE email = $1',
        [email.toLowerCase()]
      );

      if (userResult.rows.length === 0) {
        res.status(401).json({
          success: false,
          error: 'Invalid email or password',
          errorCode: 'INVALID_CREDENTIALS'
        } as AuthResponse);
        return;
      }

      const user = userResult.rows[0];

      // Check if account is active
      if (!user.is_active) {
        res.status(423).json({
          success: false,
          error: 'Account is locked. Please contact support',
          errorCode: 'ACCOUNT_LOCKED'
        } as AuthResponse);
        return;
      }

      // Verify password using SecurityService
      const passwordValid = await SecurityService.verifyPassword(password, user.password_hash);
      if (!passwordValid) {
        // Record failed attempt
        await RateLimitService.recordFailedAttempt(email);

        // Log failed login attempt
        await this.auditService.logFailedLogin(
          email,
          'Invalid password',
          req.ip,
          req.get('User-Agent')
        );

        // Get updated rate limit info
        const updatedRateLimit = await RateLimitService.checkLoginAttempt(email);

        res.status(401).json({
          success: false,
          error: 'Invalid email or password',
          errorCode: 'INVALID_CREDENTIALS',
          remainingAttempts: updatedRateLimit.remainingAttempts,
          message: updatedRateLimit.message
        } as AuthResponse);
        return;
      }

      // Check if 2FA is enabled
      if (user.two_fa_enabled) {
        // Generate session ID for 2FA flow
        const sessionId = this.generateSessionId();

        res.json({
          success: true,
          requiresTwoFA: true,
          sessionId,
          user: {
            id: user.id,
            email: user.email,
            firstName: user.nombre,
            lastName: user.apellido
          }
        } as AuthResponse);
        return;
      }

      // Generate JWT tokens using JWTService
      const tokens = await this.jwtService.generateTokenPair(user.id, user.email, deviceInfo);

      // Update last login and reset failed attempts
      await query(
        'UPDATE users SET last_login = CURRENT_TIMESTAMP, login_count = login_count + 1 WHERE id = $1',
        [user.id]
      );

      // Reset failed attempts on successful login
      await RateLimitService.resetFailedAttempts(email);

      // Log successful login
      await this.auditService.logSuccessfulLogin(
        user.id,
        email,
        req.ip,
        req.get('User-Agent'),
        deviceInfo
      );

      res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.nombre,
          lastName: user.apellido,
          isEmailVerified: user.email_verified,
          twoFAEnabled: user.two_fa_enabled,
          createdAt: user.created_at,
          lastLoginAt: new Date()
        },
        tokens
      } as AuthResponse);

    } catch (error: any) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        errorCode: 'SERVER_ERROR'
      } as AuthResponse);
    }
  }

  /**
   * 📝 Register endpoint - Compatible with RegisterStrategy
   * POST /api/auth/register
   */
  async register(req: AuthRequest, res: Response): Promise<void> {
    console.log('Register endpoint called', req.body);
    try {
      const { email, password, firstName, lastName, acceptTerms, phone, birthDate } = req.body;
      if (!email || !password || !firstName || !lastName || !acceptTerms) {
        console.log('Missing required fields');
        res.status(400).json({
          success: false,
          error: 'Missing required fields',
          errorCode: 'MISSING_FIELDS'
        } as AuthResponse);
        return;
      }
      // Check if user already exists
      const existingUser = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
      if (existingUser.rows.length > 0) {
        console.log('Email already registered');
        res.status(409).json({
          success: false,
          error: 'Email already registered',
          errorCode: 'EMAIL_EXISTS'
        } as AuthResponse);
        return;
      }
      // Hash password
      const passwordHash = await SecurityService.hashPassword(password);
      console.log('Password hashed');
      // Insert user
      const insertResult = await query(
        'INSERT INTO users (email, password_hash, nombre, apellido, telefono, fecha_nacimiento, is_active, email_verified, created_at) VALUES ($1, $2, $3, $4, $5, $6, true, false, NOW()) RETURNING id, email, nombre, apellido, telefono, fecha_nacimiento, is_active, email_verified',
        [email.toLowerCase(), passwordHash, firstName, lastName, phone || null, birthDate || null]
      );
      console.log('User inserted', insertResult.rows[0]);
      const user = insertResult.rows[0];
      // Generate tokens
      const tokens = await this.jwtService.generateTokenPair(user.id, user.email);
      console.log('Tokens generated');
      // Audit log (usando logEvent)
      await this.auditService.logEvent({
        userId: user.id,
        email: user.email,
        eventType: AuditEventType.REGISTER_SUCCESS,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        success: true,
        metadata: { action: 'register' }
      });
      console.log('Audit log created');
      res.status(201).json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.nombre,
          lastName: user.apellido,
          phone: user.telefono,
          birthDate: user.fecha_nacimiento,
          isActive: user.is_active,
          emailVerified: user.email_verified
        },
        token: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        metadata: {
          emailVerificationRequired: true
        }
      } as AuthResponse);
    } catch (error) {
      console.error('Registration failed', error);
      res.status(500).json({
        success: false,
        error: 'Registration failed',
        errorCode: 'REGISTRATION_ERROR'
      } as AuthResponse);
    }
  }

  /**
   * 🔄 Refresh Token endpoint - Compatible with TokenStrategy
   */
  async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({
          success: false,
          error: 'Refresh token is required',
          errorCode: 'MISSING_REFRESH_TOKEN'
        } as AuthResponse);
        return;
      }

      // Verify and refresh tokens using JWTService
      const tokenResult = await this.jwtService.verifyAndRefreshTokens(refreshToken);

      if (!tokenResult) {
        res.status(401).json({
          success: false,
          error: 'Invalid or expired refresh token',
          errorCode: 'INVALID_REFRESH_TOKEN'
        } as AuthResponse);
        return;
      }

      // Get user info for audit logging (we need to decode the original token to get userId)
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'lunglife_refresh_secret') as any;
      const userId = decoded.userId;
      const email = decoded.email;

      // Log successful token refresh
      await this.auditService.logEvent({
        userId,
        email,
        eventType: AuditEventType.LOGIN_SUCCESS, // Using LOGIN_SUCCESS for token refresh
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        success: true,
        metadata: { action: 'token_refresh' }
      });

      res.json({
        success: true,
        tokens: {
          accessToken: tokenResult.accessToken,
          refreshToken: tokenResult.refreshToken,
          expiresIn: tokenResult.expiresIn
        }
      } as AuthResponse);

    } catch (error: any) {
      console.error('Token refresh error:', error);
      res.status(500).json({
        success: false,
        error: 'Token refresh failed',
        errorCode: 'SERVER_ERROR'
      } as AuthResponse);
    }
  }

  /**
   * 🚪 Logout endpoint - Revoke refresh token
   */
  async logout(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({
          success: false,
          error: 'Refresh token is required',
          errorCode: 'MISSING_REFRESH_TOKEN'
        } as AuthResponse);
        return;
      }

      // Decode token to get user info for audit logging
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'lunglife_refresh_secret') as any;
      const userId = decoded.userId;
      const email = decoded.email;

      // Revoke the refresh token
      await this.jwtService.revokeRefreshToken(userId, refreshToken);

      // Log successful logout
      await this.auditService.logEvent({
        userId,
        email,
        eventType: AuditEventType.LOGOUT,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        success: true,
        metadata: { action: 'logout' }
      });

      res.json({
        success: true,
        message: 'Logged out successfully'
      } as AuthResponse);

    } catch (error: any) {
      console.error('Logout error:', error);
      res.status(500).json({
        success: false,
        error: 'Logout failed',
        errorCode: 'SERVER_ERROR'
      } as AuthResponse);
    }
  }

  /**
   * 🎯 Generate unique session ID
   */
  private generateSessionId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  /**
   * 🔤 Capitalize first letter (Clean Code principle)
   */
  private capitalizeFirstLetter(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }
}
