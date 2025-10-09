import { Injectable, inject } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Observable, map } from 'rxjs';
import { AuthFacadeService } from '../services/application/auth-facade.service';
import { AppInitService } from '../../../core/services/app-init.service';

@Injectable({ providedIn: 'root' })
export class GuestGuard implements CanActivate {
  private appInitService = inject(AppInitService);
  private authFacade = inject(AuthFacadeService);
  private router = inject(Router);

  canActivate(): Observable<boolean | UrlTree> | boolean | UrlTree {
    // Si estamos inicializando, permitir el acceso
    if (this.appInitService.isInitializingSync()) {
      return true;
    }

    // Usar observable para verificar estado de autenticación
    return this.authFacade.isAuthenticated$.pipe(
      map(isAuthenticated => {
        if (isAuthenticated) {
          // Devolver UrlTree en lugar de navegar con side-effect
            console.log('GuestGuard: Usuario autenticado, devolviendo UrlTree(/profile)');
            return this.router.parseUrl('/profile');
        }
        return true;
      })
    );
  }
}

