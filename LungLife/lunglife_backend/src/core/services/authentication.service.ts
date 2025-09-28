/**
 * 🔐 Authentication Service
 * Servicio de aplicación para autenticación
 * Implementa casos de uso de autenticación con Clean Architecture
 */

import { IUser, IUserRepository } from '../interfaces/repository.interface';
import { IUnitOfWork } from '../interfaces/repository.interface';
import { Logger } from '../services/logger.service';
import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';
import { config } from '../config/config';

export interface RegisterUserRequest {
  email: string;
  password: string;
  firstName: string;
  lastName?: string;
  phone?: string;
  birthDate?: Date;
  acceptTerms: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface AuthResult {
  success: boolean;
  user?: IUser;
  token?: string;
  refreshToken?: string;
  error?: string;
  errorCode?: string;
}

export class AuthenticationService {
  private userRepository: IUserRepository;
  private unitOfWork: IUnitOfWork;
  private logger: Logger;

  constructor(
    userRepository: IUserRepository,
    unitOfWork: IUnitOfWork,
    logger: Logger
  ) {
    this.userRepository = userRepository;
    this.unitOfWork = unitOfWork;
    this.logger = logger;
  }

  async registerUser(request: RegisterUserRequest): Promise<AuthResult> {
    try {
      this.logger.info(`Attempting to register user with email: ${request.email}`);

      // Validar términos y condiciones
      if (!request.acceptTerms) {
        return {
          success: false,
          error: 'Must accept terms and conditions',
          errorCode: 'TERMS_NOT_ACCEPTED'
        };
      }

      // Iniciar transacción
      await this.unitOfWork.start();

      try {
        // Verificar si el email ya existe
        const existingUser = await this.userRepository.findByEmail(request.email);
        if (existingUser) {
          await this.unitOfWork.rollback();
          return {
            success: false,
            error: 'Email already registered',
            errorCode: 'EMAIL_EXISTS'
          };
        }

        // Hash de la contraseña
        const passwordHash = await this.hashPassword(request.password);

        // Crear usuario
        const userData: Omit<IUser, 'id'> = {
          email: request.email.toLowerCase(),
          password_hash: passwordHash,
          first_name: request.firstName,
          last_name: request.lastName,
          phone: request.phone,
          is_email_verified: false,
          two_fa_enabled: false,
          two_fa_secret: undefined,
          is_active: true,
          failed_login_attempts: 0,
          locked_until: undefined,
          created_at: new Date(),
          updated_at: new Date(),
          last_login_at: undefined,
          login_count: 0
        };

        const newUser = await this.userRepository.create(userData);

        // Generar tokens
        const tokens = await this.generateTokens(newUser);

        // Confirmar transacción
        await this.unitOfWork.commit();

        this.logger.info(`User registered successfully: ${newUser.email}`);

        return {
          success: true,
          user: newUser,
          token: tokens.accessToken,
          refreshToken: tokens.refreshToken
        };

      } catch (error) {
        await this.unitOfWork.rollback();
        throw error;
      }

    } catch (error) {
      this.logger.error(`Registration failed for ${request.email}:`, error);
      return {
        success: false,
        error: 'Registration failed',
        errorCode: 'REGISTRATION_ERROR'
      };
    }
  }

  async loginUser(request: LoginRequest): Promise<AuthResult> {
    try {
      this.logger.info(`Attempting login for email: ${request.email}`);

      // Buscar usuario por email
      const user = await this.userRepository.findByEmail(request.email);
      if (!user) {
        return {
          success: false,
          error: 'Invalid email or password',
          errorCode: 'INVALID_CREDENTIALS'
        };
      }

      // Verificar si la cuenta está activa
      if (!user.is_active) {
        return {
          success: false,
          error: 'Account is locked',
          errorCode: 'ACCOUNT_LOCKED'
        };
      }

      // Verificar contraseña
      const isPasswordValid = await this.verifyPassword(request.password, user.password_hash);
      if (!isPasswordValid) {
        // Incrementar intentos fallidos
        await this.userRepository.incrementFailedAttempts(user.id);
        
        return {
          success: false,
          error: 'Invalid email or password',
          errorCode: 'INVALID_CREDENTIALS'
        };
      }

      // Resetear intentos fallidos y actualizar último login
      await this.userRepository.resetFailedAttempts(user.id);
      await this.userRepository.updateLastLogin(user.id);

      // Generar tokens
      const tokens = await this.generateTokens(user);

      this.logger.info(`Login successful for user: ${user.email}`);

      return {
        success: true,
        user: user,
        token: tokens.accessToken,
        refreshToken: tokens.refreshToken
      };

    } catch (error) {
      this.logger.error(`Login failed for ${request.email}:`, error);
      return {
        success: false,
        error: 'Login failed',
        errorCode: 'LOGIN_ERROR'
      };
    }
  }

  private async hashPassword(password: string): Promise<string> {
    const saltRounds = config.getSecurityConfig().bcryptRounds;
    return await bcrypt.hash(password, saltRounds);
  }

  private async verifyPassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
  }

  private async generateTokens(user: IUser): Promise<{ accessToken: string; refreshToken: string }> {
    const jwtConfig = config.getJWTConfig();
    
    const payload = {
      userId: user.id,
      email: user.email,
      isActive: user.is_active,
      emailVerified: user.is_email_verified
    };

    const accessTokenOptions: SignOptions = {
      expiresIn: jwtConfig.accessTokenExpiry as any,
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience
    };

    const refreshTokenOptions: SignOptions = {
      expiresIn: jwtConfig.refreshTokenExpiry as any,
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience
    };

    const accessToken = jwt.sign(payload, jwtConfig.accessTokenSecret, accessTokenOptions);

    const refreshToken = jwt.sign(
      { userId: user.id },
      jwtConfig.refreshTokenSecret,
      refreshTokenOptions
    );

    return { accessToken, refreshToken };
  }

  /**
   * 🔄 Refresh tokens using a valid refresh token
   */
  async refreshTokens(refreshToken: string): Promise<AuthResult> {
    try {
      const jwtConfig = config.getJWTConfig();

      // Verify and decode refresh token
      const decoded = jwt.verify(refreshToken, jwtConfig.refreshTokenSecret) as { userId: number };

      if (!decoded?.userId) {
        return { success: false, error: 'Invalid refresh token', errorCode: 'INVALID_TOKEN' };
      }

      // Load user and check status
      const user = await this.userRepository.findById(decoded.userId);
      if (!user || !user.is_active) {
        return { success: false, error: 'User not found or inactive', errorCode: 'USER_INACTIVE' };
      }

      // Issue new tokens
      const tokens = await this.generateTokens(user);
      return {
        success: true,
        user,
        token: tokens.accessToken,
        refreshToken: tokens.refreshToken
      };
    } catch (error: any) {
      this.logger.error('Refresh token failed:', error);
      const code = error?.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'REFRESH_FAILED';
      return { success: false, error: 'Could not refresh token', errorCode: code };
    }
  }
}