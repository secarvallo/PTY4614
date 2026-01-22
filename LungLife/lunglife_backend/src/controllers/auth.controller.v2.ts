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
            role: result.user!.role,       // PATIENT, DOCTOR, ADMINISTRATOR
            roleId: result.user!.role_id,  // 1, 2, 3
          },
          token: result.token,
          refreshToken: result.refreshToken,
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
    // Validar contraseña
    if (body.password && body.password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    // Validar Aceptación de Términos (permitir true booleano o string 'true')
    const acceptTerms = body.acceptTerms === true || body.acceptTerms === 'true';
    if (!acceptTerms) {
      errors.push('Must accept terms and conditions');
    }

    // Validar Aceptación de Privacidad (permitir true booleano o string 'true')
    const acceptPrivacy = body.acceptPrivacy === true || body.acceptPrivacy === 'true';
    if (!acceptPrivacy) {
      errors.push('Must accept privacy policy');
    }

    if (errors.length > 0) {
      console.log('Register Validation Failed. Errors:', errors);
      console.log('Register Body received:', {
        ...body,
        password: '***', // Ocultar password en logs
        acceptTerms: body.acceptTerms,
        typeTerms: typeof body.acceptTerms,
        acceptPrivacy: body.acceptPrivacy,
        typePrivacy: typeof body.acceptPrivacy
      });
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
   * 👤 Get current user - GET /api/auth/me
   * Returns the authenticated user's information
   */
  async getMe(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const roleId = req.user?.roleId;
      const role = req.user?.role;

      if (!userId) {
        this.sendErrorResponse(res, 401, 'User not authenticated', 'UNAUTHORIZED');
        return;
      }

      // Get user data from database
      const factory = DatabaseServiceFactory.getInstance();
      const connection = await factory.getConnection();

      const userResult = await connection.query(
        `SELECT 
          u.user_id as id,
          u.email,
          u.email_verified,
          u.is_active,
          u.role_id,
          u.created_at,
          u.updated_at,
          p.patient_id,
          p.patient_name as nombre,
          p.patient_last_name as apellido,
          p.phone,
          p.date_of_birth,
          p.gender
        FROM users u
        LEFT JOIN patient p ON u.user_id = p.user_id
        WHERE u.user_id = $1`,
        [userId]
      );

      if (userResult.length === 0) {
        this.sendErrorResponse(res, 404, 'User not found', 'USER_NOT_FOUND');
        return;
      }

      let userData = userResult[0];

      // Auto-create patient record if user is PATIENT role (1) and doesn't have one
      if (userData.role_id === 1 && !userData.patient_id) {
        this.logger.info(`Auto-creating patient record for user ${userId}`);
        const createResult = await connection.query(
          `INSERT INTO patient (user_id, patient_name, patient_last_name, country, created_at, updated_at)
           VALUES ($1, '', '', 'Chile', $2, NOW())
           RETURNING patient_id`,
          [userId, userData.created_at || new Date()]
        );
        
        if (createResult.length > 0) {
          userData.patient_id = createResult[0].patient_id;
          this.logger.info(`Patient record created with patient_id: ${userData.patient_id}`);
        }
      }

      this.sendSuccessResponse(res, 200, {
        user: {
          id: userData.id,
          email: userData.email,
          nombre: userData.nombre || '',
          apellido: userData.apellido || '',
          phone: userData.phone || null,
          dateOfBirth: userData.date_of_birth || null,
          gender: userData.gender || null,
          emailVerified: userData.email_verified,
          isActive: userData.is_active,
          roleId: userData.role_id,
          role: role || 'PATIENT',
          patientId: userData.patient_id || null,
          createdAt: userData.created_at,
          updatedAt: userData.updated_at
        }
      });

    } catch (error) {
      this.logger.error('GetMe endpoint error:', error);
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