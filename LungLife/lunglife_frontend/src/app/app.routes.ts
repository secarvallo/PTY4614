import { Routes, UrlTree, Router } from '@angular/router';
import { inject } from '@angular/core';
// Services, Guards, and Utils remain the same
import { unifiedAuthGuard, unifiedGuestGuard, unifiedTwoFAGuard } from './auth/core/guards/unified-auth.guards';

export const routes: Routes = [
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  {
    path: 'home',
    loadComponent: () => import('./home/home.page').then(m => m.HomePage),
    title: 'LungLife - Inicio'
  },
  {
    path: 'auth',
    children: [
      { path: '', redirectTo: 'login', pathMatch: 'full' },
      { path: 'forgot-password', redirectTo: 'forgot', pathMatch: 'full' },
      {
        path: 'login',
        loadComponent: () => import('./auth/login/pages/login/login.page').then(m => m.LoginPage),
        title: 'Iniciar Sesión - LungLife',
        canActivate: [unifiedGuestGuard]
      },
      {
        path: 'register',
        loadComponent: () => import('./auth/login/pages/register/register.page').then(m => m.RegisterPage),
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
  {
    path: 'terms',
    loadComponent: () => import('./shared/pages/terms/terms.page').then(m => m.TermsPage),
    title: 'Términos y Condiciones - LungLife'
  },
  {
    path: 'privacy',
    loadComponent: () => import('./shared/pages/privacy/privacy.page').then(m => m.PrivacyPage),
    title: 'Política de Privacidad - LungLife'
  },
  {
    path: '**',
    loadComponent: () => import('./shared/not-found/not-found.page').then(m => m.NotFoundPage),
    title: 'Página No Encontrada - LungLife'
  }
];
