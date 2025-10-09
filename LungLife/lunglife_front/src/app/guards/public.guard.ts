import {inject} from '@angular/core';
import {CanActivateFn, Router} from '@angular/router';
import {AuthService} from '../services/auth.service';
import {ToastService} from '../services/toast.service';

export const publicGuard: CanActivateFn = async (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const toastService = inject(ToastService);

  if (!authService.isAuthenticated()) {
    return true;
  } else {
    // User is already authenticated, redirect to dashboard
    const currentUser = authService.getCurrentUser();
    await toastService.showInfo(`Ya estás autenticado como ${currentUser?.name || 'usuario'}`);

    await router.navigate(['/dashboard']);
    return false;
  }
};
