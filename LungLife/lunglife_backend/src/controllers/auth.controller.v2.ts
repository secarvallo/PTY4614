/**
 * 🔐 Nuevo Auth Controller - Clean Architecture
 * Implementación mejorada del controlador de autenticación
 * Siguiendo principios SOLID y Clean Architecture
 */

import { Request, Response } from 'express';
import { AuthenticationService, RegisterUserRequest, LoginRequest, ForgotPasswordRequest, ResetPasswordRequest } from '../core/services/authentication.service';
import { DatabaseServiceFactory } from '../core/factories/database.factory';
import { UserRepository } from '../core/infrastructure/repositories/user.repository';
import { UnitOfWork } from '../core/infrastructure/unit-of-work/unit-of-work';
import { Logger } from '../core/services/logger.service';

interface AuthControllerResponse {
  success: boolean;
  data?: any;
  error?: string;
  errorCode?: string;
  timestamp: string;
}

export class AuthController {
  private authService: AuthenticationService | null = null;
  private logger: Logger;

  constructor() {
    this.logger = new Logger('AuthController');
  }

  /**
   * 🔄 Refresh token - POST /api/auth/refresh
   */
  async refresh(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body ?? {};
      if (!refreshToken) {
        this.sendErrorResponse(res, 400, 'Refresh token is required', 'VALIDATION_ERROR');
        return;
      }

      const authService = await this.getAuthService();
      const result = await authService.refreshTokens(refreshToken);

      if (result.success) {
        this.sendSuccessResponse(res, 200, {
          tokens: {
            accessToken: result.token!,
            refreshToken: result.refreshToken!,
            tokenType: 'Bearer'
          }
        });
      } else {
        const statusCode = result.errorCode === 'TOKEN_EXPIRED' ? 401 : 400;
        this.sendErrorResponse(res, statusCode, result.error!, result.errorCode!);
      }
    } catch (error) {
      this.logger.error('Refresh endpoint error:', error);
      this.sendErrorResponse(res, 500, 'Internal server error', 'INTERNAL_ERROR');
    }
  }

  private async getAuthService(): Promise<AuthenticationService> {
    if (!this.authService) {
      const factory = DatabaseServiceFactory.getInstance();
      const userRepository = await factory.getUserRepository();
      const unitOfWork = await factory.getUnitOfWork();
      
      this.authService = new AuthenticationService(
        userRepository,
        unitOfWork,
        new Logger('AuthenticationService')
      );
    }
    return this.authService;
  }

  /**
   * 📝 Register endpoint - POST /api/auth/register
   */
  async register(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    
    try {
      this.logger.info('Registration attempt started', { 
        email: req.body.email,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      // Validar datos de entrada
      const validation = this.validateRegisterRequest(req.body);
      if (!validation.isValid) {
        this.sendErrorResponse(res, 400, validation.errors.join(', '), 'VALIDATION_ERROR');
        return;
      }

      const registerRequest: RegisterUserRequest = {
        email: req.body.email,
        password: req.body.password,
        firstName: req.body.nombre || req.body.firstName,
        lastName: req.body.apellido || req.body.lastName,
        phone: req.body.telefono || req.body.phone,
        acceptTerms: req.body.acceptTerms,
        acceptPrivacy: req.body.acceptPrivacy,
        acceptMarketing: req.body.acceptMarketing || false
      };

      // Log para verificar los campos de aceptación
      this.logger.info('Acceptance fields received:', {
        acceptTerms: req.body.acceptTerms,
        acceptPrivacy: req.body.acceptPrivacy,
        acceptMarketing: req.body.acceptMarketing
      });

      const authService = await this.getAuthService();
      const result = await authService.registerUser(registerRequest);

      if (result.success) {
        const duration = Date.now() - startTime;
        this.logger.info(`✅ Registration successful for ${registerRequest.email} in ${duration}ms`);
        
        res.status(201).json({
          success: true,
          message: 'User registered successfully',
          user: {
            id: result.user!.id,
            email: result.user!.email,
            firstName: result.user!.nombre,
            lastName: result.user!.apellido,
            emailVerified: result.user!.email_verified,
            acceptanceStatus: {
              terms: result.user!.accept_terms,
              privacy: result.user!.accept_privacy,
              marketing: result.user!.marketing_consent
            }
          },
          token: result.token,
        });
      } else {
        this.logger.warn(`❌ Registration failed for ${registerRequest.email}: ${result.error}`, {
          errorCode: result.errorCode,
          validationErrors: result.validationErrors,
          debugInfo: result.debugInfo
        });
        
        // Respuesta específica para errores de validación
        if (result.errorCode === 'VALIDATION_ERROR' && result.validationErrors) {
          res.status(400).json({
            success: false,
            message: 'Validation errors found',
            errorCode: result.errorCode,
            validationErrors: result.validationErrors,
            debugInfo: result.debugInfo
          });
        } else {
          this.sendErrorResponse(res, 400, result.error!, result.errorCode!);
        }
      }

    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`Registration error after ${duration}ms:`, error);
      this.sendErrorResponse(res, 500, 'Internal server error', 'INTERNAL_ERROR');
    }
  }

  /**
   * 🔑 Login endpoint - POST /api/auth/login
   */
  async login(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    
    try {
      this.logger.info('Login attempt started', { 
        email: req.body.email,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      // Validar datos de entrada
      const validation = this.validateLoginRequest(req.body);
      if (!validation.isValid) {
        this.sendErrorResponse(res, 400, validation.errors.join(', '), 'VALIDATION_ERROR');
        return;
      }

      const loginRequest: LoginRequest = {
        email: req.body.email,
        password: req.body.password,
        rememberMe: req.body.rememberMe
      };

      const authService = await this.getAuthService();
      const result = await authService.loginUser(loginRequest);

      if (result.success) {
        const duration = Date.now() - startTime;
        this.logger.info(`Login successful for ${loginRequest.email} in ${duration}ms`);
        
        res.status(200).json({
          success: true,
          message: 'Login successful',
          user: {
            id: result.user!.id,
            email: result.user!.email,
            firstName: result.user!.nombre,
            lastName: result.user!.apellido,
          },
          token: result.token,
        });
      } else {
        this.logger.warn(`Login failed for ${loginRequest.email}: ${result.error}`);
        const statusCode = result.errorCode === 'ACCOUNT_LOCKED' ? 423 : 401;
        this.sendErrorResponse(res, statusCode, result.error!, result.errorCode!);
      }

    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`Login error after ${duration}ms:`, error);
      this.sendErrorResponse(res, 500, 'Internal server error', 'INTERNAL_ERROR');
    }
  }

  /**
   * ❤️ Health check endpoint - GET /api/auth/health
   */
  async health(req: Request, res: Response): Promise<void> {
    try {
      const factory = DatabaseServiceFactory.getInstance();
      const connection = await factory.getConnection();
      const metrics = connection.getConnectionMetrics();

      this.sendSuccessResponse(res, 200, {
        status: 'healthy',
        database: {
          connected: connection.isConnected(),
          metrics: metrics
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      this.logger.error('Health check failed:', error);
      this.sendErrorResponse(res, 503, 'Service unavailable', 'HEALTH_CHECK_FAILED');
    }
  }

  private validateRegisterRequest(body: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!body.email) errors.push('Email is required');
    if (!body.password) errors.push('Password is required');
    // Soporte para ambos formatos: español (nombre) e inglés (firstName)
    if (!body.firstName && !body.nombre) errors.push('Name is required');
    if (body.acceptTerms !== true) errors.push('Must accept terms and conditions');

    // Validar formato de email
    if (body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      errors.push('Invalid email format');
    }

    // Validar contraseña
    if (body.password && body.password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private validateLoginRequest(body: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!body.email) errors.push('Email is required');
    if (!body.password) errors.push('Password is required');

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private sendSuccessResponse(res: Response, statusCode: number, data: any): void {
    const response: AuthControllerResponse = {
      success: true,
      data,
      timestamp: new Date().toISOString()
    };
    res.status(statusCode).json(response);
  }

  /**
   * 📧 Forgot Password - POST /api/auth/forgot-password
   */
  async forgotPassword(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    
    try {
      this.logger.info('Password reset requested', { 
        email: req.body.email,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      // Validar email
      if (!req.body.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(req.body.email)) {
        this.sendErrorResponse(res, 400, 'Valid email is required', 'VALIDATION_ERROR');
        return;
      }

      const authService = await this.getAuthService();
      const result = await authService.forgotPassword({ email: req.body.email });

      const duration = Date.now() - startTime;
      
      if (result.success) {
        this.logger.info(`Password reset processed in ${duration}ms`);
        this.sendSuccessResponse(res, 200, {
          message: result.message,
          // TODO: Remove resetToken in production
          resetToken: result.resetToken
        });
      } else {
        this.logger.warn(`Password reset failed in ${duration}ms: ${result.error}`);
        this.sendErrorResponse(res, 400, result.error!, result.errorCode!);
      }

    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`Password reset error after ${duration}ms:`, error);
      this.sendErrorResponse(res, 500, 'Internal server error', 'INTERNAL_ERROR');
    }
  }

  /**
   * 🔄 Reset Password - POST /api/auth/reset-password
   */
  async resetPassword(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    
    try {
      this.logger.info('Password reset attempt', { 
        tokenPrefix: req.body.token?.substring(0, 8),
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      // Validar inputs
      const validation = this.validateResetPasswordRequest(req.body);
      if (!validation.isValid) {
        this.sendErrorResponse(res, 400, validation.errors.join(', '), 'VALIDATION_ERROR');
        return;
      }

      const authService = await this.getAuthService();
      const result = await authService.resetPassword({
        token: req.body.token,
        newPassword: req.body.newPassword
      });

      const duration = Date.now() - startTime;
      
      if (result.success) {
        this.logger.info(`Password reset successful in ${duration}ms`);
        this.sendSuccessResponse(res, 200, {
          message: result.message
        });
      } else {
        this.logger.warn(`Password reset failed in ${duration}ms: ${result.error}`);
        this.sendErrorResponse(res, 400, result.error!, result.errorCode!);
      }

    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`Password reset error after ${duration}ms:`, error);
      this.sendErrorResponse(res, 500, 'Internal server error', 'INTERNAL_ERROR');
    }
  }

  private validateResetPasswordRequest(body: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!body.token) errors.push('Reset token is required');
    if (!body.newPassword) errors.push('New password is required');
    
    // Validar contraseña
    if (body.newPassword && body.newPassword.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 🔐 Setup 2FA - POST /api/auth/2fa/setup
   */
  async setup2FA(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        this.sendErrorResponse(res, 401, 'Usuario no autenticado', 'UNAUTHORIZED');
        return;
      }

      const authService = await this.getAuthService();
      const result = await authService.setup2FA(userId);

      if (result.success) {
        this.sendSuccessResponse(res, 200, {
          qr_code: result.qrCode,
          manual_entry_key: result.manualEntryKey,
          backup_codes: result.backupCodes,
          message: '2FA setup generated successfully'
        });
      } else {
        this.sendErrorResponse(res, 400, result.error || 'Error setting up 2FA', 'SETUP_2FA_ERROR');
      }
    } catch (error) {
      this.logger.error('Error in setup2FA:', error);
      this.sendErrorResponse(res, 500, 'Internal server error', 'INTERNAL_ERROR');
    }
  }

  /**
   * ✅ Verify 2FA - POST /api/auth/2fa/verify
   */
  async verify2FA(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const { code } = req.body;

      if (!userId) {
        this.sendErrorResponse(res, 401, 'Usuario no autenticado', 'UNAUTHORIZED');
        return;
      }

      if (!code || !/^[0-9]{6}$/.test(code)) {
        this.sendErrorResponse(res, 400, 'Código de 6 dígitos requerido', 'VALIDATION_ERROR');
        return;
      }

      const authService = await this.getAuthService();
      const result = await authService.verify2FA(userId, code);

      if (result.success) {
        this.sendSuccessResponse(res, 200, {
          message: '2FA activated successfully'
        });
      } else {
        this.sendErrorResponse(res, 400, result.error || 'Invalid code', 'INVALID_2FA_CODE');
      }
    } catch (error) {
      this.logger.error('Error in verify2FA:', error);
      this.sendErrorResponse(res, 500, 'Internal server error', 'INTERNAL_ERROR');
    }
  }

  /**
   * ❌ Disable 2FA - POST /api/auth/2fa/disable
   */
  async disable2FA(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const { password } = req.body;

      if (!userId) {
        this.sendErrorResponse(res, 401, 'Usuario no autenticado', 'UNAUTHORIZED');
        return;
      }

      if (!password) {
        this.sendErrorResponse(res, 400, 'Contraseña requerida para desactivar 2FA', 'VALIDATION_ERROR');
        return;
      }

      const authService = await this.getAuthService();
      const result = await authService.disable2FA(userId, password);

      if (result.success) {
        this.sendSuccessResponse(res, 200, {
          message: '2FA disabled successfully'
        });
      } else {
        this.sendErrorResponse(res, 400, result.error || 'Invalid password', 'INVALID_PASSWORD');
      }
    } catch (error) {
      this.logger.error('Error in disable2FA:', error);
      this.sendErrorResponse(res, 500, 'Internal server error', 'INTERNAL_ERROR');
    }
  }

  private sendErrorResponse(res: Response, statusCode: number, error: string, errorCode: string): void {
    const response: AuthControllerResponse = {
      success: false,
      error,
      errorCode,
      timestamp: new Date().toISOString()
    };
    res.status(statusCode).json(response);
  }
}