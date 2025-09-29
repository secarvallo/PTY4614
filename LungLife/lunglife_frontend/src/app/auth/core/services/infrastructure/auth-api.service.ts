import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';

// ==== Interfaces base de requests/responses tipadas ====
export interface LoginRequest { email: string; password: string; rememberMe?: boolean; }
export interface LoginResponse { success: boolean; token?: string; refreshToken?: string; requiresTwoFA?: boolean; user?: any; sessionId?: string; error?: string; }

export interface RegisterRequest {
  email: string;
  password: string;
  username?: string; // alias opcional si backend lo requiere
  firstName?: string;
  lastName?: string;
  phone?: string;
  birthDate?: string; // ISO date string
  acceptTerms?: boolean;
  acceptPrivacy?: boolean;
}
export interface RegisterResponse { success: boolean; token?: string; refreshToken?: string; requiresTwoFA?: boolean; user?: any; sessionId?: string; error?: string; }

export interface TwoFASetupRequest { method: 'totp' | 'sms' | 'email'; }
export interface TwoFAVerifyRequest { code: string; isBackupCode?: boolean; sessionId?: string; }
export interface TwoFAResponse { success: boolean; token?: string; refreshToken?: string; user?: any; twoFAEnabled?: boolean; error?: string; sessionId?: string; requiresTwoFA?: boolean; }

export interface RefreshRequest { refreshToken: string; deviceId?: string; }
export interface RefreshResponse { success: boolean; accessToken?: string; refreshToken?: string; error?: string; }

export interface MeResponse { success?: boolean; user?: any; data?: { user?: any }; }

export interface SessionInfo { id: number; device_id?: number; is_current?: boolean; created_at?: string; last_activity?: string; expires_at?: string; }
export interface SessionsResponse { sessions: SessionInfo[]; }
export interface RevokeSessionRequest { sessionId?: number; revokeAll?: boolean; }

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private http = inject(HttpClient);
  private base = environment.apiUrl + '/auth';

  login(body: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.base}/login`, body);
  }

  register(body: RegisterRequest): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(`${this.base}/register`, body);
  }

  setup2FA(body: TwoFASetupRequest): Observable<TwoFAResponse> {
    return this.http.post<TwoFAResponse>(`${this.base}/2fa/setup`, body);
  }

  verify2FA(body: TwoFAVerifyRequest): Observable<TwoFAResponse> {
    return this.http.post<TwoFAResponse>(`${this.base}/2fa/verify`, body);
  }

  refresh(body: RefreshRequest): Observable<RefreshResponse> {
    return this.http.post<RefreshResponse>(`${this.base}/refresh`, body);
  }

  me(): Observable<MeResponse> {
    return this.http.get<MeResponse>(`${this.base}/me`);
  }

  sessions(): Observable<SessionsResponse> {
    return this.http.get<SessionsResponse>(`${this.base}/sessions`);
  }

  revokeSession(body: RevokeSessionRequest) {
    return this.http.post(`${this.base}/sessions/revoke`, body);
  }
}
