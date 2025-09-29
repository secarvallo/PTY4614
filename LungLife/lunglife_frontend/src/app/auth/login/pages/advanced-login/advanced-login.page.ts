import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { AuthFacadeService } from '../../../core/services';
import { AuthValidators } from '../../../core/validators/auth-validators';
import { DEFAULT_AUTH_REDIRECT, resolvePostAuthRedirect } from '../../../core/utils/auth-navigation';

@Component({
  selector: 'app-advanced-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, IonicModule, RouterLink],
  templateUrl: './advanced-login.page.html',
  styleUrls: ['./advanced-login.page.scss']
})
export class AdvancedLoginPage implements OnInit {
  private fb = inject(FormBuilder);
  private authFacade = inject(AuthFacadeService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  // Formularios
  loginForm: FormGroup;
  twoFactorForm: FormGroup;

  // Estados
  loading = false;
  showPassword = false;
  requiresTwoFactor = false;
  showBackupCodeInput = false;
  backupCode = '';
  error: string | null = null;
  returnUrl = DEFAULT_AUTH_REDIRECT;

  constructor() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, AuthValidators.advancedEmail()]],
      password: ['', [Validators.required]],
      rememberMe: [false]
    });

    this.twoFactorForm = this.fb.group({
      code: ['', [Validators.required, AuthValidators.twoFactorCode()]]
    });
  }

  ngOnInit() {
    // Obtener URL de retorno de los parámetros de consulta
    this.returnUrl = resolvePostAuthRedirect(this.route.snapshot.queryParams['returnUrl']);
    // Debug simple (eliminar si no se necesita):
    // console.log('[Login] returnUrl resolved ->', this.returnUrl, 'raw:', this.route.snapshot.queryParams['returnUrl']);

    // Fallback: si no viene returnUrl explícito y el guard nos trajo aquí desde otra URL previa
    if (!this.route.snapshot.queryParams['returnUrl'] && (window?.history?.state as any)?.navigationId) {
      // Podríamos agregar lógica adicional si se quisiera restaurar una ruta previa.
    }

    // Suscribirse a cambios en el estado de 2FA
    // Observaciones vía facade
    this.authFacade.requiresTwoFA$.subscribe(r => this.requiresTwoFactor = r);
    this.authFacade.error$.subscribe(e => this.error = e);
    this.authFacade.loading$.subscribe(l => this.loading = l);
    this.authFacade.isAuthenticated$.subscribe(isAuth => {
      if (isAuth && !this.requiresTwoFactor && this.router.url !== this.returnUrl) {
        this.router.navigateByUrl(this.returnUrl, { replaceUrl: true });
      }
    });
  }

  onLogin() {
    if (!this.loginForm.valid) return;

    const loginData = this.loginForm.value;

  this.authFacade.login(loginData).subscribe({
      next: (response: any) => {
        if (response.success && !response.requiresTwoFactor) {
          // Auth state should already be synced; guard if still propagating
          this.performDeferredRedirect();
        }
        // Si requiere 2FA, el componente se actualizará automáticamente
      },
      error: (error: any) => {
        // El error se maneja automáticamente por el servicio
      }
    });
  }

  onVerify2FA() {
    if (!this.twoFactorForm.valid) return;

    const code = this.twoFactorForm.get('code')?.value;

  this.authFacade.verify2FA({ code }).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.performDeferredRedirect();
        }
      },
      error: (error: any) => {
        // El error se maneja automáticamente por el servicio
      }
    });
  }

  verifyBackupCode() {
    if (!this.backupCode) return;

    this.authFacade.verify2FA({
      code: this.backupCode,
      isBackupCode: true
    }).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.performDeferredRedirect();
        }
      },
      error: (error: any) => {
        // El error se maneja automáticamente por el servicio
      }
    });
  }

  cancelTwoFactor() {
    this.requiresTwoFactor = false;
    this.twoFactorForm.reset();
    this.showBackupCodeInput = false;
    this.backupCode = '';
    // La fachada no expone clearError público aún; podría agregarse si es necesario.
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  loginWithGoogle() {
    // Implementar login con Google
    console.log('Login con Google - Por implementar');
  }

  loginWithApple() {
    // Implementar login con Apple
    console.log('Login con Apple - Por implementar');
  }

  /**
   * Redirección diferida con reintentos para evitar condiciones de carrera al propagar estado auth.
   */
  private performDeferredRedirect(attempt = 0) {
    if (this.requiresTwoFactor) return;
    if (this.router.url === this.returnUrl) return;
    const maxAttempts = 6; // ~ 0 + 5 escalados
    if (attempt === 0) {
      // Primer microtask
      setTimeout(() => this.performDeferredRedirect(attempt + 1), 0);
      return;
    }
    if (attempt > maxAttempts) return;
    try {
      this.router.navigateByUrl(this.returnUrl, { replaceUrl: true }).then(success => {
        if (!success) {
          setTimeout(() => this.performDeferredRedirect(attempt + 1), 40 * attempt);
        }
      });
    } catch {
      setTimeout(() => this.performDeferredRedirect(attempt + 1), 40 * attempt);
    }
  }
}
