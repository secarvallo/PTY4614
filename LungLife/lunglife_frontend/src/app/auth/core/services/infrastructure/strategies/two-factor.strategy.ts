import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { BaseAuthStrategy } from './base-auth.strategy';
import { AuthResult } from '../../../interfaces/auth-strategy.interface';
import { AuthApiService, TwoFASetupRequest, TwoFAVerifyRequest, TwoFAResponse } from '../../infrastructure/auth-api.service';

/**
 * 🔐 Two-Factor Authentication Strategy
 * Handles 2FA verification and setup
 */
@Injectable({ providedIn: 'root' })
export class TwoFactorStrategy extends BaseAuthStrategy {
  constructor(private api: AuthApiService) { super(); }

  getStrategyName(): string {
    return 'two-factor';
  }

  canHandle(data: any): boolean {
    return data &&
           typeof data === 'object' &&
           ((data.code && typeof data.code === 'string') ||
            (data.setup && data.setup === true));
  }

  performAuthentication(data: any): Observable<AuthResult> {
    if (data.setup) {
      return this.setup2FA(data);
    }
    return this.verify2FA(data);
  }

  private setup2FA(data: any): Observable<AuthResult> {
    const body: TwoFASetupRequest = { method: data.method || 'totp' }; // allow caller override
    return this.api.setup2FA(body).pipe(
      map((response: TwoFAResponse) => this.createSuccessResult({
        metadata: {
          qrCode: (response as any).qrCode,
          secret: (response as any).secret,
          backupCodes: (response as any).backupCodes
        } as any
      }))
    );
  }

  private verify2FA(data: any): Observable<AuthResult> {
    const verifyData: TwoFAVerifyRequest = {
      code: data.code,
      sessionId: data.sessionId,
      isBackupCode: data.isBackupCode
    };

    return this.api.verify2FA(verifyData).pipe(
      map((response: TwoFAResponse) => this.createSuccessResult({
        user: response.user,
        token: response.token,
        refreshToken: response.refreshToken
      }))
    );
  }
}