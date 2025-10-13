/**
 * 🔐 Nuevo Auth Controller - Clean Architecture
 * Implementación mejorada del controlador de autenticación
 * Siguiendo principios SOLID y Clean Architecture
 */

import { Request, Response } from 'express';
import { AuthenticationService, RegisterUserRequest, LoginRequest } from '../core/services/authentication.service';
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
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        phone: req.body.phone,
        birthDate: req.body.birthDate ? new Date(req.body.birthDate) : undefined,
        acceptTerms: req.body.acceptTerms
      };

      const authService = await this.getAuthService();
      const result = await authService.registerUser(registerRequest);

      if (result.success) {
        const duration = Date.now() - startTime;
        this.logger.info(`Registration successful for ${registerRequest.email} in ${duration}ms`);
        
        res.status(201).json({
          success: true,
          message: 'User registered successfully',
          user: {
            id: result.user!.id,
            email: result.user!.email,
            firstName: result.user!.nombre,
            lastName: result.user!.apellido,
          },
          token: result.token,
        });
      } else {
        this.logger.warn(`Registration failed for ${registerRequest.email}: ${result.error}`);
        this.sendErrorResponse(res, 400, result.error!, result.errorCode!);
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
    if (!body.firstName) errors.push('First name is required');
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