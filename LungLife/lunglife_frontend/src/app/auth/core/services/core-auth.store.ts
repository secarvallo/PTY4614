import { Injectable, inject, InjectionToken } from '@angular/core';
import { BehaviorSubject, Observable, of, Subscription, timer, throwError } from 'rxjs';
import { map, catchError, switchMap, retryWhen, delay, scan, finalize } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { User } from '../interfaces/auth.unified';
import { HttpClient } from '@angular/common/http';
import { LoggerService } from '../../../core/services/logger.service';

// ================== REFRESH CONFIG ==================
export interface AuthRefreshConfig {
  leadTimeMs: number;           // cuánto antes del exp intentar refresh
  jitterMs: number;             // rango de jitter agregado
  maxProactiveRetries: number;  // reintentos proactivos
  retryDelayBaseMs: number;     // base para delay entre reintentos
}

export const DEFAULT_AUTH_REFRESH_CONFIG: AuthRefreshConfig = {
  leadTimeMs: 5 * 60_000,  // 5 minutos
  jitterMs: 15_000,
  maxProactiveRetries: 1,
  retryDelayBaseMs: 500
};

export const AUTH_REFRESH_CONFIG = new InjectionToken<AuthRefreshConfig>('AUTH_REFRESH_CONFIG');

/**
 * CoreAuthStore
 * Capa central y única de estado y tokens para autenticación.
 * Responsabilidades:
 *  - Estado reactivo (auth, user, loading, error, 2FA, sessionId)
 *  - Gestión de tokens (set/get/clear) + refresh scheduling
 *  - bootstrapSession() para rehidratar sesión inicial
 *  - applyAuthResult() para consolidar resultados de estrategias
 *  - API síncrona para guards (isAuthenticatedSync, requiresTwoFASync, userSync)
 *  - No navega, no conoce Router (navigation se delega a façade / guards)
 */
@Injectable({ providedIn: 'root' })
export class CoreAuthStore {
  private http = inject(HttpClient);
  private logger = inject(LoggerService).createChild('CoreAuthStore');
  private cfg = inject(AUTH_REFRESH_CONFIG, { optional: true }) || DEFAULT_AUTH_REFRESH_CONFIG;

  private readonly SESSION_KEY = 'lunglife_session_id';

  // ====== STATE ======
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private errorSubject = new BehaviorSubject<string | null>(null);
  // twoFAState: pending => usuario debe completar verificación; enabled => usuario tiene 2FA activado en su cuenta
  private twoFAPendingSubject = new BehaviorSubject<boolean>(false);
  private twoFAEnabledSubject = new BehaviorSubject<boolean>(false);
  private userSubject = new BehaviorSubject<User | null>(null);
  private sessionIdSubject = new BehaviorSubject<string | null>(null);

  readonly isAuthenticated$ = this.isAuthenticatedSubject.asObservable();
  readonly loading$ = this.loadingSubject.asObservable();
  readonly error$ = this.errorSubject.asObservable();
  readonly requiresTwoFA$ = this.twoFAPendingSubject.asObservable(); // compat alias
  readonly twoFAPending$ = this.twoFAPendingSubject.asObservable();
  readonly twoFAEnabled$ = this.twoFAEnabledSubject.asObservable();
  readonly user$ = this.userSubject.asObservable();
  readonly sessionId$ = this.sessionIdSubject.asObservable();

  // ====== REFRESH SCHEDULER ======
  private refreshSubscription?: Subscription;
  private proactiveRefreshInFlight = false;
  private refreshingSubject = new BehaviorSubject<boolean>(false); // incluye proactivo ó (futuro) reactivo coordinado
  readonly refreshing$ = this.refreshingSubject.asObservable();

  // ====== PUBLIC SYNC API (Guards / Interceptor) ======
  isAuthenticatedSync(): boolean { return this.isAuthenticatedSubject.getValue(); }
  requiresTwoFASync(): boolean { return this.twoFAPendingSubject.getValue(); }
  twoFAEnabledSync(): boolean { return this.twoFAEnabledSubject.getValue(); }
  getCurrentUserSync(): User | null { return this.userSubject.getValue(); }
  getAccessTokenSync(): string | null { return localStorage.getItem(environment.auth.tokenKey); }
  getRefreshTokenSync(): string | null { return localStorage.getItem(environment.auth.refreshTokenKey); }
  isRefreshInFlightSync(): boolean { return this.proactiveRefreshInFlight || this.refreshingSubject.getValue(); }

  // ====== CORE MUTATORS ======
  setLoading(v: boolean) { this.loadingSubject.next(v); }
  setError(msg: string | null) { this.errorSubject.next(msg); }
  clearError() { this.errorSubject.next(null); }

  /**
   * Limpia completamente el estado y tokens (logout lógico). No navega.
   */
  resetAll(): void {
    this.stopRefreshScheduler();
    this.isAuthenticatedSubject.next(false);
  this.twoFAPendingSubject.next(false);
  this.twoFAEnabledSubject.next(false);
    this.userSubject.next(null);
    this.sessionIdSubject.next(null);
    this.clearError();
    this.clearTokens();
  }

  /**
   * Aplica un resultado de autenticación (estrategia login / register / 2FA verify, etc.)
   */
  applyAuthResult(result: {
    success: boolean;
    user?: User | null;
    token?: string;
    refreshToken?: string;
  requiresTwoFA?: boolean; // legado (pending)
  twoFAPending?: boolean;  // nuevo nombre explícito
  twoFAEnabled?: boolean;  // refleja si la cuenta tiene 2FA activo tras verificación
    sessionId?: string | null;
    error?: string;
    registerFlowSkipAuth?: boolean; // cuando register no auto-login
  }): void {
    this.setLoading(false);
    if (!result.success) {
      if (!result.registerFlowSkipAuth) {
        this.isAuthenticatedSubject.next(false);
      }
      if (result.error) this.setError(result.error);
      return;
    }

    const pending2FA = result.twoFAPending ?? result.requiresTwoFA;
    if (pending2FA) {
      this.twoFAPendingSubject.next(true);
      this.isAuthenticatedSubject.next(false);
      return;
    }

    if (result.registerFlowSkipAuth) {
      // Registro con autoLogin desactivado: no autenticamos, pero limpiamos loading
      this.isAuthenticatedSubject.next(false);
      return;
    }

    if (result.token) this.storeTokens(result.token, result.refreshToken || '');
    if (result.sessionId) this.setSessionId(result.sessionId);
    if (result.user) {
      const normalized = this.normalizeUser(result.user);
      this.userSubject.next(normalized);
      // Derivar twoFAEnabled del user normalizado si disponible
      const enabled = (normalized as any).twoFAEnabled === true || (normalized as any).two_fa_enabled === true;
      this.twoFAEnabledSubject.next(enabled);
    }
    this.isAuthenticatedSubject.next(true);
    this.twoFAPendingSubject.next(false);
    this.scheduleRefreshFromToken();
  }

  // ====== BOOTSTRAP ======
  bootstrapSession(): Observable<void> {
    const token = this.getAccessTokenSync();
    if (!token) {
      this.resetAll();
      return of(undefined);
    }
    // Fetch /auth/me para usuario
    return this.http.get<any>(`${environment.apiUrl}/auth/me`).pipe(
      map(resp => {
        const user = resp?.data?.user || resp?.user; // admitir ambas formas
        if (user) {
          this.userSubject.next(this.normalizeUser(user));
          this.isAuthenticatedSubject.next(true);
          this.scheduleRefreshFromToken();
        } else {
          this.resetAll();
        }
      }),
      catchError(() => {
        this.resetAll();
        return of(undefined);
      })
    );
  }

  // ====== TOKEN MANAGEMENT ======
  storeTokens(access: string, refresh: string) {
    try {
      localStorage.setItem(environment.auth.tokenKey, access);
      if (refresh) localStorage.setItem(environment.auth.refreshTokenKey, refresh);
    } catch {}
  }
  clearTokens() {
    try {
      localStorage.removeItem(environment.auth.tokenKey);
      localStorage.removeItem(environment.auth.refreshTokenKey);
    } catch {}
  }

  setSessionId(id: string | null) {
    this.sessionIdSubject.next(id);
    try {
      if (id) localStorage.setItem(this.SESSION_KEY, id); else localStorage.removeItem(this.SESSION_KEY);
    } catch {}
  }
  getSessionIdSync(): string | null { return this.sessionIdSubject.getValue() || localStorage.getItem(this.SESSION_KEY); }
  clearSessionId() { this.setSessionId(null); }

  // ====== REFRESH SCHEDULER ======
  scheduleRefreshFromToken(): void {
    const token = this.getAccessTokenSync();
    if (!token) return;
    const expMs = this.getTokenExpiry(token);
    if (!expMs) return;
    const now = Date.now();
  // Programar (leadTime configurable) antes del exp con jitter configurable
  const jitter = Math.floor(Math.random() * this.cfg.jitterMs);
  const fireIn = Math.max(expMs - now - this.cfg.leadTimeMs + jitter, 5_000);
    this.stopRefreshScheduler();
    this.refreshSubscription = timer(fireIn).subscribe(() => {
      this.logger.debug('Proactive refresh timer fired');
      this.attemptProactiveRefresh().subscribe({
        next: () => this.logger.debug('Proactive refresh success'),
        error: (e) => this.logger.warn('Proactive refresh failed, will rely on 401 fallback', e)
      });
    });
  }

  stopRefreshScheduler(): void {
    this.refreshSubscription?.unsubscribe();
    this.refreshSubscription = undefined;
  }

  /**
   * Intento proactivo de refresh (antes de que el token expire) con un máximo de 1 reintento exponencial ligero.
   * Si falla, no invalida sesión inmediatamente; se delega al flujo 401 reactivo para un segundo intento global.
   */
  attemptProactiveRefresh(): Observable<void> {
    if (this.proactiveRefreshInFlight) return of(undefined);
    const refreshToken = this.getRefreshTokenSync();
    const deviceId = this.extractDeviceId();
    const token = this.getAccessTokenSync();
    if (!refreshToken || !deviceId || !token) return of(undefined);
    this.proactiveRefreshInFlight = true;
    this.refreshingSubject.next(true);
    return this.http.post<any>(`${environment.apiUrl}/auth/refresh`, { refreshToken, deviceId }).pipe(
      map(resp => {
        if (resp?.success && resp.accessToken) {
          this.storeTokens(resp.accessToken, resp.refreshToken || '');
          this.scheduleRefreshFromToken(); // reprogramar
        } else {
          throw new Error(resp?.error || 'Refresh response invalid');
        }
      }),
      retryWhen(err$ => err$.pipe(
        scan((acc, err) => {
          if (acc >= (this.cfg.maxProactiveRetries)) throw err; // número configurable de reintentos
          return acc + 1;
        }, 0),
        delay(this.cfg.retryDelayBaseMs + Math.random() * 500)
      )),
      catchError(e => {
        return throwError(() => e);
      }),
      finalize(() => { this.proactiveRefreshInFlight = false; this.refreshingSubject.next(false); })
    );
  }

  private extractDeviceId(): string | null {
    try { return localStorage.getItem('lunglife_device_id'); } catch { return null; }
  }

  // ====== HELPERS ======
  private getTokenExpiry(token: string): number | null {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload?.exp) return payload.exp * 1000;
      return null;
    } catch { return null; }
  }

  private normalizeUser(raw: any): User {
    if (!raw) return raw;
    const p = raw.profile;
    raw.firstName = raw.firstName ?? p?.nombre ?? p?.firstName ?? '';
    raw.lastName = raw.lastName ?? p?.apellido ?? p?.lastName ?? '';
    raw.phone = raw.phone ?? p?.telefono ?? p?.phone;
    (raw as any).birthDate = (raw as any).birthDate ?? p?.fecha_nacimiento;
    raw.avatar = raw.avatar ?? p?.avatar_url;
    (raw as any).isEmailVerified = (raw as any).isEmailVerified ?? raw.email_verified;
    (raw as any).twoFAEnabled = (raw as any).twoFAEnabled ?? raw.two_fa_enabled;
    (raw as any).createdAt = (raw as any).createdAt ?? raw.created_at;
    (raw as any).updatedAt = (raw as any).updatedAt ?? raw.updated_at;
    (raw as any).lastLogin = (raw as any).lastLogin ?? raw.last_login;
    (raw as any).isActive = (raw as any).isActive ?? raw.is_active;
    return raw;
  }
}
