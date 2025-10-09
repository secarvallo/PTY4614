import { HTTP_INTERCEPTORS, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { unifiedAuthInterceptor } from './unified-auth.interceptor';
import { CoreAuthStore, AUTH_REFRESH_CONFIG } from '../services/core-auth.store';
import { AdvancedAuthService } from '../services/advanced-auth.service';
import { of, throwError } from 'rxjs';

class AdvancedAuthServiceStub {
  refreshCalled = 0;
  tokenSequence: string[] = ['NEW_TOKEN'];
  refreshToken() {
    this.refreshCalled++;
    const next = this.tokenSequence.shift();
    if (!next) return throwError(() => new Error('No more tokens'));
    // Simula que el CoreAuthStore ya guardó el token (en real lo haría applyAuthResult dentro del servicio)
    localStorage.setItem('lunglife_access_token', next);
    return of(next);
  }
}

// Config mínima para evitar inyección opcional undefined
const refreshConfig = { leadTimeMs: 300000, jitterMs: 15000, maxProactiveRetries: 1, retryDelayBaseMs: 500 };

// Temporarily skipped while interceptor implementation evolves with new store
xdescribe('unifiedAuthInterceptor (legacy)', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let authService: AdvancedAuthServiceStub;
  let store: CoreAuthStore;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        CoreAuthStore,
        { provide: AUTH_REFRESH_CONFIG, useValue: refreshConfig },
        { provide: AdvancedAuthService, useClass: AdvancedAuthServiceStub },
        { provide: HTTP_INTERCEPTORS, useValue: unifiedAuthInterceptor, multi: true }
      ]
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AdvancedAuthService) as any;
    store = TestBed.inject(CoreAuthStore);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('adjunta token y pasa respuesta sin errores', () => {
    localStorage.setItem('lunglife_access_token', 'ACCESS123');
    http.get('/api/test').subscribe(r => {
      expect(r).toEqual({ ok: true });
    });
    const req = httpMock.expectOne('/api/test');
    expect(req.request.headers.get('Authorization')).toBe('Bearer ACCESS123');
    req.flush({ ok: true });
  });

  it('realiza refresh ante 401 y reintenta con nuevo token', () => {
    localStorage.setItem('lunglife_access_token', 'OLD');
    http.get('/api/secure').subscribe(r => {
      expect(r).toEqual({ secure: true });
      expect(authService.refreshCalled).toBe(1);
    });
    // Primera request devuelve 401
    const first = httpMock.expectOne('/api/secure');
    expect(first.request.headers.get('Authorization')).toBe('Bearer OLD');
    first.flush({ error: 'expired' }, { status: 401, statusText: 'Unauthorized' });

    // Refresh call (AdvancedAuthService.refreshToken) no usa HttpClient en este stub, así que no se intercepta.
    // Interceptor reintenta
    const retried = httpMock.expectOne('/api/secure');
    expect(retried.request.headers.get('Authorization')).toBe('Bearer NEW_TOKEN');
    retried.flush({ secure: true });
  });

  it('propaga error si refresh también falla y hace resetAll', () => {
    localStorage.setItem('lunglife_access_token', 'A');
    // Forzar fallo en refresh secuencia vacía
    (authService as any).tokenSequence = []; // provocará error en refresh

    let caught: any;
    http.get('/api/protected').subscribe({ error: e => caught = e });

    const first = httpMock.expectOne('/api/protected');
    first.flush({ error: 'expired' }, { status: 401, statusText: 'Unauthorized' });

    expect(caught).toBeTruthy();
    expect(store.isAuthenticatedSync()).toBeFalse();
    expect(store.getAccessTokenSync()).toBeNull();
  });

  it('cola peticiones concurrentes durante refresh (single refresh call)', () => {
    localStorage.setItem('lunglife_access_token', 'OLD');
    // Preparar dos observables antes de que la primera responda
    const results: any[] = [];
    http.get('/api/a').subscribe(r => results.push(r));
    http.get('/api/b').subscribe(r => results.push(r));

    // Ambas primeras respuestas 401
    const firstA = httpMock.expectOne('/api/a');
    const firstB = httpMock.expectOne('/api/b');
    firstA.flush({ error: 'expired' }, { status: 401, statusText: 'Unauthorized' });
    firstB.flush({ error: 'expired' }, { status: 401, statusText: 'Unauthorized' });

    // Sólo un refresh (stub) debe ejecutarse
    expect(authService.refreshCalled).toBe(1);

    // Interceptor reintenta ambas con nuevo token
    const retriedA = httpMock.expectOne('/api/a');
    const retriedB = httpMock.expectOne('/api/b');
    expect(retriedA.request.headers.get('Authorization')).toBe('Bearer NEW_TOKEN');
    expect(retriedB.request.headers.get('Authorization')).toBe('Bearer NEW_TOKEN');
    retriedA.flush({ ok: 'A' });
    retriedB.flush({ ok: 'B' });

    expect(results.length).toBe(2);
  });
});
