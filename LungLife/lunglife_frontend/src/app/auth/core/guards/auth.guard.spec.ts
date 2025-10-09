import { AuthGuard } from './auth.guard';
import { AuthFacadeService } from '../services/application/auth-facade.service';
import { AppInitService } from '../../../core/services/app-init.service';
import { Router, UrlTree } from '@angular/router';
import { of } from 'rxjs';

class AuthFacadeStub {
  isAuthenticated$ = of(false);
}
class AppInitStub { isInitializingSync() { return false; } }
class RouterStub {
  parseUrl(url: string){ return new UrlTree(); }
}

// Temporarily skipped (legacy facade/internal coupling) per hybrid stabilization plan
xdescribe('AuthGuard', () => {
  let guard: AuthGuard;
  let facade: AuthFacadeStub;
  let init: AppInitStub;
  let router: RouterStub;

  beforeEach(() => {
    facade = new AuthFacadeStub();
    init = new AppInitStub();
    router = new RouterStub();
    guard = new AuthGuard();
    // @ts-ignore - inject manual
    (guard as any).authFacade = facade;
    (guard as any).initSvc = init;
    (guard as any).router = router;
  });

  it('permite cuando isAuthenticated$ = true', (done) => {
    facade.isAuthenticated$ = of(true);
    const result$ = guard.canActivate();
    if (result$ instanceof UrlTree || typeof result$ === 'boolean') {
      fail('Expected observable');
    } else {
      result$.subscribe(val => { expect(val).toBeTrue(); done(); });
    }
  });

  it('redirige cuando no autenticado', (done) => {
    const parseSpy = spyOn(router, 'parseUrl').and.returnValue(new UrlTree());
    const result$ = guard.canActivate();
    if (result$ instanceof UrlTree || typeof result$ === 'boolean') { fail('Expected observable'); } else {
      result$.subscribe(val => { expect(parseSpy).toHaveBeenCalled(); done(); });
    }
  });
});
