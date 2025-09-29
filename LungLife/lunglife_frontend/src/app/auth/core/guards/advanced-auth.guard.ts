import { Injectable, inject } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { AdvancedAuthService } from '../services/advanced-auth.service';

@Injectable({
  providedIn: 'root'
})
export class AdvancedAuthGuard implements CanActivate {
  private authService = inject(AdvancedAuthService);
  private router = inject(Router);

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {

    return this.authService.isAuthenticated$.pipe(
      take(1),
      map(isAuthenticated => {
        if (isAuthenticated) {
          // Verificar si la ruta requiere verificación específica
          const requires2FA = route.data?.['requires2FA'];
          const requiresEmailVerification = route.data?.['requiresEmailVerification'];

          const currentUser = this.authService.getCurrentUser();

          // Verificar 2FA si es requerido
          if (requires2FA && currentUser && !currentUser.twoFactorEnabled) {
            return this.router.createUrlTree(['/security/2fa-setup'], {
              queryParams: { returnUrl: state.url }
            });
          }

          // Verificar email si es requerido
          if (requiresEmailVerification && currentUser && !currentUser.emailVerified) {
            return this.router.createUrlTree(['/auth/verify-email'], {
              queryParams: { returnUrl: state.url }
            });
          }

          return true;
        } else {
          // Redirigir a login con la URL de retorno
          return this.router.createUrlTree(['/auth/login'], {
            queryParams: { returnUrl: state.url }
          });
        }
      })
    );
  }
}

@Injectable({
  providedIn: 'root'
})
export class GuestOnlyGuard implements CanActivate {
  private authService = inject(AdvancedAuthService);
  private router = inject(Router);

  canActivate(): Observable<boolean | UrlTree> {
    return this.authService.isAuthenticated$.pipe(
      take(1),
      map(isAuthenticated => {
        if (isAuthenticated) {
          // Usuario autenticado, redirigir al dashboard
          return this.router.createUrlTree(['/dashboard']);
        }
        return true;
      })
    );
  }
}

@Injectable({
  providedIn: 'root'
})
export class TwoFactorGuard implements CanActivate {
  private authService = inject(AdvancedAuthService);
  private router = inject(Router);

  canActivate(): Observable<boolean | UrlTree> {
    return this.authService.requiresTwoFactor$.pipe(
      take(1),
      map(requires2FA => {
        if (requires2FA) {
          return true;
        } else {
          // No requiere 2FA, redirigir según estado de autenticación
          const isAuthenticated = this.authService.isAuthenticated();
          if (isAuthenticated) {
            return this.router.createUrlTree(['/dashboard']);
          } else {
            return this.router.createUrlTree(['/auth/login']);
          }
        }
      })
    );
  }
}

@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate {
  private authService = inject(AdvancedAuthService);
  private router = inject(Router);

  canActivate(route: ActivatedRouteSnapshot): Observable<boolean | UrlTree> {
    const requiredRoles = route.data?.['roles'] as string[];

    return this.authService.user$.pipe(
      take(1),
      map(user => {
        if (!user) {
          return this.router.createUrlTree(['/auth/login']);
        }

        if (!requiredRoles || requiredRoles.length === 0) {
          return true;
        }

        // Verificar si el usuario tiene alguno de los roles requeridos
        const userRoles = (user as any).roles || [];
        const hasRequiredRole = requiredRoles.some(role => userRoles.includes(role));

        if (hasRequiredRole) {
          return true;
        } else {
          return this.router.createUrlTree(['/access-denied']);
        }
      })
    );
  }
}
