import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { BaseAuthStrategy } from './base-auth.strategy';
import { AuthResult } from '../../../interfaces/auth-strategy.interface';

/**
 * 🔒 Forgot Password Strategy
 * Handles password reset requests
 */
@Injectable({ providedIn: 'root' })
export class ForgotPasswordStrategy extends BaseAuthStrategy {
  constructor(http: HttpClient) {
    super(http);
  }

  getStrategyName(): string {
    return 'forgot-password';
  }

  canHandle(data: any): boolean {
    return data &&
           typeof data === 'object' &&
           data.email &&
           typeof data.email === 'string' &&
           data.email.includes('@');
  }

  performAuthentication(data: any): Observable<AuthResult> {
    const resetData = {
      email: data.email,
      resetUrl: data.resetUrl || `${window.location.origin}/auth/reset-password`
    };

    return this.http.post(`${this.API_BASE_URL}/forgot-password`, resetData).pipe(
      map((response: any) => this.createSuccessResult({
        user: { email: data.email }, // Temporary user object for success state
        metadata: {
          emailSent: response.emailSent,
          resetToken: response.resetToken,
          expiresAt: response.expiresAt
        } as any
      }))
    );
  }
}