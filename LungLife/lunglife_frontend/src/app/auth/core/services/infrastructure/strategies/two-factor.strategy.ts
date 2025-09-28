import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { BaseAuthStrategy } from './base-auth.strategy';
import { AuthResult } from '../../../interfaces/auth-strategy.interface';

/**
 * 🔐 Two-Factor Authentication Strategy
 * Handles 2FA verification and setup
 */
@Injectable({ providedIn: 'root' })
export class TwoFactorStrategy extends BaseAuthStrategy {
  constructor(http: HttpClient) {
    super(http);
  }

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
      return this.setup2FA();
    } else {
      return this.verify2FA(data);
    }
  }

  private setup2FA(): Observable<AuthResult> {
    return this.http.post(`${this.API_BASE_URL}/2fa/setup`, {}).pipe(
      map((response: any) => this.createSuccessResult({
        metadata: {
          qrCode: response.qrCode,
          secret: response.secret,
          backupCodes: response.backupCodes
        } as any
      }))
    );
  }

  private verify2FA(data: any): Observable<AuthResult> {
    const verifyData = {
      code: data.code,
      sessionId: data.sessionId,
      rememberDevice: data.rememberDevice || false
    };

    return this.http.post(`${this.API_BASE_URL}/2fa/verify`, verifyData).pipe(
      map((response: any) => this.createSuccessResult({
        user: response.user,
        token: response.token,
        refreshToken: response.refreshToken
      }))
    );
  }
}