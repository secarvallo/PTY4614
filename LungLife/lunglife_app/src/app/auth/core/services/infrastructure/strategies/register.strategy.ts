import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { BaseAuthStrategy } from './base-auth.strategy';
import { AuthResult } from '../../../interfaces/auth-strategy.interface';

/**
 * 📝 Register Authentication Strategy
 * Handles user registration with validation
 */
@Injectable({ providedIn: 'root' })
export class RegisterStrategy extends BaseAuthStrategy {
  constructor(http: HttpClient) {
    super(http);
  }

  getStrategyName(): string {
    return 'register';
  }

  canHandle(data: any): boolean {
    return data &&
           typeof data === 'object' &&
           data.email &&
           data.password &&
           data.firstName &&
           data.lastName &&
           data.acceptTerms === true;
  }

  performAuthentication(data: any): Observable<AuthResult> {
    const registerData = {
      email: data.email,
      password: data.password,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      birthDate: data.birthDate,
      acceptTerms: data.acceptTerms
    };

    return this.http.post(`${this.API_BASE_URL}/register`, registerData).pipe(
      map((response: any) => this.createSuccessResult({
        user: response.user,
        token: response.token,
        refreshToken: response.refreshToken,
        metadata: {
          ...response.metadata,
          emailVerificationRequired: response.emailVerificationRequired
        }
      }))
    );
  }
}