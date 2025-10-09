import { Routes, UrlTree, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthFacadeService } from './auth/core/services';
import { AppInitService } from './core/services/app-init.service';
import { SplashComponent } from './core/components/splash/splash.component';
// Legacy simple-auth guards replaced by unified versions
import { unifiedAuthGuard, unifiedGuestGuard, unifiedTwoFAGuard } from './auth/core/guards/unified-auth.guards';
import { DEFAULT_AUTH_REDIRECT, resolvePostAuthRedirect } from './auth/core/utils/auth-navigation';

// Root redirect -> usa unified logic (sin duplicar reglas)
const rootRedirectGuard = (): UrlTree | boolean => {
  const auth = inject(AuthFacadeService);
  const init = inject(AppInitService);
  const router = inject(Router);
  if (init.isInitializingSync()) return true; // permanecer en splash inicial
  if (auth.requiresTwoFASync()) return router.parseUrl('/auth/verify-2fa');
  if (auth.isAuthenticatedSync()) return router.parseUrl(resolvePostAuthRedirect());
  return router.createUrlTree(['/auth/login']);
};

export const routes: Routes = [
  { path: '', component: SplashComponent, canActivate: [rootRedirectGuard] },
  {
    path: 'auth',
    children: [
      { path: '', redirectTo: 'login', pathMatch: 'full' },
      { path: 'forgot-password', redirectTo: 'forgot', pathMatch: 'full' },
      {
        path: 'login',
        loadComponent: () => import('./auth/login/pages/advanced-login/advanced-login.page').then(m => m.AdvancedLoginPage),
        title: 'Iniciar Sesión - LungLife',
  canActivate: [unifiedGuestGuard]
      },
      {
        path: 'register',
        loadComponent: () => import('./auth/login/pages/advanced-register/advanced-register.page').then(m => m.AdvancedRegisterPage),
        title: 'Crear Cuenta - LungLife',
  canActivate: [unifiedGuestGuard]
      },
      {
        path: 'verify-2fa',
        loadComponent: () => import('./auth/login/pages/verify-2fa/verify-2fa.page').then(m => m.Verify2faPage),
        title: 'Verificar 2FA - LungLife',
  canActivate: [unifiedTwoFAGuard]
      },
      {
        path: 'forgot',
        loadComponent: () => import('./auth/login/pages/forgot/forgot.page').then(m => m.ForgotPage),
        title: 'Recuperar Contraseña - LungLife',
  canActivate: [unifiedGuestGuard]
      },
      {
        path: 'google-callback',
        loadComponent: () => import('./auth/login/pages/google-callback/google-callback.page').then(m => m.GoogleCallbackPage),
        title: 'Autenticación con Google - LungLife'
      },
      {
        path: 'google-success',
        loadComponent: () => import('./auth/login/pages/google-success/google-success.page').then(m => m.GoogleSuccessPage),
        title: 'Autenticación Exitosa - LungLife'
      }
    ]
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./dashboard/dashboard.page').then(m => m.DashboardPage),
  canActivate: [unifiedAuthGuard],
    title: 'Dashboard - LungLife'
  },
  {
    path: 'profile',
    loadComponent: () => import('./profile/profile.page').then(m => m.ProfilePage),
  canActivate: [unifiedAuthGuard],
    title: 'Profile - LungLife'
  },
  {
    path: 'security',
  canActivate: [unifiedAuthGuard],
    children: [
      { path: '', redirectTo: '2fa-settings', pathMatch: 'full' },
      {
        path: '2fa-setup',
        loadComponent: () => import('./security/two-fa-setup/two-fa-setup.page').then(m => m.TwoFaSetupPage),
        title: 'Configurar 2FA - LungLife'
      },
      {
        path: '2fa-settings',
        loadComponent: () => import('./security/two-fa-settings/two-fa-settings.page').then(m => m.TwoFaSettingsPage),
        title: 'Configuración 2FA - LungLife'
      },
      {
        path: 'sessions',
        loadComponent: () => import('./security/session-management/session-management.page').then(m => m.SessionManagementPage),
        title: 'Gestión de Sesiones - LungLife'
      }
    ]
  },
  { path: 'login', redirectTo: '/auth/login', pathMatch: 'full' },
  { path: 'register', redirectTo: '/auth/register', pathMatch: 'full' },
  { path: 'forgot-password', redirectTo: '/auth/forgot-password', pathMatch: 'full' },
  { path: 'home', redirectTo: DEFAULT_AUTH_REDIRECT, pathMatch: 'full' },
  {
    path: '**',
    loadComponent: () => import('./shared/not-found/not-found.page').then(m => m.NotFoundPage),
    title: 'Página No Encontrada - LungLife'
  }
];
