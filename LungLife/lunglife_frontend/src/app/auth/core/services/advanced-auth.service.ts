import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError, EMPTY } from 'rxjs';
import { map, tap, catchError, finalize } from 'rxjs/operators';
import { Router } from '@angular/router';
import {
  AuthState,
  User,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  TwoFactorSetupRequest,
  TwoFactorSetupResponse,
  TwoFactorVerifyRequest,
  TwoFactorVerifyResponse,
  TwoFactorDisableRequest,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
  UserSession,
  SessionsResponse,
  RevokeSessionRequest,
  RefreshTokenRequest,
  RefreshTokenResponse,
  JWTPayload,
  UserDevice,
  ActiveSessionDetailed,
  ActiveUserComplete
} from '../interfaces/auth-advanced.interface';
import { CoreAuthStore } from './core-auth.store';
import { normalizeUser } from '../mappers/auth-user.mapper';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AdvancedAuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private coreStore = inject(CoreAuthStore);

  // Delegar streams al CoreAuthStore para compatibilidad con componentes existentes
  public readonly isAuthenticated$ = this.coreStore.isAuthenticated$;
  public readonly user$ = this.coreStore.user$;
  public readonly loading$ = this.coreStore.loading$;
  public readonly error$ = this.coreStore.error$;
  public readonly requiresTwoFactor$ = this.coreStore.requiresTwoFA$;

  // Configuración adaptada a lunglife_db02.sql
  private readonly API_URL = environment.apiUrl;
  private readonly TOKEN_KEY = 'lunglife_access_token';
  private readonly REFRESH_TOKEN_KEY = 'lunglife_refresh_token';
  private readonly SESSION_KEY = 'lunglife_session_id';
  private readonly DEVICE_ID_KEY = 'lunglife_device_id';

  constructor() {
    this.initializeDeviceId();
    // initializeSession previo ahora se gestiona via bootstrap del CoreAuthStore; conservamos como fallback liviano
    this.initializeSession();
  }

  // ========== MÉTODOS DE AUTENTICACIÓN BÁSICA ==========

  /**
   * Login con credenciales adaptado a la nueva estructura BD
   */
  login(request: LoginRequest): Observable<LoginResponse> {
  this.coreStore.setLoading(true);
  this.coreStore.clearError();

    const loginData = {
      ...request,
      deviceId: this.getDeviceId(),
      deviceName: this.getDeviceName(),
      deviceFingerprint: this.generateDeviceFingerprint(),
      screenResolution: this.getScreenResolution(),
      userAgent: navigator.userAgent
    };

    return this.http.post<LoginResponse>(`${this.API_URL}/auth/login`, loginData).pipe(
      tap(response => this.handleLoginResponse(response)),
      catchError(error => this.handleAuthError(error)),
      finalize(() => this.coreStore.setLoading(false))
    );
  }

  /**
   * Registro de nuevo usuario adaptado a user_profiles
   */
  register(request: RegisterRequest): Observable<RegisterResponse> {
  this.coreStore.setLoading(true);
  this.coreStore.clearError();

    const registerData = {
      ...request,
      deviceId: this.getDeviceId(),
      deviceName: this.getDeviceName(),
      deviceFingerprint: this.generateDeviceFingerprint(),
      screenResolution: this.getScreenResolution(),
      userAgent: navigator.userAgent
    };

    return this.http.post<RegisterResponse>(`${this.API_URL}/auth/register`, registerData).pipe(
      tap(response => this.handleRegisterResponse(response)),
      catchError(error => this.handleAuthError(error)),
      finalize(() => this.coreStore.setLoading(false))
    );
  }

  /**
   * Logout del usuario actual con limpieza de sesión en BD
   */
  logout(): Observable<void> {
    const sessionId = this.getSessionId();

    return this.http.post<void>(`${this.API_URL}/auth/logout`, {
      sessionId: sessionId || null,
      deviceId: this.getDeviceId()
    }).pipe(
  tap(() => this.handleLogout()),
      catchError(() => {
        this.handleLogout();
        return EMPTY;
      })
    );
  }

  // ========== MÉTODOS DE 2FA ADAPTADOS ==========

  /**
   * Configurar 2FA con soporte para user_security_settings
   */
  setup2FA(request: TwoFactorSetupRequest): Observable<TwoFactorSetupResponse> {
  this.coreStore.setLoading(true);

    return this.http.post<TwoFactorSetupResponse>(`${this.API_URL}/auth/2fa/setup`, {
      ...request,
      deviceId: this.getDeviceId()
    }).pipe(
      catchError(error => this.handleAuthError(error)),
      finalize(() => this.coreStore.setLoading(false))
    );
  }

  /**
   * Verificar código 2FA con registro en two_fa_codes
   */
  verify2FA(request: TwoFactorVerifyRequest): Observable<TwoFactorVerifyResponse> {
  this.coreStore.setLoading(true);

    const verifyData = { ...request, deviceId: this.getDeviceId() };

    return this.http.post<TwoFactorVerifyResponse>(`${this.API_URL}/auth/2fa/verify`, verifyData).pipe(
      tap(response => this.handle2FAVerifyResponse(response)),
      catchError(error => this.handleAuthError(error)),
      finalize(() => this.coreStore.setLoading(false))
    );
  }

  // ========== MÉTODOS DE GESTIÓN DE SESIONES ADAPTADOS ==========

  /**
   * Obtener sesiones activas usando active_sessions_detailed view
   */
  getUserSessions(): Observable<UserSession[]> {
    return this.http.get<SessionsResponse>(`${this.API_URL}/auth/sessions`).pipe(
      map(response => {
        if (response.sessions) {
          return response.sessions.map(session => this.normalizeSession(session));
        }
        return [];
      }),
      catchError(error => this.handleAuthError(error))
    );
  }

  /**
   * Revocar sesión específica o todas las sesiones
   */
  revokeSession(request: RevokeSessionRequest): Observable<void> {
    return this.http.post<void>(`${this.API_URL}/auth/sessions/revoke`, request).pipe(
      tap(() => {
        if (request.revokeAll || request.sessionId === this.getSessionId()) {
          this.handleLogout();
        }
      }),
      catchError(error => this.handleAuthError(error))
    );
  }

  // ========== MÉTODOS DE JWT Y TOKENS ADAPTADOS ==========

  /**
   * Renovar token usando user_tokens table
   */
  refreshToken(): Observable<string> {
  const refreshToken = this.coreStore.getRefreshTokenSync();
    const deviceId = this.getDeviceId();

    if (!refreshToken || !deviceId) {
      return throwError(() => new Error('No refresh token or device ID available'));
    }

    const request: RefreshTokenRequest = {
      refreshToken,
      deviceId
    };

    return this.http.post<RefreshTokenResponse>(`${this.API_URL}/auth/refresh`, request).pipe(
      map(response => {
        if (response.success && response.accessToken) {
          this.coreStore.storeTokens(response.accessToken, response.refreshToken || '');
          this.coreStore.scheduleRefreshFromToken();
          return response.accessToken;
        } else {
          throw new Error(response.error || 'Token refresh failed');
        }
      }),
      catchError(error => {
        this.handleLogout();
        return throwError(() => error);
      })
    );
  }

  // ========== MÉTODOS DE INICIALIZACIÓN ADAPTADOS ==========

  /**
   * Inicializar sesión usando active_users_complete view
   */
  initializeSession(): void {
    const token = this.coreStore.getAccessTokenSync();
    if (!token) return; // Core bootstrap se encarga del reset
    if (!this.isTokenExpired(token)) {
      this.loadUserProfile().subscribe({
        next: () => this.coreStore.scheduleRefreshFromToken(),
        error: () => this.handleLogout()
      });
    }
  }

  /**
   * Cargar perfil usando datos normalizados
   */
  loadUserProfile(): Observable<User> {
  return this.http.get<{ success: boolean; user: any; error?: string }>(`${this.API_URL}/auth/me`).pipe(
      map(response => {
        if (response.success && response.user) {
          const normalizedUser = normalizeUser(response.user) as any as User; // cast a advanced interface
          this.coreStore.applyAuthResult({ success: true, user: normalizedUser as any, token: this.coreStore.getAccessTokenSync() || undefined });
          return normalizedUser;
        }
        throw new Error(response.error || 'Failed to load user profile');
      }),
      catchError(error => {
        this.handleLogout();
        return throwError(() => error);
      })
    );
  }

  // ========== MÉTODOS AUXILIARES ADAPTADOS ==========

  // Normalización de sesiones se mantiene local (user normalization delegada al mapper)

  private normalizeSession(rawSession: any): UserSession {
    return {
      id: rawSession.id,
      userId: rawSession.user_id,
      device_id: rawSession.device_id,
      session_token: rawSession.session_token,
      ip_address: rawSession.ip_address,
      city_id: rawSession.city_id,
      is_current: rawSession.is_current,
      created_at: new Date(rawSession.created_at),
      last_activity: new Date(rawSession.last_activity),
      expires_at: new Date(rawSession.expires_at),

      // Propiedades computadas
      deviceName: rawSession.device_name,
      deviceType: this.mapDeviceType(rawSession.device_type),
      ipAddress: rawSession.ip_address,
      userAgent: rawSession.user_agent,
      location: rawSession.city_name ? {
        city: rawSession.city_name,
        country: rawSession.country_name
      } : undefined,
      isActive: new Date(rawSession.expires_at) > new Date(),
      isCurrent: rawSession.is_current,
      lastActivity: new Date(rawSession.last_activity),
      expiresAt: new Date(rawSession.expires_at)
    };
  }

  private mapDeviceType(deviceType: string): 'web' | 'mobile' | 'tablet' | 'desktop' {
    switch (deviceType?.toLowerCase()) {
      case 'mobile': return 'mobile';
      case 'tablet': return 'tablet';
      case 'desktop':
      case 'laptop': return 'desktop';
      default: return 'web';
    }
  }

  // ========== MÉTODOS AUXILIARES PRIVADOS COMPLETADOS ==========

  private handleLoginResponse(response: LoginResponse): void {
    if (!response.success) {
      this.coreStore.setError(response.error || 'Login failed');
      return;
    }
    if (response.requiresTwoFactor) {
      this.coreStore.applyAuthResult({ success: true, requiresTwoFA: true, twoFAPending: true });
      return;
    }
    if (response.accessToken) {
      // Aplicar resultado auth consolidado
      const normalized = response.user ? normalizeUser(response.user) : null;
      this.coreStore.applyAuthResult({
        success: true,
        token: response.accessToken,
        refreshToken: response.refreshToken,
        user: normalized,
        twoFAEnabled: normalized ? ((normalized as any).twoFAEnabled || (normalized as any).two_fa_enabled) : false,
        sessionId: response.sessionId || null
      } as any);
      if (!response.user) {
        this.loadUserProfile().subscribe();
      }
    }
  }

  private handleRegisterResponse(response: RegisterResponse): void {
    if (!response.success) {
      this.coreStore.setError(response.error || 'Registration failed');
      return;
    }
    if (response.accessToken && response.user) {
      this.coreStore.applyAuthResult({
        success: true,
        token: response.accessToken,
        refreshToken: response.refreshToken,
        user: normalizeUser(response.user)
      });
    }
  }

  private handle2FAVerifyResponse(response: TwoFactorVerifyResponse): void {
    if (!response.success || !response.accessToken || !response.user) {
      this.coreStore.setError(response.error || '2FA verification failed');
      return;
    }
    const normalized = normalizeUser(response.user);
    this.coreStore.applyAuthResult({
      success: true,
      token: response.accessToken,
      refreshToken: response.refreshToken,
      user: normalized,
      twoFAEnabled: (normalized as any).twoFAEnabled || (normalized as any).two_fa_enabled,
      sessionId: response.sessionId || null
    } as any);
  }

  private handleLogout(): void {
    this.coreStore.resetAll();
    this.router.navigate(['/auth/login']);
  }

  private handleAuthError(error: any): Observable<never> {
    const errorMessage = error?.error?.message || error?.message || 'Authentication error occurred';
    this.coreStore.setError(errorMessage);
    return throwError(() => error);
  }

  // ========== MÉTODOS DE GESTIÓN DE TOKENS ==========

  private getSessionId(): string | null { return this.coreStore.getSessionIdSync(); }

  // ========== MÉTODOS DE GESTIÓN DEL DISPOSITIVO ==========

  private initializeDeviceId(): void {
    if (!this.getDeviceId()) {
      const deviceId = this.generateDeviceId();
      localStorage.setItem(this.DEVICE_ID_KEY, deviceId);
    }
  }

  private getDeviceId(): string {
    return localStorage.getItem(this.DEVICE_ID_KEY) || this.generateDeviceId();
  }

  private generateDeviceId(): string {
    return 'device_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  private getDeviceName(): string {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Mobile')) return 'Mobile Device';
    if (userAgent.includes('Tablet')) return 'Tablet Device';
    return 'Desktop Device';
  }

  private generateDeviceFingerprint(): string {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('Device fingerprint', 2, 2);
    }

    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
      canvas.toDataURL()
    ].join('|');

    return btoa(fingerprint).substring(0, 32);
  }

  private getScreenResolution(): string {
    return `${screen.width}x${screen.height}`;
  }

  // ========== MÉTODOS DE VALIDACIÓN DE TOKENS ==========

  private isTokenExpired(token: string): boolean {
    try {
      const payload = this.decodeJWT(token);
      const currentTime = Math.floor(Date.now() / 1000);
      return payload.exp < currentTime;
    } catch {
      return true;
    }
  }

  private decodeJWT(token: string): JWTPayload {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format');
    }

    const payload = parts[1];
    const decoded = atob(payload);
    return JSON.parse(decoded);
  }

  private getTokenExpirationTime(token: string): number | null {
    try {
      const payload = this.decodeJWT(token);
      return payload.exp * 1000; // Convert to milliseconds
    } catch {
      return null;
    }
  }

  // ========== MÉTODOS DE PROGRAMACIÓN DE REFRESH ==========

  // Refresh scheduling ahora en CoreAuthStore (scheduleRefreshFromToken / stopRefreshScheduler)

  // ========== MÉTODOS DE GESTIÓN DE ESTADO ==========

  // Estado ahora gestionado sólo por CoreAuthStore

  // ========== MÉTODOS PÚBLICOS DE UTILIDAD ==========

  /**
   * Obtener usuario actual
   */
  getCurrentUser(): User | null {
  return this.coreStore.getCurrentUserSync() as unknown as User | null; // cast para compatibilidad temporal
  }

  /**
   * Verificar si el usuario está autenticado
   */
  isAuthenticated(): boolean {
  return this.coreStore.isAuthenticatedSync();
  }

  /**
   * Verificar si requiere 2FA
   */
  requiresTwoFactor(): boolean {
  return this.coreStore.requiresTwoFASync();
  }

  /**
   * Obtener estado completo de autenticación
   */
  getAuthState(): AuthState {
    return {
      isAuthenticated: this.coreStore.isAuthenticatedSync(),
      user: this.coreStore.getCurrentUserSync(),
      loading: false, // loading selectores ya expuestos arriba
      error: null,
      requiresTwoFactor: this.coreStore.requiresTwoFASync(),
      twoFactorToken: null,
      sessionId: this.coreStore.getSessionIdSync()
    } as AuthState;
  }

  /**
   * Limpiar estado de error
   */
  clearAuthError(): void {
    this.coreStore.clearError();
  }
}
