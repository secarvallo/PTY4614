import { unifiedAuthGuard } from './unified-auth.guards';
import { Router, UrlTree } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AuthFacadeService } from '../services';

class AuthFacadeMock {
  private authed = false;
  private pending = false;
  isAuthenticatedSync() { return this.authed; }
  requiresTwoFASync() { return this.pending; }
  setState({ authed, pending }: { authed?: boolean; pending?: boolean }) {
    if (authed !== undefined) this.authed = authed;
    if (pending !== undefined) this.pending = pending;
  }
}

describe('unifiedAuthGuard', () => {
  let router: Router;
  let facade: AuthFacadeMock;

  function runGuard(url: string) {
    return TestBed.runInInjectionContext(() => unifiedAuthGuard({} as any, { url } as any));
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RouterTestingModule.withRoutes([])],
      providers: [
        { provide: AuthFacadeService, useClass: AuthFacadeMock }
      ]
    });
    router = TestBed.inject(Router);
    facade = TestBed.inject(AuthFacadeService) as any;
  });

  it('returns true when fully authenticated and no 2FA pending', () => {
    facade.setState({ authed: true, pending: false });
    const result = runGuard('/dashboard');
    expect(result).toBeTrue();
  });

  it('redirects to /auth/verify-2fa when 2FA pending', () => {
    facade.setState({ authed: false, pending: true });
    const result = runGuard('/dashboard');
    expect(result instanceof UrlTree).toBeTrue();
    expect((result as UrlTree).toString()).toBe('/auth/verify-2fa');
  });

  it('redirects to login with returnUrl when not authenticated', () => {
    facade.setState({ authed: false, pending: false });
    const result = runGuard('/profile');
    expect(result instanceof UrlTree).toBeTrue();
    const tree = result as UrlTree;
    expect(tree.toString()).toContain('/auth/login');
  });
});
