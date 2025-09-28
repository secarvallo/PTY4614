import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { ErrorService } from './error.service';
import { LoggerService } from './logger.service';

describe('ErrorService', () => {
  let service: ErrorService;
  let loggerService: jasmine.SpyObj<LoggerService>;

  beforeEach(() => {
    const loggerSpy = jasmine.createSpyObj('LoggerService', [
      'error', 'warn', 'info'
    ]);

    TestBed.configureTestingModule({
      providers: [
        ErrorService,
        { provide: LoggerService, useValue: loggerSpy }
      ]
    });

    service = TestBed.inject(ErrorService);
    loggerService = TestBed.inject(LoggerService) as jasmine.SpyObj<LoggerService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('handleError', () => {
    it('should handle HttpErrorResponse', () => {
      const httpError = new HttpErrorResponse({
        error: 'Test error',
        status: 500,
        statusText: 'Internal Server Error',
        url: '/api/test'
      });

      service.handleError(httpError, 'TestContext');

      expect(loggerService.error).toHaveBeenCalledWith(
        'TestContext Server Error: 500',
        jasmine.any(Object)
      );
    });

    it('should handle generic errors', () => {
      const error = new Error('Generic error');

      service.handleError(error, 'TestContext');

      expect(loggerService.error).toHaveBeenCalledWith(
        'TestContext Error: Generic error',
        error
      );
    });

    it('should handle string errors', () => {
      const error = 'String error';

      service.handleError(error, 'TestContext');

      expect(loggerService.error).toHaveBeenCalledWith(
        'TestContext Error: String error',
        error
      );
    });
  });

  describe('handleHttpError', () => {
    it('should handle 400 Bad Request', () => {
      const httpError = new HttpErrorResponse({
        error: 'Bad Request',
        status: 400,
        statusText: 'Bad Request'
      });

      service.handleHttpError(httpError);

      expect(loggerService.warn).toHaveBeenCalledWith(
        'HTTP Client Error: 400',
        jasmine.any(Object)
      );
    });

    it('should handle 500 Internal Server Error', () => {
      const httpError = new HttpErrorResponse({
        error: 'Internal Server Error',
        status: 500,
        statusText: 'Internal Server Error'
      });

      service.handleHttpError(httpError);

      expect(loggerService.error).toHaveBeenCalledWith(
        'HTTP Server Error: 500',
        jasmine.any(Object)
      );
    });

    it('should handle unknown HTTP status', () => {
      const httpError = new HttpErrorResponse({
        error: 'Unknown Error',
        status: 418,
        statusText: "I'm a teapot"
      });

      service.handleHttpError(httpError);

      expect(loggerService.info).toHaveBeenCalledWith(
        'HTTP HTTP Response: 418',
        jasmine.any(Object)
      );
    });
  });

  describe('handleValidationError', () => {
    it('should log validation errors', () => {
      const errors = [
        { field: 'email', message: 'Invalid email' },
        { field: 'password', message: 'Too short' }
      ];

      service.handleValidationError(errors, 'RegistrationForm');

      expect(loggerService.warn).toHaveBeenCalledWith(
        'RegistrationForm Errors:',
        {
          errors,
          count: 2,
          context: 'RegistrationForm',
          timestamp: jasmine.any(Date)
        }
      );
    });
  });

  describe('handleAuthError', () => {
    it('should log authentication errors', () => {
      const error = new Error('Invalid credentials');

      service.handleAuthError(error, 'Login');

      expect(loggerService.error).toHaveBeenCalledWith(
        'Login Failed: Invalid credentials',
        {
          error,
          context: 'Login',
          timestamp: jasmine.any(Date)
        }
      );
    });
  });

  describe('reportError', () => {
    it('should report error to external service', () => {
      const error = new Error('Test error');

      service.reportError(error, 'TestContext');

      expect(loggerService.info).toHaveBeenCalledWith(
        'Error reported to external service',
        {
          error,
          context: 'TestContext',
          timestamp: jasmine.any(Date)
        }
      );
    });
  });

  describe('getUserFriendlyMessage', () => {
    it('should return user-friendly message for 400 error', () => {
      const httpError = new HttpErrorResponse({
        error: 'Bad Request',
        status: 400
      });

      const message = service.getUserFriendlyMessage(httpError);
      expect(message).toBe('Please check your input and try again.');
    });

    it('should return user-friendly message for 401 error', () => {
      const httpError = new HttpErrorResponse({
        error: 'Unauthorized',
        status: 401
      });

      const message = service.getUserFriendlyMessage(httpError);
      expect(message).toBe('Please log in to continue.');
    });

    it('should return user-friendly message for 403 error', () => {
      const httpError = new HttpErrorResponse({
        error: 'Forbidden',
        status: 403
      });

      const message = service.getUserFriendlyMessage(httpError);
      expect(message).toBe('You do not have permission to perform this action.');
    });

    it('should return user-friendly message for 404 error', () => {
      const httpError = new HttpErrorResponse({
        error: 'Not Found',
        status: 404
      });

      const message = service.getUserFriendlyMessage(httpError);
      expect(message).toBe('The requested resource was not found.');
    });

    it('should return user-friendly message for 429 error', () => {
      const httpError = new HttpErrorResponse({
        error: 'Too Many Requests',
        status: 429
      });

      const message = service.getUserFriendlyMessage(httpError);
      expect(message).toBe('Too many requests. Please wait a moment and try again.');
    });

    it('should return user-friendly message for 500 error', () => {
      const httpError = new HttpErrorResponse({
        error: 'Internal Server Error',
        status: 500
      });

      const message = service.getUserFriendlyMessage(httpError);
      expect(message).toBe('Something went wrong on our end. Please try again later.');
    });

    it('should return default message for unknown error', () => {
      const error = new Error('Unknown error');

      const message = service.getUserFriendlyMessage(error);
      expect(message).toBe('An unexpected error occurred. Please try again.');
    });

    it('should return error message if available', () => {
      const error = new Error('Custom error message');

      const message = service.getUserFriendlyMessage(error);
      expect(message).toBe('Custom error message');
    });
  });
});