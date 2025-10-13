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
  birthDate?: string;        // Opcional: Fecha de nacimiento
  acceptTerms: boolean;      // Requerido: Términos y condiciones
  acceptPrivacy: boolean;    // Requerido: Política de privacidad
  acceptMarketing?: boolean; // Opcional: Marketing/comunicaciones
}

export interface RegisterUserResponse extends AuthResult {
  validationErrors?: {[key: string]: string};
  debugInfo?: {
    step: string;
    timestamp: Date;
    fieldsReceived: string[];
    fieldsValidated: string[];
  };
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

  async registerUser(request: RegisterUserRequest): Promise<RegisterUserResponse> {
    const startTime = Date.now();
    const debugInfo = {
      step: 'validation_start',
      timestamp: new Date(),
      fieldsReceived: Object.keys(request),
      fieldsValidated: [] as string[]
    };

    try {
      this.logger.info(`🔄 Starting user registration process for: ${request.email}`, {
        timestamp: debugInfo.timestamp,
        fieldsCount: debugInfo.fieldsReceived.length,
        hasAcceptance: {
          terms: !!request.acceptTerms,
          privacy: !!request.acceptPrivacy,
          marketing: request.acceptMarketing
        }
      });

      // 1. VALIDACIÓN DE CAMPOS OBLIGATORIOS
      const validationErrors: {[key: string]: string} = {};
      
      // Validar email
      if (!request.email || !this.isValidEmail(request.email)) {
        validationErrors.email = 'Valid email is required';
      }
      debugInfo.fieldsValidated.push('email');

      // Validar contraseña
      if (!request.password || request.password.length < 8) {
        validationErrors.password = 'Password must be at least 8 characters long';
      }
      debugInfo.fieldsValidated.push('password');

      // Validar nombres
      if (!request.firstName || request.firstName.trim().length === 0) {
        validationErrors.firstName = 'First name is required';
      }
      debugInfo.fieldsValidated.push('firstName');

      // 2. VALIDACIÓN DE CAMPOS DE ACEPTACIÓN (OBLIGATORIOS)
      if (!request.acceptTerms) {
        validationErrors.acceptTerms = 'Must accept terms and conditions';
        this.logger.warn(`Terms not accepted for: ${request.email}`);
      }
      debugInfo.fieldsValidated.push('acceptTerms');

      if (!request.acceptPrivacy) {
        validationErrors.acceptPrivacy = 'Must accept privacy policy';
        this.logger.warn(`Privacy policy not accepted for: ${request.email}`);
      }
      debugInfo.fieldsValidated.push('acceptPrivacy');

      // Si hay errores de validación, retornar temprano
      if (Object.keys(validationErrors).length > 0) {
        this.logger.warn(`Validation failed for: ${request.email}`, validationErrors);
        return {
          success: false,
          error: 'Validation errors found',
          errorCode: 'VALIDATION_ERROR',
          validationErrors,
          debugInfo: { ...debugInfo, step: 'validation_failed' }
        };
      }

      debugInfo.step = 'database_operations_start';

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

        // 3. PROCESAMIENTO DE DATOS
        debugInfo.step = 'password_hashing';
        this.logger.debug(`Hashing password for: ${request.email}`);
        const passwordHash = await this.hashPassword(request.password);

        // 4. PREPARACIÓN DE DATOS DE USUARIO
        debugInfo.step = 'user_data_preparation';
        const currentTime = new Date();
        const userData: Omit<IUser, 'id'> = {
          email: request.email.toLowerCase().trim(),
          password_hash: passwordHash,
          nombre: request.firstName.trim(),
          apellido: request.lastName?.trim(),
          phone: request.phone?.trim(),
          fecha_nacimiento: request.birthDate?.trim(), // Mapear birthDate a fecha_nacimiento
          email_verified: false,
          two_fa_enabled: false,
          two_fa_secret: undefined,
          is_active: true,
          failed_login_attempts: 0,
          locked_until: undefined,
          created_at: currentTime,
          updated_at: currentTime,
          last_login_at: undefined,
          login_count: 0,
          // CAMPOS DE ACEPTACIÓN - CRÍTICOS PARA COMPLIANCE
          accept_terms: request.acceptTerms,     // OBLIGATORIO
          accept_privacy: request.acceptPrivacy, // OBLIGATORIO  
          marketing_consent: request.acceptMarketing || false // OPCIONAL
        };

        this.logger.info(`📝 Creating user record for: ${request.email}`, {
          hasAcceptance: {
            terms: userData.accept_terms,
            privacy: userData.accept_privacy,
            marketing: userData.marketing_consent
          },
          userFields: Object.keys(userData).length
        });

        // 5. INSERCIÓN EN BASE DE DATOS
        debugInfo.step = 'database_insert';
        const newUser = await this.userRepository.create(userData);
        
        // 6. GENERACIÓN DE TOKENS
        debugInfo.step = 'token_generation';
        const tokens = await this.generateTokens(newUser);

        // 7. CONFIRMACIÓN DE TRANSACCIÓN
        debugInfo.step = 'transaction_commit';
        await this.unitOfWork.commit();

        const duration = Date.now() - startTime;
        this.logger.info(`User registration completed successfully for: ${newUser.email}`, {
          userId: newUser.id,
          duration: `${duration}ms`,
          acceptanceFields: {
            terms: newUser.accept_terms,
            privacy: newUser.accept_privacy,
            marketing: newUser.marketing_consent
          }
        });

        return {
          success: true,
          user: newUser,
          token: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          debugInfo: { ...debugInfo, step: 'registration_completed' }
        };

      } catch (error: any) {
        await this.unitOfWork.rollback();
        
        // Manejar error específico de email duplicado
        if (error.code === '23505' && error.constraint === 'users_email_key') {
          this.logger.warn(`Duplicate email registration attempt: ${request.email}`);
          return {
            success: false,
            error: 'Email already registered',
            errorCode: 'EMAIL_EXISTS'
          };
        }
        
        throw error;
      }

    } catch (error: any) {
      this.logger.error(`Registration failed for ${request.email}:`, error);
      
      // Manejar errores específicos
      if (error.code === '23505') {
        return {
          success: false,
          error: 'Email already registered',
          errorCode: 'EMAIL_EXISTS'
        };
      }
      
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
      emailVerified: user.email_verified
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

  /**
   * 📧 Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * 🔍 Validate password strength
   */
  private isValidPassword(password: string): boolean {
    // Al menos 8 caracteres, una mayúscula, una minúscula, un número
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
  }
}