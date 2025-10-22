/**
 * Authentication Service
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
  birthDate?: string;        // Fecha de nacimiento (compatibilidad con frontend)
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

export interface Setup2FAResult {
  success: boolean;
  qrCode?: string;
  manualEntryKey?: string;
  backupCodes?: string[];
  error?: string;
}

export interface Verify2FAResult {
  success: boolean;
  error?: string;
}

export interface Disable2FAResult {
  success: boolean;
  error?: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordResponse {
  success: boolean;
  message?: string;
  error?: string;
  errorCode?: string;
  resetToken?: string; // Solo para testing, no enviar en producción
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface ResetPasswordResponse {
  success: boolean;
  message?: string;
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

  /**
   * Capitaliza la primera letra de cada palabra en una cadena
   * Maneja espacios múltiples y normaliza el formato
   * Ejemplo: "juan carlos" -> "Juan Carlos"
   * Ejemplo: "  MARIA  JOSE  " -> "Maria Jose"
   */
  private capitalizeNames(name: string): string {
    if (!name || typeof name !== 'string') {
      return '';
    }
    
    return name
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ') // Normalizar espacios múltiples a uno solo
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
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
      this.logger.info(`Starting user registration process for: ${request.email}`, {
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
        // Verificar si el email ya existe (con normalización)
        const normalizedEmail = request.email.toLowerCase().trim();
        const existingUser = await this.userRepository.findByEmail(normalizedEmail);
        if (existingUser) {
          await this.unitOfWork.rollback();
          this.logger.warn(`Registration attempt with existing email: ${normalizedEmail}`);
          return {
            success: false,
            error: 'Email already registered',
            errorCode: 'EMAIL_EXISTS',
            debugInfo: { ...debugInfo, step: 'email_already_exists' }
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
          nombre: this.capitalizeNames(request.firstName),
          apellido: request.lastName ? this.capitalizeNames(request.lastName) : undefined,
          phone: request.phone?.trim(),
          fecha_nacimiento: request.birthDate, // Nuevo campo para compatibilidad con frontend
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

        this.logger.info(`Creating user record for: ${request.email}`, {
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
        // Ensure rollback happens even if there's an error during rollback
        try {
          if (this.unitOfWork.isActive()) {
            await this.unitOfWork.rollback();
          }
        } catch (rollbackError) {
          this.logger.error('Error during rollback:', rollbackError);
        }
        
        // Manejar errores específicos de base de datos
        if (error.code === '23505') {
          // Unique constraint violation
          if (error.constraint === 'users_email_key' || error.detail?.includes('email')) {
            this.logger.warn(`Duplicate email registration attempt: ${request.email}`, {
              errorCode: error.code,
              constraint: error.constraint,
              detail: error.detail
            });
            return {
              success: false,
              error: 'Email already registered',
              errorCode: 'EMAIL_EXISTS',
              debugInfo: { ...debugInfo, step: 'database_constraint_violation' }
            };
          }
        }
        
        // Manejar error de transacción (_bt_check_unique)
        if (error.message && error.message.includes('_bt_check_unique')) {
          this.logger.warn(`Unique constraint violation during registration: ${request.email}`, error);
          return {
            success: false,
            error: 'Email already registered',
            errorCode: 'EMAIL_EXISTS',
            debugInfo: { ...debugInfo, step: 'unique_constraint_error' }
          };
        }
        
        this.logger.error('Unexpected database error during registration:', error);
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

  /**
   * 📧 Forgot Password - Generate reset token
   */
  async forgotPassword(request: ForgotPasswordRequest): Promise<ForgotPasswordResponse> {
    const startTime = Date.now();
    
    try {
      this.logger.info(`🔐 Password reset requested for: ${request.email}`);

      // Validate email format
      if (!this.isValidEmail(request.email)) {
        return {
          success: false,
          error: 'Invalid email format',
          errorCode: 'INVALID_EMAIL'
        };
      }

      // Normalize email
      const normalizedEmail = request.email.toLowerCase().trim();

      // Find user (don't reveal if user exists or not for security)
      const user = await this.userRepository.findByEmail(normalizedEmail);
      
      if (!user) {
        // Return success even if user doesn't exist (security best practice)
        this.logger.warn(`Password reset attempted for non-existent email: ${normalizedEmail}`);
        return {
          success: true,
          message: 'If the email exists, a reset link has been sent'
        };
      }

      // Check if user is active
      if (!user.is_active) {
        this.logger.warn(`Password reset attempted for inactive user: ${normalizedEmail}`);
        return {
          success: true,
          message: 'If the email exists, a reset link has been sent'
        };
      }

      // Generate secure reset token
      const resetToken = this.generateResetToken();
      const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

      // Start transaction
      await this.unitOfWork.start();

      try {
        // Update user with reset token
        await this.userRepository.update(user.id, {
          password_reset_token: resetToken,
          password_reset_expires: resetExpires,
          updated_at: new Date()
        });

        // Commit transaction
        await this.unitOfWork.commit();

        const duration = Date.now() - startTime;
        this.logger.info(`Password reset token generated for user ${user.id} in ${duration}ms`);

        // TODO: Send email with reset link
        // await this.emailService.sendPasswordResetEmail(user.email, resetToken);

        return {
          success: true,
          message: 'Password reset email sent successfully',
          resetToken: resetToken // TODO: Remove in production, only for testing
        };

      } catch (error) {
        await this.unitOfWork.rollback();
        throw error;
      }

    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.logger.error(`Password reset failed after ${duration}ms:`, error);
      
      return {
        success: false,
        error: 'Failed to process password reset request',
        errorCode: 'RESET_FAILED'
      };
    }
  }

  /**
   * Reset Password - Validate token and update password
   */
  async resetPassword(request: ResetPasswordRequest): Promise<ResetPasswordResponse> {
    const startTime = Date.now();
    
    try {
      this.logger.info(`🔄 Password reset attempt with token: ${request.token.substring(0, 8)}...`);

      // Validate inputs
      if (!request.token || !request.newPassword) {
        return {
          success: false,
          error: 'Token and new password are required',
          errorCode: 'INVALID_INPUT'
        };
      }

      // Validate new password strength
      if (!this.isValidPassword(request.newPassword)) {
        return {
          success: false,
          error: 'Password must be at least 8 characters with uppercase, lowercase, and number',
          errorCode: 'WEAK_PASSWORD'
        };
      }

      // Find user by reset token
      const users = await this.userRepository.findBy({
        password_reset_token: request.token
      });

      if (users.length === 0) {
        this.logger.warn(`Password reset attempted with invalid token: ${request.token.substring(0, 8)}...`);
        return {
          success: false,
          error: 'Invalid or expired reset token',
          errorCode: 'INVALID_TOKEN'
        };
      }

      const user = users[0];

      // Check if token is expired
      if (!user.password_reset_expires || new Date() > user.password_reset_expires) {
        this.logger.warn(`Password reset attempted with expired token for user ${user.id}`);
        return {
          success: false,
          error: 'Reset token has expired',
          errorCode: 'TOKEN_EXPIRED'
        };
      }

      // Hash new password
      const newPasswordHash = await this.hashPassword(request.newPassword);

      // Start transaction
      await this.unitOfWork.start();

      try {
        // Update user password and clear reset token
        await this.userRepository.update(user.id, {
          password_hash: newPasswordHash,
          password_reset_token: undefined,
          password_reset_expires: undefined,
          password_changed_at: new Date(),
          updated_at: new Date()
        });

        // Commit transaction
        await this.unitOfWork.commit();

        const duration = Date.now() - startTime;
        this.logger.info(`Password reset successful for user ${user.id} in ${duration}ms`);

        return {
          success: true,
          message: 'Password has been reset successfully'
        };

      } catch (error) {
        await this.unitOfWork.rollback();
        throw error;
      }

    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.logger.error(`Password reset failed after ${duration}ms:`, error);
      
      return {
        success: false,
        error: 'Failed to reset password',
        errorCode: 'RESET_FAILED'
      };
    }
  }

  /**
   * 🔐 Setup 2FA for user
   */
  async setup2FA(userId: string): Promise<Setup2FAResult> {
    const startTime = Date.now();
    this.logger.info(`Starting 2FA setup for user: ${userId}`);

    try {
      // Import required modules
      const speakeasy = require('speakeasy');
      const QRCode = require('qrcode');

      // Get user from database
      const user = await this.userRepository.findByUserId(userId);
      if (!user) {
        return {
          success: false,
          error: 'Usuario no encontrado'
        };
      }

      // Generate a secret for the user
      const secret = speakeasy.generateSecret({
        name: `LungLife (${user.email})`,
        issuer: 'LungLife',
        length: 32
      });

      // Generate QR code
      const qrCodeDataURL = await QRCode.toDataURL(secret.otpauth_url);
      
      // Generate backup codes
      const backupCodes = this.generateBackupCodes();

      // Store temporary secret (not yet activated)
      await this.userRepository.updateTempTwoFactorSecret(userId, secret.base32, backupCodes);

      const duration = Date.now() - startTime;
      this.logger.info(`2FA setup generated successfully for user ${userId} in ${duration}ms`);

      return {
        success: true,
        qrCode: qrCodeDataURL,
        manualEntryKey: secret.base32,
        backupCodes: backupCodes
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.logger.error(`2FA setup failed after ${duration}ms:`, error);
      
      return {
        success: false,
        error: 'Error generating 2FA setup'
      };
    }
  }

  /**
   * ✅ Verify 2FA code and activate 2FA
   */
  async verify2FA(userId: string, token: string): Promise<Verify2FAResult> {
    const startTime = Date.now();
    this.logger.info(`Verifying 2FA for user: ${userId}`);

    try {
      const speakeasy = require('speakeasy');

      // Get user from database
      const user = await this.userRepository.findByUserId(userId);
      if (!user) {
        return {
          success: false,
          error: 'Usuario no encontrado'
        };
      }

      // Get temporary secret
      const tempSecret = user.two_fa_temp_secret;
      if (!tempSecret) {
        return {
          success: false,
          error: 'No hay configuración 2FA pendiente. Ejecute setup primero.'
        };
      }

      // Verify the token
      const verified = speakeasy.totp.verify({
        secret: tempSecret,
        encoding: 'base32',
        token: token,
        window: 2 // Allow 2 time steps tolerance
      });

      if (!verified) {
        return {
          success: false,
          error: 'Código inválido'
        };
      }

      // Activate 2FA permanently
      await this.userRepository.activateTwoFactor(userId, tempSecret);

      const duration = Date.now() - startTime;
      this.logger.info(`2FA activated successfully for user ${userId} in ${duration}ms`);

      return {
        success: true
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.logger.error(`2FA verification failed after ${duration}ms:`, error);
      
      return {
        success: false,
        error: 'Error verificando código 2FA'
      };
    }
  }

  /**
   * ❌ Disable 2FA for user
   */
  async disable2FA(userId: string, password: string): Promise<Disable2FAResult> {
    const startTime = Date.now();
    this.logger.info(`Disabling 2FA for user: ${userId}`);

    try {
      // Get user from database
      const user = await this.userRepository.findByUserId(userId);
      if (!user) {
        return {
          success: false,
          error: 'Usuario no encontrado'
        };
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      if (!isPasswordValid) {
        return {
          success: false,
          error: 'Contraseña incorrecta'
        };
      }

      // Disable 2FA
      await this.userRepository.disableTwoFactor(userId);

      const duration = Date.now() - startTime;
      this.logger.info(`2FA disabled successfully for user ${userId} in ${duration}ms`);

      return {
        success: true
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.logger.error(`2FA disable failed after ${duration}ms:`, error);
      
      return {
        success: false,
        error: 'Error desactivando 2FA'
      };
    }
  }

  /**
   * Generate backup codes for 2FA
   */
  private generateBackupCodes(): string[] {
    const crypto = require('crypto');
    const codes: string[] = [];
    
    for (let i = 0; i < 10; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push(code);
    }
    
    return codes;
  }

  /**
   * Generate secure reset token
   */
  private generateResetToken(): string {
    const crypto = require('crypto');
    return crypto.randomBytes(32).toString('hex');
  }
}