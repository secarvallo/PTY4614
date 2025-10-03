import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { publicGuard } from './guards/public.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: 'home',
    loadComponent: () => import('./pages/home/home.page').then((m) => m.HomePage),
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page').then( m => m.LoginPage),
    canActivate: [publicGuard] // Only accessible when NOT logged in
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/register/register.page').then( m => m.RegisterPage),
    canActivate: [publicGuard] // Only accessible when NOT logged in
  },
  {
    path: 'forgot-pass',
    loadComponent: () => import('./pages/forgot-pass/forgot-pass.page').then( m => m.ForgotPassPage),
    canActivate: [publicGuard] // Only accessible when NOT logged in
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard.page').then(m => m.DashboardPage),
    canActivate: [authGuard] // Requires authentication
  },
  {
    path: 'profile',
    loadComponent: () => import('./pages/profile/profile.page').then( m => m.ProfilePage),
    canActivate: [authGuard] // Requires authentication
  },
  {
    path:'**',
    redirectTo: 'home',
  }
];
