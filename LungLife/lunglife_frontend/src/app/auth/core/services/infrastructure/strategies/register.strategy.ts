import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { BaseAuthStrategy } from './base-auth.strategy';
import { AuthResult } from '../../../interfaces/auth-strategy.interface';
import { AuthApiService, RegisterRequest, RegisterResponse } from '../../infrastructure/auth-api.service';

/**
 * 📝 Register Authentication Strategy
 * Handles user registration with validation
 */
@Injectable({ providedIn: 'root' })
export class RegisterStrategy extends BaseAuthStrategy {
  constructor(private api: AuthApiService) { super(); }

  getStrategyName(): string {
    return 'register';
  }

  canHandle(data: any): boolean {
    // Accept both English (firstName/lastName/phone) and Spanish (nombre/apellido/telefono) forms
    // Allow last name optional in early registration flows (apellido may be undefined yet)
    if (!data || typeof data !== 'object') return false;
    const hasEmail = !!data.email;
    const hasPassword = !!data.password;
    const hasFirstName = !!(data.firstName || data.nombre);
    const hasLastName = !!(data.lastName || data.apellido); // may be loosened later if needed
    // If Spanish form is used (nombre/apellido) and acceptTerms missing, allow for legacy backend that validates separately
    const usingSpanish = !!data.nombre || !!data.apellido;
    const acceptsTerms = data.acceptTerms === true || usingSpanish; // relax for legacy localized form
    return hasEmail && hasPassword && hasFirstName && hasLastName && acceptsTerms;
  }

  performAuthentication(data: any): Observable<AuthResult> {
    const registerData: RegisterRequest = {
      email: data.email,
      password: data.password,
      firstName: data.firstName || data.nombre,
      lastName: data.lastName || data.apellido,
      phone: data.phone || data.telefono,
      birthDate: data.birthDate || data.fecha_nacimiento,
      acceptTerms: data.acceptTerms,
      acceptPrivacy: data.acceptPrivacy
    };

    return this.api.register(registerData).pipe(
      map((response: RegisterResponse) => this.createSuccessResult({
        user: response.user,
        token: response.token,
        refreshToken: response.refreshToken,
        metadata: {
          ...(response as any).metadata,
          emailVerificationRequired: (response as any).emailVerificationRequired
        }
      }))
    );
  }
}