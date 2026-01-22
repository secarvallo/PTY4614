import { Routes, UrlTree, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthFacadeService } from './auth/core/services';
import { AppInitService } from './core/services/app-init.service';
import { SplashComponent } from './core/components/splash/splash.component';
// Legacy simple-auth guards replaced by unified versions
import { 
  unifiedAuthGuard, 
  unifiedGuestGuard, 
  unifiedTwoFAGuard, 
  patientOnlyGuard,
  doctorOnlyGuard,
  adminOnlyGuard,
  allRolesGuard 
} from './auth/core/guards/unified-auth.guards';
import { DEFAULT_AUTH_REDIRECT, resolvePostAuthRedirect } from './auth/core/utils/auth-navigation';

// Root redirect -> redirige a home como página principal
const rootRedirectGuard = (): UrlTree | boolean => {
  const router = inject(Router);
  return router.createUrlTree(['/home']);
};

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
        path: 'role-selection',
        loadComponent: () => import('./auth/login/pages/role-selection/role-selection.page').then(m => m.RoleSelectionPage),
        title: 'Seleccionar Rol - LungLife'
        // Sin guard - accesible tanto para registro como para usuarios no autenticados
      },
      {
        path: 'register',
        loadComponent: () => import('./auth/login/pages/register/register.page').then(m => m.RegisterPage),
        title: 'Crear Cuenta - LungLife',
        canActivate: [unifiedGuestGuard]
      },
      {
        path: 'register-success',
        loadComponent: () => import('./auth/login/pages/register-success/register-success.page').then(m => m.RegisterSuccessPage),
        title: 'Registro Exitoso - LungLife',
        canActivate: [unifiedGuestGuard]
      },
      {
        path: 'logout-success',
        loadComponent: () => import('./auth/login/pages/logout-success/logout-success.page').then(m => m.LogoutSuccessPage),
        title: 'Sesión Cerrada - LungLife'
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
    canActivate: [unifiedAuthGuard],
    children: [
      { path: '', redirectTo: 'form', pathMatch: 'full' },
      {
        path: 'form',
        loadComponent: () => import('./profile/components/profile-form/profile-form.component').then(m => m.ProfileFormComponent),
        title: 'Mi Perfil - LungLife'
      },
      {
        path: 'create',
        loadComponent: () => import('./profile/components/profile-form/profile-form.component').then(m => m.ProfileFormComponent),
        title: 'Crear Perfil - LungLife'
      },
      {
        path: 'edit/:id',
        loadComponent: () => import('./profile/components/profile-form/profile-form.component').then(m => m.ProfileFormComponent),
        title: 'Editar Perfil - LungLife'
      }
    ]
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
    path: 'directory',
    loadComponent: () => import('./directory/pages/directory/directory.page').then(m => m.DirectoryPage),
    canActivate: [allRolesGuard],
    title: 'Directorio - LungLife'
  },
  {
    path: 'clinical-profile',
    loadComponent: () => import('./clinical-profile/pages/detailed-profile/detailed-profile.page').then(m => m.DetailedProfilePage),
    canActivate: [allRolesGuard],
    title: 'Perfil Clínico - LungLife'
  },
  {
    path: 'clinical-profile/:patientId',
    loadComponent: () => import('./clinical-profile/pages/detailed-profile/detailed-profile.page').then(m => m.DetailedProfilePage),
    canActivate: [allRolesGuard],
    title: 'Perfil Clínico - LungLife'
  },
  // Redirect legacy route
  { path: 'doctors-directory', redirectTo: '/directory', pathMatch: 'full' },
  { path: 'login', redirectTo: '/auth/login', pathMatch: 'full' },
  { path: 'register', redirectTo: '/auth/register', pathMatch: 'full' },
  { path: 'forgot-password', redirectTo: '/auth/forgot-password', pathMatch: 'full' },
  {
    path: '**',
    loadComponent: () => import('./shared/not-found/not-found.page').then(m => m.NotFoundPage),
    title: 'Página No Encontrada - LungLife'
  }
];
