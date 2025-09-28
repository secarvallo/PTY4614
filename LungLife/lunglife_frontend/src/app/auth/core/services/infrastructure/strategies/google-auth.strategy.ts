import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { BaseAuthStrategy } from './base-auth.strategy';
import { AuthResult } from '../../../interfaces/auth-strategy.interface';

/**
 * 🌐 Google Authentication Strategy
 * Handles Google OAuth authentication flow
 */
@Injectable({ providedIn: 'root' })
export class GoogleAuthStrategy extends BaseAuthStrategy {
  constructor(http: HttpClient) {
    super(http);
  }

  getStrategyName(): string {
    return 'google-auth';
  }

  canHandle(data: any): boolean {
    return data &&
           typeof data === 'object' &&
           ((data.authorizationCode && typeof data.authorizationCode === 'string') ||
            (data.idToken && typeof data.idToken === 'string') ||
            (data.accessToken && typeof data.accessToken === 'string'));
  }

  performAuthentication(data: any): Observable<AuthResult> {
    let authData: any;

    if (data.authorizationCode) {
      authData = {
        code: data.authorizationCode,
        redirectUri: data.redirectUri || `${window.location.origin}/auth/google-callback`
      };
      return this.authenticateWithCode(authData);
    } else if (data.idToken) {
      authData = { idToken: data.idToken };
      return this.authenticateWithIdToken(authData);
    } else if (data.accessToken) {
      authData = { accessToken: data.accessToken };
      return this.authenticateWithAccessToken(authData);
    }

    return of(this.createErrorResult('Invalid Google authentication data'));
  }

  private authenticateWithCode(data: any): Observable<AuthResult> {
    return this.http.post(`${this.API_BASE_URL}/google/callback`, data).pipe(
      map((response: any) => this.createSuccessResult({
        user: response.user,
        token: response.token,
        refreshToken: response.refreshToken
      }))
    );
  }

  private authenticateWithIdToken(data: any): Observable<AuthResult> {
    return this.http.post(`${this.API_BASE_URL}/google/id-token`, data).pipe(
      map((response: any) => this.createSuccessResult({
        user: response.user,
        token: response.token,
        refreshToken: response.refreshToken
      }))
    );
  }

  private authenticateWithAccessToken(data: any): Observable<AuthResult> {
    return this.http.post(`${this.API_BASE_URL}/google/access-token`, data).pipe(
      map((response: any) => this.createSuccessResult({
        user: response.user,
        token: response.token,
        refreshToken: response.refreshToken
      }))
    );
  }

  /**
   * Get Google OAuth URL for initiating authentication
   */
  getGoogleAuthUrl(): string {
    const baseUrl = `${this.API_BASE_URL}/google/auth-url`;
    const params = new URLSearchParams({
      redirectUri: `${window.location.origin}/auth/google-callback`,
      scope: 'email profile'
    });
    return `${baseUrl}?${params.toString()}`;
  }
}