import {inject} from '@angular/core';
import {CanActivateFn, Router} from '@angular/router';
import {AuthService} from '../services/auth.service';
import {ToastService} from '../services/toast.service';

export const authGuard: CanActivateFn = async (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const toastService = inject(ToastService);

  if (authService.isAuthenticated()) {
    return true;
  } else {
    // Show user feedback
    await toastService.showWarning('Debes iniciar sesión para acceder a esta página');

    // Navigate to login with return URL
    await router.navigate(['/login'], {
      queryParams: {returnUrl: state.url}
    });

    return false;
  }
};
