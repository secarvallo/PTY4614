import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, map, timeout } from 'rxjs/operators';
import { AuthStrategy, AuthResult } from '../../../interfaces/auth-strategy.interface';
import { environment } from 'src/environments/environment';

/**
 * 🔧 Base Authentication Strategy
 * Provides common functionality for all authentication strategies
 */
@Injectable()
export abstract class BaseAuthStrategy implements AuthStrategy {
  protected readonly TIMEOUT_MS = 30000; // 30 seconds
  protected readonly API_BASE_URL = environment.apiUrl + '/auth';

  constructor(protected http: HttpClient) {}

  /**
   * Execute the authentication strategy with error handling
   */
  execute(data: any): Observable<AuthResult> {
    if (!this.canHandle(data)) {
      return of({
        success: false,
        error: `Invalid data for ${this.getStrategyName()} strategy`,
        metadata: {
          strategy: this.getStrategyName(),
          timestamp: new Date()
        }
      });
    }

    const startTime = Date.now();

    return this.performAuthentication(data).pipe(
      timeout(this.TIMEOUT_MS),
      map(result => ({
        ...result,
        metadata: {
          strategy: this.getStrategyName(),
          timestamp: new Date(),
          duration: Date.now() - startTime
        }
      })),
      catchError(error => this.handleError(error, startTime))
    );
  }

  /**
   * Abstract method to be implemented by concrete strategies
   */
  abstract performAuthentication(data: any): Observable<AuthResult>;

  /**
   * Abstract method to get strategy name
   */
  abstract getStrategyName(): string;

  /**
   * Abstract method to validate if strategy can handle data
   */
  abstract canHandle(data: any): boolean;

  /**
   * Centralized error handling
   */
  protected handleError(error: any, startTime: number): Observable<AuthResult> {
    let errorMessage = 'An unexpected error occurred';

    if (error instanceof HttpErrorResponse) {
      switch (error.status) {
        case 400:
          errorMessage = 'Invalid request data';
          break;
        case 401:
          errorMessage = 'Invalid credentials';
          break;
        case 403:
          errorMessage = 'Access forbidden';
          break;
        case 404:
          errorMessage = 'Authentication service not found';
          break;
        case 429:
          errorMessage = 'Too many requests. Please try again later';
          break;
        case 500:
          errorMessage = 'Server error. Please try again later';
          break;
        default:
          errorMessage = `Authentication failed (${error.status})`;
      }
    } else if (error.name === 'TimeoutError') {
      errorMessage = 'Request timed out. Please check your connection';
    }

    return of({
      success: false,
      error: errorMessage,
      metadata: {
        strategy: this.getStrategyName(),
        timestamp: new Date(),
        duration: Date.now() - startTime
      }
    });
  }

  /**
   * Helper method to create success result
   */
  protected createSuccessResult(data: Partial<AuthResult>): AuthResult {
    return {
      success: true,
      ...data
    };
  }

  /**
   * Helper method to create error result
   */
  protected createErrorResult(error: string): AuthResult {
    return {
      success: false,
      error
    };
  }
}
