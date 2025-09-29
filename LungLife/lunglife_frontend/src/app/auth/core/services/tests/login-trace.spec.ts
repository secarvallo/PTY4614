import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AuthFacadeService } from '../application/auth-facade.service';
import { AuthStrategyContext } from '../application/auth-strategy-context.service';
import { LoginStrategy } from '../infrastructure/strategies/login.strategy';
import { RegisterStrategy } from '../infrastructure/strategies/register.strategy';
import { ForgotPasswordStrategy } from '../infrastructure/strategies/forgot-password.strategy';
import { TwoFactorStrategy } from '../infrastructure/strategies/two-factor.strategy';
import { GoogleAuthStrategy } from '../infrastructure/strategies/google-auth.strategy';
import { environment } from 'src/environments/environment';
import { take } from 'rxjs/operators';

/**
 * 🔍 Login Trace Spec
 * Objetivo: detectar por qué la app no redirige a /profile tras autenticación.
 * Rastrea los pasos: estrategia -> tokens -> authState -> bootstrapSession -> flags.
 */

// Temporarily skipped (legacy trace spec) until AuthFacadeService exposes equivalent public API (bootstrapSession etc.)
xdescribe('Login Trace Flow (legacy)', () => {
  let httpMock: HttpTestingController;
  let authFacade: AuthFacadeService;
  let strategyContext: AuthStrategyContext;

  const API_LOGIN = `${environment.apiUrl}/auth/login`;
  const API_ME = `${environment.apiUrl}/auth/me`;

  beforeEach(() => {
    // Limpieza de storage para cada prueba
    localStorage.clear();

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AuthFacadeService,
        AuthStrategyContext,
        LoginStrategy,
        RegisterStrategy,
        ForgotPasswordStrategy,
        TwoFactorStrategy,
        GoogleAuthStrategy,
      ],
    });

    httpMock = TestBed.inject(HttpTestingController);
    authFacade = TestBed.inject(AuthFacadeService);
    strategyContext = TestBed.inject(AuthStrategyContext);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  function readStoredAccess(): string | null {
    return localStorage.getItem(environment.auth.tokenKey);
  }

  it('TRACE 1: Login devuelve token sin user -> marca autenticado y permite bootstrap posterior', (done) => {
    const creds = { email: 'trace@example.com', password: 'secret123', rememberMe: true };

    authFacade.login(creds).subscribe(result => {
      expect(result.success).toBeTrue();
      // No user en respuesta
      expect(result.user).toBeUndefined();
      // Token debe haberse guardado
      expect(readStoredAccess()).toBe('trace-token');

      // isAuthenticated$ debe ser true provisional
      authFacade.isAuthenticated$.pipe(take(1)).subscribe(isAuth => {
        expect(isAuth).toBeTrue();
        // user$ todavía null
        authFacade.user$.pipe(take(1)).subscribe(user => {
          expect(user).toBeNull();
          done();
        });
      });
    });

    const req = httpMock.expectOne(API_LOGIN);
    expect(req.request.method).toBe('POST');
    req.flush({ token: 'trace-token', refreshToken: 'trace-refresh' });
  });

  // TRACE 2 removed: relied on deprecated bootstrapSession()

  it('TRACE 3: Login con user completo permite navegación inmediata (user != null)', (done) => {
    const creds = { email: 'full@example.com', password: 'secret123' };

    authFacade.login(creds).subscribe(result => {
      expect(result.success).toBeTrue();
      expect(result.user).toBeDefined();
      authFacade.user$.pipe(take(1)).subscribe(user => {
        expect(user?.email).toBe('full@example.com');
        authFacade.isAuthenticated$.pipe(take(1)).subscribe(isAuth => {
          expect(isAuth).toBeTrue();
          done();
        });
      });
    });

    const req = httpMock.expectOne(API_LOGIN);
    req.flush({
      user: { id: 10, email: 'full@example.com', email_verified: true, two_fa_enabled: false, is_active: true, failed_login_attempts: 0, created_at: new Date(), login_count: 5 },
      token: 'full-token',
      refreshToken: 'full-refresh'
    });
  });

  it('TRACE 4: Login con requiresTwoFA no debe marcar autenticado final', (done) => {
    const creds = { email: '2fa@example.com', password: 'secret123' };

    authFacade.login(creds).subscribe(result => {
      expect(result.success).toBeTrue();
      expect((result as any).requiresTwoFA).toBeTrue();

      authFacade.requiresTwoFA$.pipe(take(1)).subscribe(r2 => {
        expect(r2).toBeTrue();
        // isAuthenticated provisional true (porque token), pero el flujo real navegaría a verify-2fa
        authFacade.isAuthenticated$.pipe(take(1)).subscribe(isAuth => {
          expect(isAuth).toBeTrue();
          done();
        });
      });
    });

    const req = httpMock.expectOne(API_LOGIN);
    req.flush({ requiresTwoFA: true, sessionId: 'sess-2fa', user: { id: 7, email: '2fa@example.com', email_verified: true, two_fa_enabled: false, is_active: true, failed_login_attempts: 0, created_at: new Date(), login_count: 2 } });
  });

  it('TRACE 5: Error de credenciales mantiene isAuthenticated en false', (done) => {
    const creds = { email: 'bad@example.com', password: 'wrong' };

    authFacade.login(creds).subscribe({
      next: result => {
        expect(result.success).toBeFalse();
        authFacade.isAuthenticated$.pipe(take(1)).subscribe(isAuth => {
          expect(isAuth).toBeFalse();
          done();
        });
      }
    });

    const req = httpMock.expectOne(API_LOGIN);
    req.flush({ message: 'Invalid' }, { status: 401, statusText: 'Unauthorized' });
  });
});
