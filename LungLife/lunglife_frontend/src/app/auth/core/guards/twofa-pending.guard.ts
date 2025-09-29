import { Injectable, inject } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { CoreAuthStore } from '../services/core-auth.store';

/**
 * TwoFAPendingGuard
 * @deprecated La lógica de 2FA pending ha sido integrada en `unifiedAuthGuard`.
 *             Mantener temporalmente para compatibilidad; migrar a canActivate: [unifiedAuthGuard].
 * Bloquea el acceso a rutas sensibles mientras el usuario tiene 2FA pendiente.
 */
@Injectable({ providedIn: 'root' })
export class TwoFAPendingGuard implements CanActivate {
  private store = inject(CoreAuthStore);
  private router = inject(Router);

  canActivate(): boolean | UrlTree {
    // Sólo revisa si hay un estado de 2FA pendiente: la autenticación base debe ser verificada antes.
    if (this.store.requiresTwoFASync()) {
      return this.router.parseUrl('/auth/verify-2fa');
    }
    return true;
  }
}
