import { Routes } from '@angular/router';
import { AuthGuard } from './auth/core/guards';

/**
 * 🗺️ Application Routes - Updated for reorganized auth structure
 * Core logic separated from Login UI
 */
export const routes: Routes = [
  // Root redirect to dashboard or login based on auth state
  {
    path: '',
    redirectTo: '/dashboard',
    pathMatch: 'full',
  },

  // Authentication Routes (No GuestGuard, removed for now)
  {
    path: 'auth',
    children: [
      {
        path: 'login',
        loadComponent: () =>
          import('./auth/login/pages/login/login.page').then((m) => m.LoginPage),
        title: 'Sign In - LungLife',
      },
      {
        path: 'register',
        loadComponent: () =>
          import('./auth/login/pages/register/register.page').then((m) => m.RegisterPage),
        title: 'Sign Up - LungLife',
      },
      {
        path: 'forgot',
        loadComponent: () =>
          import('./auth/login/pages/forgot/forgot.page').then((m) => m.ForgotPage),
        title: 'Reset Password - LungLife',
      },
      {
        path: 'verify-2fa',
        loadComponent: () =>
          import('./auth/login/pages/verify-2fa/verify-2fa.page').then((m) => m.Verify2faPage),
        title: 'Verify 2FA - LungLife',
      },
      {
        path: 'google-callback',
        loadComponent: () =>
          import('./auth/login/pages/google-callback/google-callback.page').then((m) => m.GoogleCallbackPage),
        title: 'Google Callback - LungLife',
      },
      {
        path: 'google-success',
        loadComponent: () =>
          import('./auth/login/pages/google-success/google-success.page').then((m) => m.GoogleSuccessPage),
        title: 'Google Success - LungLife',
      },
    ],
  },

  // Protected Application Routes (Require Authentication)
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./dashboard/dashboard.page').then((m) => m.DashboardPage),
    canActivate: [AuthGuard],
    title: 'Dashboard - LungLife',
  },

  // User Profile and Settings (Protected Routes)
  {
    path: 'profile',
    loadComponent: () =>
      import('./profile/profile.page').then((m) => m.ProfilePage),
    canActivate: [AuthGuard],
    title: 'Profile - LungLife',
  },

  // Security Settings
  {
    path: 'security',
    children: [
      {
        path: '2fa',
        loadComponent: () =>
          import('./security/two-fa-settings/two-fa-settings.page').then((m) => m.TwoFaSettingsPage),
        canActivate: [AuthGuard],
        title: '2FA Settings - LungLife',
      },
    ],
  },

  // Legacy route redirects for backward compatibility
  {
    path: 'login',
    redirectTo: '/auth/login',
    pathMatch: 'full',
  },
  {
    path: 'register',
    redirectTo: '/auth/register',
    pathMatch: 'full',
  },
  {
    path: 'forgot',
    redirectTo: '/auth/forgot',
    pathMatch: 'full',
  },
  {
    path: 'verify-2fa',
    redirectTo: '/auth/verify-2fa',
    pathMatch: 'full',
  },

  // 404 Page
  {
    path: '**',
    loadComponent: () =>
      import('./shared/not-found/not-found.page').then((m) => m.NotFoundPage),
    title: 'Page Not Found - LungLife',
  },
];
