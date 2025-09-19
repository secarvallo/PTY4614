import { Injectable, ErrorHandler, Injector } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { LoggerService } from './logger.service';

/**
 * 🚨 Global Error Handler
 * Catches and handles all unhandled errors in the application
 */
@Injectable({ providedIn: 'root' })
export class GlobalErrorHandler implements ErrorHandler {
  constructor(private injector: Injector) {}

  handleError(error: any): void {
    const logger = this.injector.get(LoggerService);

    if (error instanceof HttpErrorResponse) {
      this.handleHttpError(error, logger);
    } else if (error instanceof Error) {
      this.handleClientError(error, logger);
    } else {
      this.handleUnknownError(error, logger);
    }

    // Re-throw error in development
    if (!this.isProduction()) {
      console.error('Unhandled error:', error);
    }
  }

  private handleHttpError(error: HttpErrorResponse, logger: LoggerService): void {
    let message = `HTTP Error ${error.status}: ${error.message}`;

    switch (error.status) {
      case 400:
        message = 'Bad Request - Please check your input';
        break;
      case 401:
        message = 'Unauthorized - Please log in again';
        break;
      case 403:
        message = 'Forbidden - You do not have permission';
        break;
      case 404:
        message = 'Not Found - The requested resource was not found';
        break;
      case 429:
        message = 'Too Many Requests - Please try again later';
        break;
      case 500:
        message = 'Internal Server Error - Please try again later';
        break;
      case 503:
        message = 'Service Unavailable - Please try again later';
        break;
    }

    logger.error(`HTTP Error: ${message}`, {
      status: error.status,
      statusText: error.statusText,
      url: error.url,
      error: error.error
    });
  }

  private handleClientError(error: Error, logger: LoggerService): void {
    logger.error(`Client Error: ${error.message}`, {
      name: error.name,
      stack: error.stack,
      filename: (error as any).filename,
      lineno: (error as any).lineno,
      colno: (error as any).colno
    });
  }

  private handleUnknownError(error: any, logger: LoggerService): void {
    logger.error('Unknown Error occurred', {
      error: error,
      type: typeof error,
      constructor: error?.constructor?.name
    });
  }

  private isProduction(): boolean {
    return typeof window !== 'undefined' &&
           window.location.hostname !== 'localhost' &&
           !window.location.hostname.includes('127.0.0.1');
  }
}

/**
 * ⚠️ Error Service
 * Service for handling and reporting errors throughout the application
 */
@Injectable({ providedIn: 'root' })
export class ErrorService {
  constructor(private logger: LoggerService) {}

  /**
   * Handle application error
   */
  handleError(error: any, context?: string): void {
    const errorContext = context || 'Application';

    if (error instanceof HttpErrorResponse) {
      this.handleHttpError(error, errorContext);
    } else {
      this.logger.error(`${errorContext} Error: ${error?.message || 'Unknown error'}`, {
        error,
        context: errorContext,
        timestamp: new Date()
      });
    }
  }

  /**
   * Handle HTTP error with specific context
   */
  handleHttpError(error: HttpErrorResponse, context: string = 'HTTP'): void {
    const errorData = {
      status: error.status,
      statusText: error.statusText,
      url: error.url,
      context,
      timestamp: new Date(),
      error: error.error
    };

    if (error.status >= 500) {
      this.logger.error(`${context} Server Error: ${error.status}`, errorData);
    } else if (error.status >= 400) {
      this.logger.warn(`${context} Client Error: ${error.status}`, errorData);
    } else {
      this.logger.info(`${context} HTTP Response: ${error.status}`, errorData);
    }
  }

  /**
   * Handle validation error
   */
  handleValidationError(errors: any[], context: string = 'Validation'): void {
    this.logger.warn(`${context} Errors:`, {
      errors,
      count: errors.length,
      context,
      timestamp: new Date()
    });
  }

  /**
   * Handle authentication error
   */
  handleAuthError(error: any, context: string = 'Authentication'): void {
    this.logger.error(`${context} Failed: ${error?.message || 'Authentication error'}`, {
      error,
      context,
      timestamp: new Date()
    });
  }

  /**
   * Report error to external service (future implementation)
   */
  reportError(error: any, context?: string): void {
    // TODO: Implement error reporting to external service
    this.logger.info('Error reported to external service', {
      error,
      context,
      timestamp: new Date()
    });
  }

  /**
   * Create user-friendly error message
   */
  getUserFriendlyMessage(error: any): string {
    if (error instanceof HttpErrorResponse) {
      switch (error.status) {
        case 400:
          return 'Please check your input and try again.';
        case 401:
          return 'Please log in to continue.';
        case 403:
          return 'You do not have permission to perform this action.';
        case 404:
          return 'The requested resource was not found.';
        case 429:
          return 'Too many requests. Please wait a moment and try again.';
        case 500:
          return 'Something went wrong on our end. Please try again later.';
        default:
          return 'An unexpected error occurred. Please try again.';
      }
    }

    if (error?.message) {
      return error.message;
    }

    return 'An unexpected error occurred. Please try again.';
  }
}