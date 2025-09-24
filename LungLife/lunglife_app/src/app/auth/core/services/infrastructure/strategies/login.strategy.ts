import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { BaseAuthStrategy } from './base-auth.strategy';
import { AuthResult } from '../../../interfaces/auth-strategy.interface';

/**
 * 🔑 Login Authentication Strategy
 * Handles user login with email/password credentials
 */
@Injectable({ providedIn: 'root' })
export class LoginStrategy extends BaseAuthStrategy {
  constructor(http: HttpClient) {
    super(http);
  }

  getStrategyName(): string {
    return 'login';
  }

  canHandle(data: any): boolean {
    return data &&
           typeof data === 'object' &&
           (data.email || data.username) &&
           data.password &&
           typeof data.password === 'string';
  }

  performAuthentication(data: any): Observable<AuthResult> {
    const loginData = {
      email: data.email || data.username,
      password: data.password,
      rememberMe: data.rememberMe || false
    };

    return this.http.post(`${this.API_BASE_URL}/login`, loginData).pipe(
      map((response: any) => {
        if (response.requiresTwoFA) {
          return this.createSuccessResult({
            requiresTwoFA: true,
            sessionId: response.sessionId,
            user: response.user
          });
        }

        return this.createSuccessResult({
          user: response.user,
          token: response.token,
          refreshToken: response.refreshToken
        });
      }),
      catchError(error => {
        // Handle specific login errors
        if (error.status === 401) {
          return of(this.createErrorResult('Invalid email or password'));
        }
        if (error.status === 423) {
          return of(this.createErrorResult('Account is locked. Please try again later'));
        }
        return this.handleError(error, Date.now());
      })
    );
  }
}