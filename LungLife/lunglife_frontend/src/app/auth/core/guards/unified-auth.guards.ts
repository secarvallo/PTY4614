import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthFacadeService } from '../services';
import { resolvePostAuthRedirect, buildLoginRedirectTreeParams } from '../utils/auth-navigation';

/**
 * Unified Auth Guards
 * - authGuard: requiere sesión completa (si pending 2FA redirige a verify)
 * - guestGuard: sólo usuarios no autenticados (si autenticado redirige a destino seguro)
 * - twoFAGuard: sólo paso intermedio cuando requiresTwoFA=true (si ya autenticado -> redirect; si no autenticado -> login)
 * Todos sin suscripciones (snapshot sync) para mantener predictibilidad.
 */

export const unifiedAuthGuard: CanActivateFn = (_route, state): boolean | UrlTree => {
  const auth = inject(AuthFacadeService);
  const router = inject(Router);

  // 1. Sesión completa (no pending 2FA) => permitir
  if (auth.isAuthenticatedSync() && !auth.requiresTwoFASync()) {
    return true;
  }

  // 2. Flujo 2FA pendiente: forzar verificación antes de acceder a rutas protegidas
  if (auth.requiresTwoFASync()) {
    return router.parseUrl('/auth/verify-2fa');
  }

  // 3. No autenticado => redirigir a login con returnUrl
  const params = buildLoginRedirectTreeParams(null, state.url);
  return router.createUrlTree(['/auth/login'], { queryParams: params });
};

export const unifiedGuestGuard: CanActivateFn = (_route, _state): boolean | UrlTree => {
  const auth = inject(AuthFacadeService);
  const router = inject(Router);
  if (!auth.isAuthenticatedSync() && !auth.requiresTwoFASync()) return true;
  if (auth.requiresTwoFASync()) return router.parseUrl('/auth/verify-2fa');
  return router.parseUrl(resolvePostAuthRedirect());
};

export const unifiedTwoFAGuard: CanActivateFn = (): boolean | UrlTree => {
  const auth = inject(AuthFacadeService);
  const router = inject(Router);
  // Sólo debe usarse en la ruta /auth/verify-2fa
  if (auth.requiresTwoFASync()) return true; // todavía en paso intermedio
  if (auth.isAuthenticatedSync()) return router.parseUrl(resolvePostAuthRedirect()); // ya completó 2FA
  return router.createUrlTree(['/auth/login']); // no autenticado
};
