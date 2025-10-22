import { Injectable, inject } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { User } from '../../interfaces/auth.unified';
import { AuthStrategyContext } from './auth-strategy-context.service';
import { AuthResult } from '../../interfaces/auth-strategy.interface';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { LoggerService } from '../../../../core/services/logger.service';
import { UserSession, RevokeSessionRequest, SessionsResponse } from '../../interfaces/auth-advanced.interface';
import { CoreAuthStore } from '../core-auth.store';
import { normalizeUser } from '../../mappers/auth-user.mapper';

/**
 * Simplified Auth Facade Service (Flattened State)
 */
@Injectable({ providedIn: 'root' })
export class AuthFacadeService {
  // Lazy inject para evitar circular dependencies
  private store = inject(CoreAuthStore);
  private strategyContext = inject(AuthStrategyContext);
  private http = inject(HttpClient);
  private logger = inject(LoggerService).createChild('AuthFacade');

  private registerFlow = false;

  // Lazy load observables
  get isAuthenticated$() { return this.store.isAuthenticated$; }
  get loading$() { return this.store.loading$; }
  get error$() { return this.store.error$; }
  get requiresTwoFA$() { return this.store.requiresTwoFA$; }
  get user$() { return this.store.user$; }

  // Sync getters (delegados al store)
  isAuthenticatedSync(): boolean { return this.store.isAuthenticatedSync(); }
  requiresTwoFASync(): boolean { return this.store.requiresTwoFASync(); }
  getCurrentUser(): User | null { return this.store.getCurrentUserSync(); }

  getAuthState() {
    return {
      isAuthenticated$: this.isAuthenticated$,
      loading$: this.loading$,
      error$: this.error$,
      requiresTwoFA$: this.requiresTwoFA$,
      user$: this.user$
    };
  }

  // Método legacy usado por AdvancedAuthService mientras se completa migración
  syncFromAdvanced(user: User | null, options: { isAuthenticated?: boolean; requiresTwoFA?: boolean } = {}): void {
    // Delegar al store mediante applyAuthResult simulando un resultado parcial
    this.store.applyAuthResult({
      success: !!options.isAuthenticated,
      user: user ? normalizeUser(user) : null,
      requiresTwoFA: options.requiresTwoFA,
      registerFlowSkipAuth: options.isAuthenticated === false && !user
    });
    if (options.isAuthenticated === false && !user) {
      // asegurar reset de error si venía de logout
      this.store.setError(null);
    }
  }

  login(credentials: any): Observable<AuthResult> {
    this.store.setLoading(true); this.store.clearError();
    this.log('login() called', { email: credentials?.email, rememberMe: credentials?.rememberMe });
    return this.strategyContext.executeStrategy('login', credentials).pipe(
      tap(r => this.handleStrategyResult(r, 'login')),
      catchError(e => { this.handleAuthError(e); throw e; })
    );
  }

  register(data: any, options: { autoLogin?: boolean } = { autoLogin: true }): Observable<AuthResult> {
    this.store.setLoading(true); this.store.clearError();
    this.registerFlow = options.autoLogin === false;
    this.log('register() called', { email: data?.email, autoLogin: options.autoLogin });
    return this.strategyContext.executeStrategy('register', data).pipe(
      tap(r => this.handleStrategyResult(r, 'register')),
      catchError(e => { this.registerFlow = false; this.handleAuthError(e); throw e; })
    );
  }

  setup2FA(opts: { method: 'totp' | 'sms' | 'email' } = { method: 'totp' }): Observable<AuthResult> {
    this.store.setLoading(true); this.store.clearError();
    return this.strategyContext.executeStrategy('two-factor', { setup: true, method: opts.method }).pipe(
      tap(r => { this.store.setLoading(false); if (!r.success) this.store.setError(r.error || '2FA setup failed'); }),
      catchError(e => { this.handleAuthError(e); throw e; })
    );
  }

  verify2FA(data: { code: string; isBackupCode?: boolean; sessionId?: string }): Observable<AuthResult> {
    this.store.setLoading(true); this.store.clearError();
    return this.strategyContext.executeStrategy('two-factor', data).pipe(
      tap(r => this.handleStrategyResult(r, 'verify2FA')),
      catchError(e => { this.handleAuthError(e); throw e; })
    );
  }

  forgotPassword(data: { email: string }): Observable<AuthResult> {
    this.store.setLoading(true); this.store.clearError();
    return this.strategyContext.executeStrategy('forgot-password', data).pipe(
      tap(r => { this.store.setLoading(false); if (!r.success) this.store.setError(r.error || 'Password reset failed'); }),
      catchError(e => { this.handleAuthError(e); throw e; })
    );
  }

  disable2FA(password?: string): Observable<AuthResult> {
    this.store.setLoading(true); this.store.clearError();
    return this.strategyContext.executeStrategy('two-factor', { disable: true, password }).pipe(
      tap(r => {
        this.store.setLoading(false);
        if (r.success) {
          const u = this.getCurrentUser();
          if (u) { u.two_fa_enabled = false; (u as any).twoFAEnabled = false; (u as any).twoFAEnabled = false; }
          // Re-emite usuario mutado
          this.store.applyAuthResult({ success: true, user: u, token: this.store.getAccessTokenSync() || undefined });
        } else this.store.setError(r.error || 'Failed to disable 2FA');
      }),
      catchError(e => { this.handleAuthError(e); throw e; })
    );
  }

  loginWithGoogle(data: any): Observable<AuthResult> {
    this.store.setLoading(true); this.store.clearError();
    return this.strategyContext.executeStrategy('google-auth', data).pipe(
      tap(r => this.handleStrategyResult(r, 'google-login')),
      catchError(e => { this.handleAuthError(e); throw e; })
    );
  }

  logout(): void {
    this.store.resetAll();
  }

  getGoogleAuthUrl(): string { return this.strategyContext.getGoogleAuthUrl(); }

  // ========= Session Management (simplified) =========
  getUserSessions() {
    return this.http.get<SessionsResponse>(`${environment.apiUrl}/auth/sessions`).pipe(
      map(resp => resp.sessions || []),
      catchError(err => { this.log('sessions error', err); return of([]); })
    );
  }

  revokeSession(request: RevokeSessionRequest) {
    return this.http.post(`${environment.apiUrl}/auth/sessions/revoke`, request).pipe(
      tap(() => {
        if (request.revokeAll) {
          this.logout();
        }
      }),
      catchError(err => { this.log('revoke session error', err); return throwError(() => err); })
    );
  }

  private handleStrategyResult(result: AuthResult, ctx: string) {
    // Traduce AuthResult al formato de CoreAuthStore.applyAuthResult
    const normalizedUser = result.user ? normalizeUser(result.user as User) : null;
    const payload = {
      success: result.success,
      user: normalizedUser,
      token: result.token,
      refreshToken: (result as any).refreshToken,
      // Compat: requiere 2FA -> pending
      requiresTwoFA: (result as any).requiresTwoFA,
      twoFAPending: (result as any).requiresTwoFA === true,
      twoFAEnabled: normalizedUser ? ((normalizedUser as any).twoFAEnabled === true || (normalizedUser as any).two_fa_enabled === true) : false,
      sessionId: (result as any).sessionId,
      error: result.error,
      registerFlowSkipAuth: ctx === 'register' && this.registerFlow
    } as any;
    this.store.applyAuthResult(payload);
    if (ctx === 'register') this.registerFlow = false;
  }

  private handleAuthError(error: any) { this.store.setLoading(false); this.store.setError(error?.error || error?.message || 'Unexpected error'); this.log('authError', error); }
  private getStoredAccessToken(): string | null { return this.store.getAccessTokenSync(); }

  private log(msg: string, data?: any) { this.logger.debug(msg, data); }
}
