/**
 * Middleware Layer
 * Centralized middleware for authentication, validation, logging, and error handling
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from './config/config';
import { RateLimitResult } from './interfaces/index';

// Extend Express Request interface to include user info
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
        type?: string;
        roleId?: number;  // 1=PATIENT, 2=DOCTOR, 3=ADMINISTRATOR
        role?: string;    // PATIENT, DOCTOR, ADMINISTRATOR
      };
      deviceInfo?: {
        ipAddress: string;
        userAgent: string;
      };
    }
  }
}

/**
 * JWT Authentication Middleware
 */
export class AuthMiddleware {
  /**
   * Verify JWT token from Authorization header
   */
  static authenticateToken(req: Request, res: Response, next: NextFunction): void {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.startsWith('Bearer ')
        ? authHeader.substring(7)
        : null;

      if (!token) {
        res.status(401).json({
          success: false,
          error: 'Access token required',
          errorCode: 'TOKEN_MISSING'
        });
        return;
      }

      // Verify token
      const jwtConfig = config.getJWTConfig();
      const decoded = jwt.verify(token, jwtConfig.accessTokenSecret as string, {
        issuer: jwtConfig.issuer,
        audience: jwtConfig.audience,
      }) as any;

      // Attach user info to request
      req.user = {
        id: decoded.userId,
        email: decoded.email,
        type: decoded.type,
        roleId: decoded.roleId,
        role: decoded.role,
      };

      next();
    } catch (error) {
      console.error('Token verification failed:', error);

      if (error instanceof jwt.TokenExpiredError) {
        res.status(401).json({
          success: false,
          error: 'Token expired',
          errorCode: 'TOKEN_EXPIRED'
        });
      } else if (error instanceof jwt.JsonWebTokenError) {
        res.status(401).json({
          success: false,
          error: 'Invalid token',
          errorCode: 'TOKEN_INVALID'
        });
      } else {
        res.status(401).json({
          success: false,
          error: 'Token verification failed',
          errorCode: 'TOKEN_ERROR'
        });
      }
    }
  }

  /**
   * Optional authentication (doesn't fail if no token)
   */
  static optionalAuthenticate(req: Request, res: Response, next: NextFunction): void {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.startsWith('Bearer ')
        ? authHeader.substring(7)
        : null;

      if (token) {
        const jwtConfig = config.getJWTConfig();
        const decoded = jwt.verify(token, jwtConfig.accessTokenSecret as string, {
          issuer: jwtConfig.issuer,
          audience: jwtConfig.audience,
        }) as any;

        req.user = {
          id: decoded.userId,
          email: decoded.email,
          type: decoded.type,
          roleId: decoded.roleId,
          role: decoded.role,
        };
      }

      next();
    } catch (error) {
      // Ignore auth errors for optional auth
      next();
    }
  }

  /**
   * Require specific role(s)
   * @param allowedRoles - Array of role IDs or single role ID (1=PATIENT, 2=DOCTOR, 3=ADMIN)
   */
  static requireRole(...allowedRoles: number[]) {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          errorCode: 'NOT_AUTHENTICATED'
        });
        return;
      }

      const userRoleId = req.user.roleId;
      if (!userRoleId || !allowedRoles.includes(userRoleId)) {
        res.status(403).json({
          success: false,
          error: 'Access denied - insufficient permissions',
          errorCode: 'FORBIDDEN'
        });
        return;
      }

      next();
    };
  }

  /**
   * Require admin role (role_id = 3)
   */
  static requireAdmin(req: Request, res: Response, next: NextFunction): void {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        errorCode: 'NOT_AUTHENTICATED'
      });
      return;
    }

    if (req.user.roleId !== 3) {
      res.status(403).json({
        success: false,
        error: 'Access denied - admin only',
        errorCode: 'ADMIN_REQUIRED'
      });
      return;
    }

    next();
  }

  /**
   * Require patient role (role_id = 1)
   */
  static requirePatient(req: Request, res: Response, next: NextFunction): void {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        errorCode: 'NOT_AUTHENTICATED'
      });
      return;
    }

    if (req.user.roleId !== 1) {
      res.status(403).json({
        success: false,
        error: 'Access denied - patient only',
        errorCode: 'PATIENT_REQUIRED'
      });
      return;
    }

    next();
  }

  /**
   * Require doctor role (role_id = 2)
   */
  static requireDoctor(req: Request, res: Response, next: NextFunction): void {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        errorCode: 'NOT_AUTHENTICATED'
      });
      return;
    }

    if (req.user.roleId !== 2) {
      res.status(403).json({
        success: false,
        error: 'Access denied - doctor only',
        errorCode: 'DOCTOR_REQUIRED'
      });
      return;
    }

    next();
  }
}

/**
 * Request Logging Middleware
 */
export class LoggingMiddleware {
  /**
   * Log all incoming requests
   */
  static logRequest(req: Request, res: Response, next: NextFunction): void {
    const startTime = Date.now();

    // Extract device info
    req.deviceInfo = {
      ipAddress: this.getClientIP(req),
      userAgent: req.get('User-Agent') || 'Unknown',
    };

    // Log request
    console.log(`📨 ${req.method} ${req.path} - IP: ${req.deviceInfo.ipAddress}`);

    // Log response when finished
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const statusCode = res.statusCode;
      const statusEmoji = statusCode >= 400 ? '❌' : statusCode >= 300 ? '⚠️' : '✅';

      console.log(`${statusEmoji} ${req.method} ${req.path} - ${statusCode} - ${duration}ms`);
    });

    next();
  }

  /**
   * Get client IP address
   */
  private static getClientIP(req: Request): string {
    const forwarded = req.get('X-Forwarded-For');
    const realIP = req.get('X-Real-IP');

    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }

    if (realIP) {
      return realIP;
    }

    return req.ip || req.connection.remoteAddress || 'Unknown';
  }
}

/**
 * Validation Middleware
 */
export class ValidationMiddleware {
  /**
   * Validate request body against schema
   */
  static validateBody(schema: any) {
    return (req: Request, res: Response, next: NextFunction): void => {
      try {
        const validatedData = schema.parse(req.body);
        req.body = validatedData;
        next();
      } catch (error: any) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          errorCode: 'VALIDATION_ERROR',
          details: error.errors || error.message,
        });
      }
    };
  }

  /**
   * Validate request parameters
   */
  static validateParams(schema: any) {
    return (req: Request, res: Response, next: NextFunction): void => {
      try {
        const validatedData = schema.parse(req.params);
        req.params = validatedData;
        next();
      } catch (error: any) {
        res.status(400).json({
          success: false,
          error: 'Parameter validation failed',
          errorCode: 'PARAM_VALIDATION_ERROR',
          details: error.errors || error.message,
        });
      }
    };
  }

  /**
   * Validate query parameters
   */
  static validateQuery(schema: any) {
    return (req: Request, res: Response, next: NextFunction): void => {
      try {
        const validatedData = schema.parse(req.query);
        req.query = validatedData;
        next();
      } catch (error: any) {
        res.status(400).json({
          success: false,
          error: 'Query validation failed',
          errorCode: 'QUERY_VALIDATION_ERROR',
          details: error.errors || error.message,
        });
      }
    };
  }
}

/**
 * Rate Limiting Middleware
 */
export class RateLimitMiddleware {
  private static attempts = new Map<string, { count: number; resetTime: number }>();

  /**
   * Rate limit by IP address
   */
  static rateLimit(maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000) {
    return (req: Request, res: Response, next: NextFunction): void => {
      const clientIP = this.getClientIP(req);
      const now = Date.now();
      const windowStart = now - windowMs;

      // Clean up old entries
      for (const [ip, data] of this.attempts.entries()) {
        if (data.resetTime < now) {
          this.attempts.delete(ip);
        }
      }

      // Get or create attempt record
      let attemptData = this.attempts.get(clientIP);
      if (!attemptData || attemptData.resetTime < now) {
        attemptData = { count: 0, resetTime: now + windowMs };
        this.attempts.set(clientIP, attemptData);
      }

      // Check if limit exceeded
      if (attemptData.count >= maxAttempts) {
        const remainingTime = Math.ceil((attemptData.resetTime - now) / 1000);

        res.status(429).json({
          success: false,
          error: 'Too many requests',
          errorCode: 'RATE_LIMIT_EXCEEDED',
          message: `Try again in ${remainingTime} seconds`,
          retryAfter: remainingTime,
        });
        return;
      }

      // Increment attempts
      attemptData.count++;
      next();
    };
  }

  /**
   * Get client IP address
   */
  private static getClientIP(req: Request): string {
    const forwarded = req.get('X-Forwarded-For');
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    return req.ip || req.connection.remoteAddress || 'Unknown';
  }
}

/**
 * CORS Middleware
 */
export class CORSMiddleware {
  /**
   * Handle CORS preflight requests
   */
  static handleCORS(req: Request, res: Response, next: NextFunction): void {
    const allowedOrigins = config.getConfig().corsOrigins;
    const origin = req.headers.origin;

    // Check if origin is allowed
    if (allowedOrigins.includes('*') || (origin && allowedOrigins.includes(origin))) {
      res.header('Access-Control-Allow-Origin', origin || allowedOrigins[0]);
    }

    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }

    next();
  }
}

/**
 * Error Handling Middleware
 */
export class ErrorMiddleware {
  /**
   * Global error handler
   */
  static handleErrors(err: any, req: Request, res: Response, next: NextFunction): void {
    console.error('Unhandled error:', err);

    // Default error response
    let statusCode = 500;
    let errorCode = 'INTERNAL_SERVER_ERROR';
    let message = 'An unexpected error occurred';

    // Handle specific error types
    if (err.name === 'ValidationError') {
      statusCode = 400;
      errorCode = 'VALIDATION_ERROR';
      message = 'Invalid input data';
    } else if (err.name === 'UnauthorizedError') {
      statusCode = 401;
      errorCode = 'UNAUTHORIZED';
      message = 'Authentication required';
    } else if (err.name === 'ForbiddenError') {
      statusCode = 403;
      errorCode = 'FORBIDDEN';
      message = 'Access denied';
    } else if (err.name === 'NotFoundError') {
      statusCode = 404;
      errorCode = 'NOT_FOUND';
      message = 'Resource not found';
    } else if (err.code === '23505') { // PostgreSQL unique constraint violation
      statusCode = 409;
      errorCode = 'CONFLICT';
      message = 'Resource already exists';
    }

    res.status(statusCode).json({
      success: false,
      error: message,
      errorCode,
      ...(config.isDevelopment() && { stack: err.stack }),
    });
  }

  /**
   * Handle 404 errors
   */
  static handle404(req: Request, res: Response, next: NextFunction): void {
    res.status(404).json({
      success: false,
      error: 'Endpoint not found',
      errorCode: 'NOT_FOUND',
      path: req.path,
      method: req.method,
    });
  }
}

/**
 * Security Headers Middleware
 */
export class SecurityMiddleware {
  /**
   * Add security headers
   */
  static addSecurityHeaders(req: Request, res: Response, next: NextFunction): void {
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');

    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Enable XSS protection
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Referrer policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Content Security Policy (basic)
    res.setHeader('Content-Security-Policy', "default-src 'self'");

    // HSTS (only in production with HTTPS)
    if (config.isProduction() && req.secure) {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }

    next();
  }
}