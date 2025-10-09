import { Injectable, inject } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Observable, map } from 'rxjs';
import { AuthFacadeService } from '../services/application/auth-facade.service';
import { AppInitService } from '../../../core/services/app-init.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  private authFacade = inject(AuthFacadeService);
  private router = inject(Router);
  private initSvc = inject(AppInitService);

  canActivate(): Observable<boolean | UrlTree> | boolean | UrlTree {
    // Si aún estamos inicializando, permitir acceso
    if (this.initSvc.isInitializingSync()) {
      return true;
    }

    // Usar observable para verificar estado de autenticación
    return this.authFacade.isAuthenticated$.pipe(
      map(isAuthenticated => {
        if (isAuthenticated) {
          return true;
        }
        console.log('AuthGuard: Usuario no autenticado, devolviendo UrlTree(/auth/login)');
        return this.router.parseUrl('/auth/login');
      })
    );
  }
}
