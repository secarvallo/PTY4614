import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { TwoFAPendingGuard } from './twofa-pending.guard';
import { CoreAuthStore } from '../services/core-auth.store';

class CoreAuthStoreMock {
  private pending = false;
  requiresTwoFASync() { return this.pending; }
  setPending(v: boolean) { this.pending = v; }
}

describe('TwoFAPendingGuard', () => {
  let guard: TwoFAPendingGuard;
  let store: CoreAuthStoreMock;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RouterTestingModule.withRoutes([])],
      providers: [
        TwoFAPendingGuard,
        { provide: CoreAuthStore, useClass: CoreAuthStoreMock }
      ]
    });
    guard = TestBed.inject(TwoFAPendingGuard);
    store = TestBed.inject(CoreAuthStore) as any;
    router = TestBed.inject(Router);
  });

  it('redirects to /auth/verify-2fa when 2FA is pending', () => {
    store.setPending(true);
    const result = guard.canActivate();
    expect(result instanceof UrlTree).toBeTrue();
    const tree = result as UrlTree;
    expect(tree.toString()).toBe('/auth/verify-2fa');
  });

  it('allows navigation when 2FA is already verified', () => {
    store.setPending(false);
    const result = guard.canActivate();
    expect(result).toBeTrue();
  });
});
