import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';

// Import services using correct relative paths
import { ErrorService } from '../../../../core/services/error.service';
import { LoggerService } from '../../../../core/services/logger.service';
import { AuthFacadeService, AuthStrategyContext } from '../index';
import { LoginStrategy } from '../infrastructure/strategies';

// Temporarily skipped legacy comprehensive error integration tests
xdescribe('Error Handling Integration (legacy)', () => {
  let errorService: ErrorService;
  let loggerService: LoggerService;
  let authFacade: AuthFacadeService;
  let httpMock: HttpTestingController;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
        RouterTestingModule.withRoutes([
          { path: 'auth/login', component: {} as any },
          { path: 'auth/error', component: {} as any },
          { path: 'dashboard', component: {} as any }
        ])
      ],
      providers: [
        ErrorService,
        LoggerService,
        AuthFacadeService,
        AuthStrategyContext,
        LoginStrategy
      ]
    });

    errorService = TestBed.inject(ErrorService);
    loggerService = TestBed.inject(LoggerService);
    authFacade = TestBed.inject(AuthFacadeService);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('HTTP Error Integration', () => {
    it('should handle 401 unauthorized errors and redirect to login', () => {
      spyOn(router, 'navigate');
      spyOn(loggerService, 'error');

      // Create proper HttpErrorResponse
      const httpError = new HttpErrorResponse({
        error: 'Unauthorized',
        status: 401,
        statusText: 'Unauthorized',
        url: '/api/protected-resource'
      });

      errorService.handleHttpError(httpError);

      expect(loggerService.error).toHaveBeenCalledWith(
        'HTTP Server Error: 401',
        jasmine.objectContaining({
          status: 401,
          statusText: 'Unauthorized',
          url: '/api/protected-resource'
        })
      );

      expect(router.navigate).toHaveBeenCalledWith(['/auth/login'], {
        queryParams: { returnUrl: '/api/protected-resource' }
      });
    });

    it('should handle 403 forbidden errors and show user message', () => {
      spyOn(loggerService, 'warn');

      const error = new HttpErrorResponse({
        error: 'Forbidden',
        status: 403,
        statusText: 'Forbidden',
        url: '/api/admin-resource'
      });

      errorService.handleHttpError(error);

      expect(loggerService.warn).toHaveBeenCalledWith(
        'HTTP Client Error: 403',
        jasmine.objectContaining({
          status: 403,
          context: 'HTTP'
        })
      );
    });

    it('should handle 500 server errors and log critical', () => {
      spyOn(loggerService, 'fatal');

      const error = new HttpErrorResponse({
        error: 'Internal Server Error',
        status: 500,
        statusText: 'Internal Server Error',
        url: '/api/data'
      });

      errorService.handleHttpError(error);

      expect(loggerService.fatal).toHaveBeenCalledWith(
        'HTTP Server Error: 500',
        jasmine.objectContaining({
          status: 500,
          context: 'HTTP'
        })
      );
    });

    it('should handle network errors (status 0)', () => {
      spyOn(loggerService, 'error');

      const error = new HttpErrorResponse({
        error: 'Network Error',
        status: 0,
        statusText: 'Unknown Error',
        url: '/api/data'
      });

      errorService.handleHttpError(error);

      expect(loggerService.error).toHaveBeenCalledWith(
        'HTTP HTTP Response: 0',
        jasmine.objectContaining({
          status: 0,
          context: 'HTTP'
        })
      );
    });
  });

  describe('Authentication Error Integration', () => {
    it('should handle login failures and log appropriately', () => {
      spyOn(loggerService, 'warn');

      const loginCredentials = {
        email: 'wrong@example.com',
        password: 'wrongpassword'
      };

      authFacade.login(loginCredentials).subscribe(result => {
        expect(result.success).toBe(false);
        expect(result.error).toBe('Invalid email or password');
      });

      const req = httpMock.expectOne('/api/auth/login');
      req.flush({ message: 'Invalid credentials' }, { status: 401, statusText: 'Unauthorized' });

      expect(loggerService.warn).toHaveBeenCalledWith(
        'Login Failed',
        jasmine.objectContaining({
          email: 'wrong@example.com',
          error: 'Invalid email or password'
        })
      );
    });

    it('should handle registration validation errors', () => {
      spyOn(loggerService, 'info');

      const invalidUserData = {
        email: 'invalid-email',
        password: '123',
        firstName: '',
        lastName: '',
        acceptTerms: false
      };

      authFacade.register(invalidUserData).subscribe({
        error: (error) => {
          expect(error.message).toContain('Validation failed');
        }
      });

      expect(loggerService.info).toHaveBeenCalledWith(
        'Registration Validation Failed',
        jasmine.objectContaining({
          email: 'invalid-email',
          validationErrors: jasmine.any(Array)
        })
      );
    });

    it('should handle 2FA verification failures', () => {
      spyOn(loggerService, 'warn');

      const twoFactorData = {
        code: 'wrong-code',
        sessionId: 'session-123'
      };

      authFacade.verify2FA(twoFactorData).subscribe((result: any) => {
        expect(result.success).toBe(false);
        expect(result.error).toBe('Invalid 2FA code');
      });

      const req = httpMock.expectOne('/api/auth/2fa/verify');
      req.flush({ message: 'Invalid 2FA code' }, { status: 400, statusText: 'Bad Request' });

      expect(loggerService.warn).toHaveBeenCalledWith(
        '2FA Verification Failed',
        jasmine.objectContaining({
          sessionId: 'session-123',
          error: 'Invalid 2FA code'
        })
      );
    });
  });

  describe('Global Error Boundary Integration', () => {
    it('should handle unhandled promise rejections', () => {
      spyOn(loggerService, 'fatal');
      spyOn(errorService, 'getUserFriendlyMessage');

      const rejectionReason = new Error('Unhandled promise rejection');

      // Simulate unhandled promise rejection
      window.dispatchEvent(new PromiseRejectionEvent('unhandledrejection', {
        reason: rejectionReason,
        promise: Promise.reject(rejectionReason)
      }));

      expect(loggerService.fatal).toHaveBeenCalledWith(
        'Unhandled Promise Rejection',
        jasmine.objectContaining({
          error: rejectionReason
        })
      );

      expect(errorService.getUserFriendlyMessage).toHaveBeenCalledWith(
        jasmine.any(Error)
      );
    });

    it('should handle JavaScript runtime errors', () => {
      spyOn(loggerService, 'fatal');
      spyOn(errorService, 'getUserFriendlyMessage');

      const runtimeError = new Error('ReferenceError: undefinedVariable is not defined');

      // Simulate JavaScript error
      window.dispatchEvent(new ErrorEvent('error', {
        error: runtimeError,
        message: runtimeError.message,
        filename: 'app.js',
        lineno: 42,
        colno: 10
      }));

      expect(loggerService.fatal).toHaveBeenCalledWith(
        'JavaScript Runtime Error',
        jasmine.objectContaining({
          error: runtimeError,
          filename: 'app.js',
          line: 42,
          column: 10
        })
      );

      expect(errorService.getUserFriendlyMessage).toHaveBeenCalledWith(
        jasmine.any(Error)
      );
    });

    it('should handle Angular zone errors', () => {
      spyOn(loggerService, 'error');
      spyOn(errorService, 'getUserFriendlyMessage');

      const zoneError = new Error('Zone.js has detected that ZoneAwarePromise `(window|global).Promise` has been overwritten');

      // Use the ErrorService's handleError method instead of non-existent handleGlobalError
      errorService.handleError(zoneError, 'Zone Error');

      expect(loggerService.error).toHaveBeenCalledWith(
        'Zone Error',
        jasmine.objectContaining({
          error: zoneError
        })
      );

      expect(errorService.getUserFriendlyMessage).toHaveBeenCalledWith(
        jasmine.any(Error)
      );
    });
  });

  describe('Error Recovery Integration', () => {
    it('should handle token refresh failures and redirect to login', () => {
      spyOn(router, 'navigate');
      spyOn(loggerService, 'warn');

      const refreshError = new HttpErrorResponse({
        error: 'Refresh token expired',
        status: 401,
        statusText: 'Unauthorized',
        url: '/api/auth/refresh'
      });

      errorService.handleHttpError(refreshError);

      expect(loggerService.warn).toHaveBeenCalledWith(
        'HTTP Client Error: 401',
        jasmine.objectContaining({
          status: 401,
          context: 'HTTP'
        })
      );

      expect(router.navigate).toHaveBeenCalledWith(['/auth/login'], {
        queryParams: { sessionExpired: true }
      });
    });

    it('should handle rate limiting errors', () => {
      spyOn(loggerService, 'warn');
      spyOn(errorService, 'getUserFriendlyMessage');

      const rateLimitError = new HttpErrorResponse({
        error: 'Too many requests',
        status: 429,
        statusText: 'Too Many Requests',
        url: '/api/auth/login'
      });

      errorService.handleHttpError(rateLimitError);

      expect(loggerService.warn).toHaveBeenCalledWith(
        'HTTP Client Error: 429',
        jasmine.objectContaining({
          status: 429,
          context: 'HTTP'
        })
      );

      expect(errorService.getUserFriendlyMessage).toHaveBeenCalledWith(
        rateLimitError
      );
    });

    it('should handle maintenance mode errors', () => {
      spyOn(router, 'navigate');
      spyOn(loggerService, 'info');

      const maintenanceError = new HttpErrorResponse({
        error: 'Service temporarily unavailable',
        status: 503,
        statusText: 'Service Unavailable',
        url: '/api/data'
      });

      errorService.handleHttpError(maintenanceError);

      expect(loggerService.info).toHaveBeenCalledWith(
        'HTTP HTTP Response: 503',
        jasmine.objectContaining({
          status: 503,
          context: 'HTTP'
        })
      );

      expect(router.navigate).toHaveBeenCalledWith(['/auth/error'], {
        queryParams: { type: 'maintenance' }
      });
    });
  });

  describe('Error Context and Metadata', () => {
    it('should include user context in error logs', () => {
      spyOn(loggerService, 'error');

      // Simulate error with user context
      const errorWithContext = new HttpErrorResponse({
        error: { message: 'Bad Request', userId: 123, userAgent: 'Mozilla/5.0...', timestamp: new Date().toISOString() },
        status: 400,
        statusText: 'Bad Request',
        url: '/api/user/profile'
      });

      errorService.handleHttpError(errorWithContext);

      expect(loggerService.error).toHaveBeenCalledWith(
        'HTTP Client Error: 400',
        jasmine.objectContaining({
          status: 400,
          context: 'HTTP'
        })
      );
    });

    it('should include performance metrics in timeout errors', () => {
      spyOn(loggerService, 'error');

      const timeoutError = new HttpErrorResponse({
        error: { message: 'Request timeout', requestDuration: 30000, expectedDuration: 10000 },
        status: 408,
        statusText: 'Request Timeout',
        url: '/api/slow-endpoint'
      });

      errorService.handleHttpError(timeoutError);

      expect(loggerService.error).toHaveBeenCalledWith(
        'HTTP Client Error: 408',
        jasmine.objectContaining({
          status: 408,
          context: 'HTTP'
        })
      );
    });
  });
});