import { Component, OnInit, OnDestroy, inject, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, NonNullableFormBuilder } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { IonicModule, AlertController, LoadingController } from '@ionic/angular';
import { Subject, takeUntil } from 'rxjs';
import { AuthFacadeService } from '../../../core/services';
import { AuthValidators } from '../../../core/validators/auth-validators';
import { DEFAULT_AUTH_REDIRECT, resolvePostAuthRedirect, getRoleDashboardUrl } from '../../../core/utils/auth-navigation';
import { LoggerService } from '../../../../core/services/logger.service';
import { LoginRequest } from '../../../core/services/infrastructure/auth-api.service';
import {
  LoginFormData,
  TwoFactorFormData,
  TwoFactorVerificationRequest,
  AuthResponse,
  LoginComponentState,
  LoginRateLimitState,
  RateLimitConfig,
  LoginComputedState,
  AlertConfig,
  LoadingConfig,
  SanitizedLoginInput,
  SecurityAuditEvent
} from './login.interface';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, IonicModule, RouterLink],
  templateUrl: './login.page.html',
  styleUrls: [
    '../../../auth.styles.scss',
    '../../../../theme/shared-layout.scss',
    './login.page.scss'
  ],
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
  
  // Rate limiting configuration
  private readonly rateLimitConfig: RateLimitConfig = {
    maxLoginAttempts: 5,
    loginCooldownMs: 900000, // 15 minutos
    loginAttemptWindowMs: 1800000 // 30 minutos
  };
  
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
    
    // Obtener URL de retorno de los parámetros de consulta (si existe)
    const queryReturnUrl = this.route.snapshot.queryParams['returnUrl'];
    if (queryReturnUrl) {
      this.returnUrl = resolvePostAuthRedirect(queryReturnUrl);
    }

    // Suscribirse a cambios en el estado de 2FA usando signals
    this.authFacade.requiresTwoFA$.pipe(takeUntil(this.destroy$)).subscribe(r => this.requiresTwoFactor.set(r));
    this.authFacade.error$.pipe(takeUntil(this.destroy$)).subscribe(e => this.error.set(e));
    this.authFacade.loading$.pipe(takeUntil(this.destroy$)).subscribe(l => this.loading.set(l));
    
    // Suscribirse a cambios de autenticación y redirigir según rol
    this.authFacade.isAuthenticated$.pipe(takeUntil(this.destroy$)).subscribe(isAuth => {
      if (isAuth && !this.requiresTwoFactor()) {
        const user = this.authFacade.getCurrentUser();
        // Si no hay returnUrl específico, usar dashboard según rol
        const targetUrl = this.route.snapshot.queryParams['returnUrl']
          ? this.returnUrl
          : getRoleDashboardUrl(user?.role);
        
        if (this.router.url !== targetUrl) {
          this.router.navigateByUrl(targetUrl, { replaceUrl: true });
        }
      }
    });
  }

  onLogin(): void {
    if (!this.loginForm.valid) return;

    // Verificar rate limiting
    if (!this.checkLoginRateLimit()) {
      return;
    }

    const rawEmail = this.loginForm.get('email')?.value || '';
    const sanitizedEmail = this.sanitizeLoginEmail(rawEmail);
    
    const loginData: LoginFormData = {
      email: sanitizedEmail,
      password: this.loginForm.get('password')?.value,
      rememberMe: this.loginForm.get('rememberMe')?.value
    };

    this.authFacade.login(loginData).subscribe({
      next: (response: AuthResponse) => {
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

  onVerify2FA(): void {
    if (!this.twoFactorForm.valid) return;

    const code = this.twoFactorForm.get('code')?.value;

    const verificationData: TwoFactorVerificationRequest = {
      code: code
    };

    this.authFacade.verify2FA(verificationData).subscribe({
      next: (response: AuthResponse) => {
        if (response.success) {
          this.performDeferredRedirect();
        }
      },
      error: (error: any) => {
        // El error se maneja automáticamente por el servicio
      }
    });
  }

  verifyBackupCode(): void {
    if (!this.backupCode()) return;

    const verificationData: TwoFactorVerificationRequest = {
      code: this.backupCode(),
      isBackupCode: true
    };

    this.authFacade.verify2FA(verificationData).subscribe({
      next: (response: AuthResponse) => {
        if (response.success) {
          this.performDeferredRedirect();
        }
      },
      error: (error: any) => {
        // El error se maneja automáticamente por el servicio
      }
    });
  }

  cancelTwoFactor(): void {
    this.requiresTwoFactor.set(false);
    this.twoFactorForm.reset();
    this.showBackupCodeInput.set(false);
    this.backupCode.set('');
    this.error.set(null);
  }

  togglePassword(): void {
    this.showPassword.update(current => !current);
  }

  toggleBackupCodeInput(): void {
    this.showBackupCodeInput.update(current => !current);
  }

  loginWithGoogle(): void {
    this.showInfoAlert('Google Login', 'Google authentication will be implemented soon.');
  }

  loginWithApple(): void {
    this.showInfoAlert('Apple Login', 'Apple authentication will be implemented soon.');
  }

  /**
   * Redirección diferida con reintentos para evitar condiciones de carrera al propagar estado auth.
   * Redirige al dashboard según el rol del usuario si no hay returnUrl específico.
   */
  private performDeferredRedirect(attempt = 0) {
    if (this.requiresTwoFactor()) return;
    
    // Determinar URL de destino según rol
    const user = this.authFacade.getCurrentUser();
    const queryReturnUrl = this.route.snapshot.queryParams['returnUrl'];
    const targetUrl = queryReturnUrl ? this.returnUrl : getRoleDashboardUrl(user?.role);
    
    if (this.router.url === targetUrl) return;
    const maxAttempts = 6;
    if (attempt === 0) {
      setTimeout(() => this.performDeferredRedirect(attempt + 1), 0);
      return;
    }
    if (attempt > maxAttempts) return;
    try {
      this.router.navigateByUrl(targetUrl, { replaceUrl: true }).then(success => {
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

    const loadingConfig: LoadingConfig = {
      message: 'Signing in...',
      spinner: 'crescent'
    };
    
    const loading = await this.loadingController.create(loadingConfig);
    await loading.present();

    try {
      const credentials: LoginRequest = this.loginForm.value;
      console.log('Attempting enhanced login', { email: credentials.email });
      
      this.authFacade.login(credentials).subscribe({
        next: async (result: AuthResponse) => {
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
    const alertConfig: AlertConfig = {
      header: 'Login Failed',
      message,
      buttons: ['OK'],
      cssClass: 'error-alert'
    };
    
    const alert = await this.alertController.create(alertConfig);
    await alert.present();
  }

  /**
   * Show info alert
   */
  private async showInfoAlert(header: string, message: string): Promise<void> {
    const alertConfig: AlertConfig = {
      header,
      message,
      buttons: ['OK'],
      cssClass: 'info-alert'
    };
    
    const alert = await this.alertController.create(alertConfig);
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
    if (now - lastAttempt > this.rateLimitConfig.loginAttemptWindowMs) {
      this.loginAttempts.set(0);
      this.isLoginRateLimited.set(false);
      return true;
    }
    
    // Verificar si está en cooldown
    if (attempts >= this.rateLimitConfig.maxLoginAttempts) {
      const timeRemaining = this.rateLimitConfig.loginCooldownMs - (now - lastAttempt);
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
      if (now - lastAttempt <= this.rateLimitConfig.loginAttemptWindowMs) {
        this.loginAttempts.set(attempts);
        this.lastLoginAttempt.set(lastAttempt);
      }
    }
  }

  /**
   * Sanitizar email de login
   */
  private sanitizeLoginEmail(email: string): string {
    const sanitizedInput: SanitizedLoginInput = {
      email: email.toLowerCase().trim().replace(/[<>'"&]/g, ''),
      password: '',
      rememberMe: false
    };
    return sanitizedInput.email;
  }
}
