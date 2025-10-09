import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthFacadeService } from '../services';
import { DEFAULT_AUTH_REDIRECT, resolvePostAuthRedirect } from '../utils/auth-navigation';

/**
 * Minimal Auth Guards (Stateless, Pure)
 * - authGuard: allows only authenticated users
 * - guestGuard: allows only unauthenticated users
 * - twoFAGuard: allows only when pending 2FA verification
 * All guards are synchronous snapshots -> no subscriptions / no side-effects.
 */

export const authGuard: CanActivateFn = (_route, state): boolean | UrlTree => {
  const auth = inject(AuthFacadeService);
  const router = inject(Router);
  if (auth.isAuthenticatedSync()) {
    return true;
  }

  const desiredDestination = state.url && state.url !== '/' ? state.url : DEFAULT_AUTH_REDIRECT;
  return router.createUrlTree(['/auth/login'], { queryParams: { returnUrl: desiredDestination } });
};

export const guestGuard: CanActivateFn = (): boolean | UrlTree => {
  const auth = inject(AuthFacadeService);
  const router = inject(Router);
  return auth.isAuthenticatedSync() ? router.parseUrl(resolvePostAuthRedirect()) : true;
};

export const twoFAGuard: CanActivateFn = (): boolean | UrlTree => {
  const auth = inject(AuthFacadeService);
  const router = inject(Router);
  if (auth.requiresTwoFASync()) return true;
  // If user already fully authenticated skip verify page
  if (auth.isAuthenticatedSync()) return router.parseUrl(resolvePostAuthRedirect());
  return router.createUrlTree(['/auth/login']);
};

