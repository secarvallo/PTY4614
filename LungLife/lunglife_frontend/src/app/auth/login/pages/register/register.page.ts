import { Component, OnInit, OnDestroy, inject, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, NonNullableFormBuilder } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IonicModule, AlertController, LoadingController, ToastController } from '@ionic/angular';
import { Subject, takeUntil } from 'rxjs';
import { AdvancedAuthService } from '../../../core/services/advanced-auth.service';
import { AuthValidators } from '../../../core/validators/auth-validators';
import { AuthFacadeService } from '../../../core/services';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IonicModule, RouterLink],
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss', '../../../auth.styles.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RegisterPage implements OnInit, OnDestroy {
  private fb = inject(NonNullableFormBuilder);
  private authService = inject(AdvancedAuthService);
  private authFacade = inject(AuthFacadeService);
  private router = inject(Router);
  private alertController = inject(AlertController);
  private loadingController = inject(LoadingController);
  private toastController = inject(ToastController);

  // Angular 20 Signals for reactive state management
  showPassword = signal(false);
  showConfirmPassword = signal(false);
  loading = signal(false);
  error = signal<string | null>(null);
  private registrationInProgress = signal(false);
  
  // Computed signals for derived state
  isFormValid = computed(() => this.registerForm?.valid ?? false);
  canSubmit = computed(() => this.isFormValid() && !this.loading());

  registerForm: FormGroup;
  private destroy$ = new Subject<void>();

  // Password validation checks
  passwordChecks = {
    minLength: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false
  };

  // Password validation result interface
  passwordValidation: {
    isValid: boolean;
    strength: 'weak' | 'medium' | 'strong';
    errors: string[];
  } | null = null;

  // Observable State from AuthFacade
  authState$ = this.authFacade.getAuthState();

  constructor() {
    // Actualizado para usar los campos de la nueva BD
    this.registerForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      apellido: [''],
      email: ['', [Validators.required, AuthValidators.advancedEmail()]],
      telefono: ['', [AuthValidators.phoneNumber()]],
      password: ['', [Validators.required, AuthValidators.strongPassword()]],
      confirmPassword: ['', [Validators.required, AuthValidators.confirmPassword('password')]],
      acceptTerms: [false, [Validators.requiredTrue]],
      acceptPrivacy: [false, [Validators.requiredTrue]],
      acceptMarketing: [false]
    });
  }

  ngOnInit() {
    this.setupPasswordValidation();
    this.subscribeToAuthState();

    // Monitor password changes for real-time validation
    this.registerForm.get('password')?.valueChanges.subscribe(password => {
      this.updatePasswordChecks(password);
    });

    // Suscribirse a errores del servicio usando signals
    this.authService.error$.pipe(takeUntil(this.destroy$)).subscribe((error: string | null) => {
      this.error.set(error);
    });

    // Suscribirse a estado de carga
    this.authService.loading$.pipe(takeUntil(this.destroy$)).subscribe((loading: boolean) => {
      this.loading.set(loading);
    });
  }

  // Add utility getters/methods referenced in template
  isFieldInvalid(field: string): boolean {
    const ctrl = this.registerForm.get(field);
    return !!ctrl && ctrl.invalid && (ctrl.dirty || ctrl.touched);
  }

  togglePassword() { this.showPassword.update(current => !current); }
  toggleConfirmPassword() { this.showConfirmPassword.update(current => !current); }

  private updatePasswordChecks(password: string) {
    const p = password || '';
    this.passwordChecks.minLength = p.length >= 8;
    this.passwordChecks.uppercase = /[A-Z]/.test(p);
    this.passwordChecks.lowercase = /[a-z]/.test(p);
    this.passwordChecks.number = /[0-9]/.test(p);
    this.passwordChecks.special = /[^A-Za-z0-9]/.test(p);
  }

  private markAllFieldsAsTouched() {
    Object.keys(this.registerForm.controls).forEach(key => {
      const ctrl = this.registerForm.get(key);
      ctrl?.markAsTouched();
      ctrl?.updateValueAndValidity();
    });
  }

  async onRegister() {
    if (!this.registerForm.valid) {
      this.markAllFieldsAsTouched();
      return;
    }

    const registerData = {
      email: this.registerForm.get('email')?.value,
      password: this.registerForm.get('password')?.value,
      firstName: this.registerForm.get('nombre')?.value,
      lastName: this.registerForm.get('apellido')?.value || '',
      phone: this.registerForm.get('telefono')?.value || undefined,
      acceptTerms: this.registerForm.get('acceptTerms')?.value,
      acceptPrivacy: this.registerForm.get('acceptPrivacy')?.value
    };

    const loading = await this.loadingController.create({
      message: 'Creating your account...',
      spinner: 'crescent'
    });
    await loading.present();

    this.registrationInProgress.set(true);

    try {
      this.authFacade.register(registerData).subscribe({
        next: async (result) => {
          await loading.dismiss();
          this.registrationInProgress.set(false);

          if (result.success) {
            await this.showSuccessToast('Account created successfully!');
            // Navigate to login instead of auto-login to avoid confusion
            this.router.navigate(['/auth/login'], { 
              queryParams: { email: registerData.email }
            });
          } else {
            this.showErrorAlert(result.error || 'Registration failed');
          }
        },
        error: async (error) => {
          await loading.dismiss();
          this.registrationInProgress.set(false);
          console.error('Registration error', error);
          this.showErrorAlert('An error occurred during registration');
        }
      });
    } catch (error) {
      await loading.dismiss();
      this.registrationInProgress.set(false);
      console.error('Registration catch error', error);
      this.showErrorAlert('An unexpected error occurred');
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Setup real-time password validation
   */
  private setupPasswordValidation(): void {
    this.registerForm.get('password')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(password => {
        if (password) {
          this.validatePasswordStrength(password);
        }
      });
  }

  /**
   * Validate password strength
   */
  private validatePasswordStrength(password: string): void {
    const checks = {
      minLength: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };

    this.passwordChecks = checks;

    const validChecks = Object.values(checks).filter(Boolean).length;
    let strength: 'weak' | 'medium' | 'strong' = 'weak';
    
    if (validChecks >= 5) strength = 'strong';
    else if (validChecks >= 3) strength = 'medium';

    this.passwordValidation = {
      isValid: validChecks >= 4,
      strength,
      errors: []
    };
  }

  /**
   * Custom validator for password confirmation
   */
  private passwordMatchValidator = (group: FormGroup) => {
    const password = group.get('password')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;

    if (password && confirmPassword && password !== confirmPassword) {
      group.get('confirmPassword')?.setErrors({ passwordMismatch: true });
    } else {
      const errors = group.get('confirmPassword')?.errors;
      if (errors) {
        delete errors['passwordMismatch'];
        group.get('confirmPassword')?.setErrors(Object.keys(errors).length ? errors : null);
      }
    }
    return null;
  };

  /**
   * Subscribe to authentication state changes
   */
  private subscribeToAuthState(): void {
    this.authState$.error$
      .pipe(takeUntil(this.destroy$))
      .subscribe((error: string | null) => {
        if (error && this.registrationInProgress()) {
          this.showErrorAlert(error);
        }
      });
  }

  /**
   * Navigate to terms and conditions
   */
  openTerms(): void {
    this.showInfoAlert('Terms & Conditions', 'Terms and conditions will be displayed here.');
  }

  /**
   * Social registration methods
   */
  registerWithGoogle(): void {
    this.showInfoAlert('Google Registration', 'Google registration will be implemented soon.');
  }

  /**
   * Mark all form controls as touched for validation display
   */
  private markFormGroupTouched(): void {
    Object.keys(this.registerForm.controls).forEach(key => {
      const control = this.registerForm.get(key);
      control?.markAsTouched();
    });
  }

  /**
   * Show success toast
   */
  private async showSuccessToast(message: string = 'Account created!'): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      position: 'top',
      color: 'success',
      cssClass: 'success-toast'
    });
    await toast.present();
  }

  /**
   * Show error alert
   */
  private async showErrorAlert(message: string): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Registration Failed',
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
   * Get password strength description for UI
   */
  getPasswordStrength() {
    if (!this.passwordValidation) return null;
    
    return {
      strength: this.passwordValidation.strength,
      text: this.passwordValidation.strength === 'strong' ? 'Strong' :
            this.passwordValidation.strength === 'medium' ? 'Medium' : 'Weak',
      color: this.passwordValidation.strength === 'strong' ? 'success' :
             this.passwordValidation.strength === 'medium' ? 'warning' : 'danger'
    };
  }
}
