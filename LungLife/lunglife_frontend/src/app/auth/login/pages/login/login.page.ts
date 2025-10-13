import { Component, OnInit, OnDestroy, inject, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, NonNullableFormBuilder } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { IonicModule, AlertController, LoadingController } from '@ionic/angular';
import { Subject, takeUntil } from 'rxjs';
import { AuthFacadeService } from '../../../core/services';
import { AuthValidators } from '../../../core/validators/auth-validators';
import { DEFAULT_AUTH_REDIRECT, resolvePostAuthRedirect } from '../../../core/utils/auth-navigation';

import { LoggerService } from '../../../../core/services/logger.service';
import { LoginRequest } from '../../../core/services/infrastructure/auth-api.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, IonicModule, RouterLink],
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss', '../../../auth.styles.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginPage implements OnInit, OnDestroy {
  private fb = inject(NonNullableFormBuilder);
  private authFacade = inject(AuthFacadeService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private alertController = inject(AlertController);
  private loadingController = inject(LoadingController);
  private logger = inject(LoggerService);

  // Angular 20 Signals for reactive state management
  loading = signal(false);
  showPassword = signal(false);
  requiresTwoFactor = signal(false);
  showBackupCodeInput = signal(false);
  backupCode = signal('');
  error = signal<string | null>(null);
  
  // Rate limiting signals
  private loginAttempts = signal(0);
  private lastLoginAttempt = signal(0);
  isLoginRateLimited = signal(false);
  private readonly MAX_LOGIN_ATTEMPTS = 5;
  private readonly LOGIN_COOLDOWN_MS = 900000; // 15 minutos
  private readonly LOGIN_ATTEMPT_WINDOW_MS = 1800000; // 30 minutos
  
  // Computed signals for derived state
  isFormValid = computed(() => this.loginForm?.valid ?? false);
  canSubmit = computed(() => this.loginForm?.valid && !this.loading() && !this.isLoginRateLimited());

  // Formularios con NonNullableFormBuilder para mejor type safety
  loginForm: FormGroup;
  twoFactorForm: FormGroup;

  returnUrl = DEFAULT_AUTH_REDIRECT;
  private destroy$ = new Subject<void>();

  // Observable State from AuthFacade (Observer Pattern)
  authState$ = this.authFacade.getAuthState();

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
    // Cargar estado de rate limiting para login
    this.loadLoginRateLimitState();
    
    // Obtener URL de retorno de los parámetros de consulta
    this.returnUrl = resolvePostAuthRedirect(this.route.snapshot.queryParams['returnUrl']);

    // Suscribirse a cambios en el estado de 2FA usando signals
    this.authFacade.requiresTwoFA$.pipe(takeUntil(this.destroy$)).subscribe(r => this.requiresTwoFactor.set(r));
    this.authFacade.error$.pipe(takeUntil(this.destroy$)).subscribe(e => this.error.set(e));
    this.authFacade.loading$.pipe(takeUntil(this.destroy$)).subscribe(l => this.loading.set(l));
    this.authFacade.isAuthenticated$.pipe(takeUntil(this.destroy$)).subscribe(isAuth => {
      if (isAuth && !this.requiresTwoFactor() && this.router.url !== this.returnUrl) {
        this.router.navigateByUrl(this.returnUrl, { replaceUrl: true });
      }
    });
  }

  onLogin() {
    if (!this.loginForm.valid) return;

    // Verificar rate limiting
    if (!this.checkLoginRateLimit()) {
      return;
    }

    const rawEmail = this.loginForm.get('email')?.value || '';
    const sanitizedEmail = this.sanitizeLoginEmail(rawEmail);
    
    const loginData = {
      email: sanitizedEmail,
      password: this.loginForm.get('password')?.value,
      rememberMe: this.loginForm.get('rememberMe')?.value
    };

    this.authFacade.login(loginData).subscribe({
      next: (response: any) => {
        if (response.success && !response.requiresTwoFactor) {
          // Limpiar rate limiting en caso de éxito
          this.loginAttempts.set(0);
          this.isLoginRateLimited.set(false);
          localStorage.removeItem('lunglife_login_attempts');
          localStorage.removeItem('lunglife_login_last_attempt');
          
          this.performDeferredRedirect();
        }
      },
      error: (error: any) => {
        // Registrar intento fallido
        this.recordLoginAttempt();
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
    if (!this.backupCode()) return;

    this.authFacade.verify2FA({
      code: this.backupCode(),
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
    this.requiresTwoFactor.set(false);
    this.twoFactorForm.reset();
    this.showBackupCodeInput.set(false);
    this.backupCode.set('');
    this.error.set(null);
  }

  togglePassword() {
    this.showPassword.update(current => !current);
  }

  toggleBackupCodeInput() {
    this.showBackupCodeInput.update(current => !current);
  }

  loginWithGoogle() {
    this.showInfoAlert('Google Login', 'Google authentication will be implemented soon.');
  }

  loginWithApple() {
    this.showInfoAlert('Apple Login', 'Apple authentication will be implemented soon.');
  }

  /**
   * Redirección diferida con reintentos para evitar condiciones de carrera al propagar estado auth.
   */
  private performDeferredRedirect(attempt = 0) {
    if (this.requiresTwoFactor()) return;
    if (this.router.url === this.returnUrl) return;
    const maxAttempts = 6;
    if (attempt === 0) {
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

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Enhanced login with better loading and error handling
   */
  async onLoginEnhanced(): Promise<void> {
    if (!this.loginForm.valid) {
      this.markFormGroupTouched();
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Signing in...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      const credentials: LoginRequest = this.loginForm.value;
      console.log('Attempting enhanced login', { email: credentials.email });
      
      this.authFacade.login(credentials).subscribe({
        next: async (result) => {
          await loading.dismiss();
          console.log('Login result received', { 
            success: result.success, 
            hasUser: !!result.user, 
            requiresTwoFA: !!result.requiresTwoFA 
          });
          
          if (result.success) {
            console.log('Login successful');
            if (!result.requiresTwoFA) {
              this.performDeferredRedirect();
            }
          } else {
            this.showErrorAlert(result.error || 'Login failed');
          }
        },
        error: async (error) => {
          await loading.dismiss();
          console.error('Login error', error);
          this.showErrorAlert('An error occurred during login');
        }
      });
    } catch (error) {
      await loading.dismiss();
      console.error('Login catch error', error);
      this.showErrorAlert('An unexpected error occurred');
    }
  }

  /**
   * Form validation helpers
   */
  private markFormGroupTouched(): void {
    Object.keys(this.loginForm.controls).forEach(key => {
      const control = this.loginForm.get(key);
      control?.markAsTouched();
    });
  }

  /**
   * Show error alert
   */
  private async showErrorAlert(message: string): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Login Failed',
      message,
      buttons: ['OK'],
      cssClass: 'error-alert'
    });
    await alert.present();
  }

  /**
   * Show info alert
   */
  private async showInfoAlert(header: string, message: string): Promise<void> {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['OK'],
      cssClass: 'info-alert'
    });
    await alert.present();
  }

  /**
   * Rate limiting para login
   */
  private checkLoginRateLimit(): boolean {
    const now = Date.now();
    const lastAttempt = this.lastLoginAttempt();
    const attempts = this.loginAttempts();
    
    // Resetear contador si ha pasado la ventana de tiempo
    if (now - lastAttempt > this.LOGIN_ATTEMPT_WINDOW_MS) {
      this.loginAttempts.set(0);
      this.isLoginRateLimited.set(false);
      return true;
    }
    
    // Verificar si está en cooldown
    if (attempts >= this.MAX_LOGIN_ATTEMPTS) {
      const timeRemaining = this.LOGIN_COOLDOWN_MS - (now - lastAttempt);
      if (timeRemaining > 0) {
        const minutesRemaining = Math.ceil(timeRemaining / 60000);
        this.error.set(`Demasiados intentos de inicio de sesión. Intenta nuevamente en ${minutesRemaining} minuto(s).`);
        this.isLoginRateLimited.set(true);
        return false;
      } else {
        // Cooldown terminado, resetear
        this.loginAttempts.set(0);
        this.isLoginRateLimited.set(false);
      }
    }
    
    return true;
  }

  private recordLoginAttempt(): void {
    this.loginAttempts.update(count => count + 1);
    this.lastLoginAttempt.set(Date.now());
    
    // Guardar en localStorage
    localStorage.setItem('lunglife_login_attempts', this.loginAttempts().toString());
    localStorage.setItem('lunglife_login_last_attempt', this.lastLoginAttempt().toString());
  }

  private loadLoginRateLimitState(): void {
    const savedAttempts = localStorage.getItem('lunglife_login_attempts');
    const savedLastAttempt = localStorage.getItem('lunglife_login_last_attempt');
    
    if (savedAttempts && savedLastAttempt) {
      const attempts = parseInt(savedAttempts);
      const lastAttempt = parseInt(savedLastAttempt);
      const now = Date.now();
      
      // Solo cargar si está dentro de la ventana de tiempo
      if (now - lastAttempt <= this.LOGIN_ATTEMPT_WINDOW_MS) {
        this.loginAttempts.set(attempts);
        this.lastLoginAttempt.set(lastAttempt);
      }
    }
  }

  /**
   * Sanitizar email de login
   */
  private sanitizeLoginEmail(email: string): string {
    return email.toLowerCase().trim().replace(/[<>'"&]/g, '');
  }
}
