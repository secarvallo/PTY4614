/**
 * 🔐 Authentication Service
 * Handles user authentication, registration, and token management
 */

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Injectable } from '../core/di/container';
import { IAuthService, IUserRepository, IJWTService, IAuditService, AuditEventType } from '../core/interfaces/index';
import { AuthCredentials, RegisterData, TokenPair, User } from '../core/interfaces/index';
import { config } from '../core/config/config';

@Injectable()
export class AuthService implements IAuthService {
  private userRepository!: IUserRepository;
  private jwtService!: IJWTService;
  private auditService!: IAuditService;

  constructor() {
    // Dependencies will be injected by the container
  }

  /**
   * Set dependencies (called by container after instantiation)
   */
  setDependencies(
    userRepository: IUserRepository,
    jwtService: IJWTService,
    auditService: IAuditService
  ): void {
    this.userRepository = userRepository;
    this.jwtService = jwtService;
    this.auditService = auditService;
  }

  /**
   * Authenticate user with email and password
   */
  async login(credentials: AuthCredentials): Promise<TokenPair | null> {
    try {
      // Find user by email
      const user = await this.userRepository.findByEmail(credentials.email);

      if (!user) {
        await this.auditService.logFailedLogin(
          credentials.email,
          'User not found',
          credentials.deviceInfo?.ipAddress,
          credentials.deviceInfo?.userAgent
        );
        return null;
      }

      // Check if user is active
      if (!user.isActive) {
        await this.auditService.logBlockedLogin(
          credentials.email,
          'Account deactivated',
          credentials.deviceInfo?.ipAddress,
          credentials.deviceInfo?.userAgent
        );
        return null;
      }

      // Check if account is locked
      if (user.lockedUntil && user.lockedUntil > new Date()) {
        await this.auditService.logBlockedLogin(
          credentials.email,
          'Account locked',
          credentials.deviceInfo?.ipAddress,
          credentials.deviceInfo?.userAgent
        );
        return null;
      }

      // Verify password
      const isPasswordValid = await this.validatePassword(credentials.password, user.passwordHash);

      if (!isPasswordValid) {
        // Increment failed login attempts
        await this.userRepository.incrementFailedLoginAttempts(user.id);

        // Check if we need to lock the account
        const newFailedAttempts = user.failedLoginAttempts + 1;
        if (newFailedAttempts >= config.getSecurityConfig().rateLimitMaxAttempts) {
          const lockoutUntil = new Date(Date.now() + config.getSecurityConfig().rateLimitLockoutMs);
          await this.userRepository.lockAccount(user.id, lockoutUntil);

          await this.auditService.logBlockedLogin(
            credentials.email,
            'Account locked due to too many failed attempts',
            credentials.deviceInfo?.ipAddress,
            credentials.deviceInfo?.userAgent
          );
        } else {
          await this.auditService.logFailedLogin(
            credentials.email,
            'Invalid password',
            credentials.deviceInfo?.ipAddress,
            credentials.deviceInfo?.userAgent
          );
        }

        return null;
      }

      // Reset failed login attempts on successful login
      await this.userRepository.resetFailedLoginAttempts(user.id);

      // Update last login info
      await this.userRepository.update(user.id, {
        lastLogin: new Date(),
        lastLoginIp: credentials.deviceInfo?.ipAddress,
        loginCount: user.loginCount + 1,
      });

      // Generate tokens
      const tokenPair = await this.jwtService.generateTokenPair(
        user.id,
        user.email,
        credentials.deviceInfo
      );

      // Log successful login
      await this.auditService.logSuccessfulLogin(
        user.id,
        user.email,
        credentials.deviceInfo?.ipAddress,
        credentials.deviceInfo?.userAgent,
        credentials.deviceInfo
      );

      return tokenPair;

    } catch (error) {
      console.error('Login error:', error);
      await this.auditService.logFailedLogin(
        credentials.email,
        'Internal server error',
        credentials.deviceInfo?.ipAddress,
        credentials.deviceInfo?.userAgent
      );
      return null;
    }
  }

  /**
   * Register a new user
   */
  async register(data: RegisterData): Promise<User> {
    try {
      // Check if email already exists
      const existingUser = await this.userRepository.findByEmail(data.email);
      if (existingUser) {
        throw new Error('Email already registered');
      }

      // Hash password
      const passwordHash = await this.hashPassword(data.password);

      // Create user
      const user = await this.userRepository.create({
        email: data.email,
        passwordHash,
        nombre: data.firstName,
        apellido: data.lastName,
        emailVerified: false,
        twoFaEnabled: false,
      });

      // Log successful registration
      await this.auditService.logEvent({
        userId: user.id,
        email: user.email,
        eventType: AuditEventType.REGISTER_SUCCESS,
        success: true,
      });

      return user;

    } catch (error) {
      console.error('Registration error:', error);

      // Log failed registration
      await this.auditService.logEvent({
        email: data.email,
        eventType: AuditEventType.REGISTER_FAILED,
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<TokenPair | null> {
    try {
      return await this.jwtService.verifyAndRefreshTokens(refreshToken);
    } catch (error) {
      console.error('Token refresh error:', error);
      return null;
    }
  }

  /**
   * Logout user and revoke tokens
   */
  async logout(userId: number, token?: string): Promise<void> {
    try {
      if (token) {
        // Revoke specific refresh token
        await this.jwtService.revokeRefreshToken(userId, token);
      } else {
        // Revoke all user tokens
        await this.jwtService.revokeAllUserTokens(userId);
      }

      // Log logout event
      await this.auditService.logEvent({
        userId,
        eventType: AuditEventType.LOGOUT,
        success: true,
      });

    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }

  /**
   * Validate password against hash
   */
  async validatePassword(password: string, hash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      console.error('Password validation error:', error);
      return false;
    }
  }

  /**
   * Hash password using bcrypt
   */
  async hashPassword(password: string): Promise<string> {
    try {
      const saltRounds = config.getSecurityConfig().bcryptRounds;
      return await bcrypt.hash(password, saltRounds);
    } catch (error) {
      console.error('Password hashing error:', error);
      throw new Error('Failed to hash password');
    }
  }
}