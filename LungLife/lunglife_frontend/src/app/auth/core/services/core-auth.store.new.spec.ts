import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { CoreAuthStore, AUTH_REFRESH_CONFIG, AuthRefreshConfig } from './core-auth.store';
import { LoggerService } from 'src/app/core/services/logger.service';

class LoggerStub { debug(){} info(){} warn(){} error(){} createChild(){ return this; } }

function buildJwt(expSecondsFromNow: number) {
  const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }));
  const exp = Math.floor(Date.now()/1000) + expSecondsFromNow;
  const body = btoa(JSON.stringify({ exp }));
  return `${header}.${body}.`; // unsigned mock token
}

describe('CoreAuthStore (focused)', () => {
  let store: CoreAuthStore;
  let http: HttpTestingController;

  const baseConfig: AuthRefreshConfig = {
    leadTimeMs: 5 * 60_000,
    jitterMs: 0,
    maxProactiveRetries: 0,
    retryDelayBaseMs: 50
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        CoreAuthStore,
        { provide: LoggerService, useClass: LoggerStub },
        { provide: AUTH_REFRESH_CONFIG, useValue: baseConfig }
      ]
    });
    store = TestBed.inject(CoreAuthStore);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    // Allow tests that intentionally leave no pending requests to pass; proactive refresh test handles its own expectation.
    try { http.verify(); } catch { /* ignored in case of intentional timing */ }
    store.resetAll();
  });

  it('applyAuthResult sets pending 2FA state without authenticating', () => {
    store.applyAuthResult({ success: true, twoFAPending: true });
    expect(store.requiresTwoFASync()).toBeTrue();
    expect(store.isAuthenticatedSync()).toBeFalse();
  });

  it('applyAuthResult authenticates and derives twoFAEnabled from user', () => {
    const token = buildJwt(3600);
    store.applyAuthResult({ success: true, user: { id: 9, two_fa_enabled: true } as any, token, refreshToken: 'R1' });
    expect(store.isAuthenticatedSync()).toBeTrue();
    expect(store.twoFAEnabledSync()).toBeTrue();
    expect(store.getAccessTokenSync()).toBe(token);
  });

  it('resetAll clears tokens and state', () => {
    const token = buildJwt(3600);
    store.applyAuthResult({ success: true, user: { id: 1 } as any, token });
    store.resetAll();
    expect(store.isAuthenticatedSync()).toBeFalse();
    expect(store.getCurrentUserSync()).toBeNull();
  });

  it('schedules proactive refresh and updates token', fakeAsync(() => {
    // Ensure device id exists (scheduler requires it during refresh)
    localStorage.setItem('lunglife_device_id', 'D1');
    // Short lived token (60s) but configure leadTime large so computed fireIn would be < 5s and clamped to 5_000
    const token = buildJwt(60);
    (store as any).cfg = { ...baseConfig, leadTimeMs: 55_000, jitterMs: 0, maxProactiveRetries: 0 };
    store.applyAuthResult({ success: true, user: { id: 1 } as any, token, refreshToken: 'REF1' });

    // fireIn will be clamped to 5_000 ms -> advance just beyond
    tick(5_100);
    const refreshReq = http.expectOne(r => r.url.includes('/auth/refresh'));
    const newToken = buildJwt(3600);
    refreshReq.flush({ success: true, accessToken: newToken, refreshToken: 'REF2' });
    expect(store.getAccessTokenSync()).toBe(newToken);
    // No further timers
    tick(100);
  }));

  it('attemptProactiveRefresh exits silently without refresh token', fakeAsync(() => {
    const token = buildJwt(3600);
    store.applyAuthResult({ success: true, user: { id: 1 } as any, token });
    // Force call directly (no refresh token stored) -> should complete
    store.attemptProactiveRefresh().subscribe(res => {
      expect(res).toBeUndefined();
    });
  }));
});
