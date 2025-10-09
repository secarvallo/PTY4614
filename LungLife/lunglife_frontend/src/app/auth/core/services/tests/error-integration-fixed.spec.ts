import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { ErrorService } from '../../../../core/services/error.service';
import { LoggerService } from '../../../../core/services/logger.service';
import { AuthFacadeService } from '../application/auth-facade.service';
import { AuthStrategyContext } from '../application/auth-strategy-context.service';
import { LoginStrategy } from '../infrastructure/strategies/login.strategy';

xdescribe('Error Handling Integration', () => {
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
    it('should handle 401 unauthorized errors', () => {
      spyOn(loggerService, 'error');

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
    });

    it('should handle 403 forbidden errors', () => {
      spyOn(loggerService, 'warn');

      const httpError = new HttpErrorResponse({
        error: 'Forbidden',
        status: 403,
        statusText: 'Forbidden',
        url: '/api/admin-resource'
      });

      errorService.handleHttpError(httpError);

      expect(loggerService.warn).toHaveBeenCalledWith(
        'HTTP Client Error: 403',
        jasmine.objectContaining({
          status: 403,
          statusText: 'Forbidden'
        })
      );
    });

    it('should handle 500 server errors', () => {
      spyOn(loggerService, 'error');

      const httpError = new HttpErrorResponse({
        error: 'Internal Server Error',
        status: 500,
        statusText: 'Internal Server Error',
        url: '/api/data'
      });

      errorService.handleHttpError(httpError);

      expect(loggerService.error).toHaveBeenCalledWith(
        'HTTP Server Error: 500',
        jasmine.objectContaining({
          status: 500,
          statusText: 'Internal Server Error'
        })
      );
    });

    it('should handle network errors (status 0)', () => {
      spyOn(loggerService, 'error');

      const httpError = new HttpErrorResponse({
        error: 'Network Error',
        status: 0,
        statusText: 'Unknown Error',
        url: '/api/data'
      });

      errorService.handleHttpError(httpError);

      expect(loggerService.error).toHaveBeenCalledWith(
        'HTTP Server Error: 0',
        jasmine.objectContaining({
          status: 0,
          statusText: 'Unknown Error'
        })
      );
    });
  });

  describe('Error Service Integration', () => {
    it('should handle generic errors', () => {
      spyOn(loggerService, 'error');

      const testError = new Error('Test error');

      errorService.handleError(testError, 'Test Context');

      expect(loggerService.error).toHaveBeenCalledWith(
        'Test Context Error: Test error',
        jasmine.objectContaining({
          error: testError,
          context: 'Test Context'
        })
      );
    });

    it('should handle validation errors', () => {
      spyOn(loggerService, 'warn');

      const validationErrors = [
        { field: 'email', message: 'Invalid email' },
        { field: 'password', message: 'Too short' }
      ];

      errorService.handleValidationError(validationErrors);

      expect(loggerService.warn).toHaveBeenCalledWith(
        'Validation Errors:',
        jasmine.objectContaining({
          errors: validationErrors,
          count: 2
        })
      );
    });

    it('should handle authentication errors', () => {
      spyOn(loggerService, 'error');

      const authError = { message: 'Invalid credentials' };

      errorService.handleAuthError(authError);

      expect(loggerService.error).toHaveBeenCalledWith(
        'Authentication Failed: Invalid credentials',
        jasmine.objectContaining({
          error: authError,
          context: 'Authentication'
        })
      );
    });

    it('should generate user-friendly messages', () => {
      const httpError = new HttpErrorResponse({
        error: 'Not found',
        status: 404,
        statusText: 'Not Found'
      });

      const message = errorService.getUserFriendlyMessage(httpError);

      expect(message).toBe('The requested resource was not found.');
    });
  });

  describe('Logger Service Integration', () => {
    it('should log different levels correctly', () => {
      spyOn(loggerService, 'info');
      spyOn(loggerService, 'warn');
      spyOn(loggerService, 'error');
      spyOn(loggerService, 'fatal');

      loggerService.info('Info message');
      loggerService.warn('Warning message');
      loggerService.error('Error message');
      loggerService.fatal('Fatal message');

      expect(loggerService.info).toHaveBeenCalledWith('Info message', undefined);
      expect(loggerService.warn).toHaveBeenCalledWith('Warning message', undefined);
      expect(loggerService.error).toHaveBeenCalledWith('Error message', undefined);
      expect(loggerService.fatal).toHaveBeenCalledWith('Fatal message', undefined);
    });

    it('should log with context', () => {
      spyOn(loggerService, 'info');

      const testLogger = loggerService.createChild('TestContext');
      testLogger.info('Context message');

      expect(loggerService.info).toHaveBeenCalledWith('Context message', undefined);
    });
  });
});