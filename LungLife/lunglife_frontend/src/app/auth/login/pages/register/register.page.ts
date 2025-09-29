import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IonicModule, AlertController, LoadingController, ToastController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';

import { AuthFacadeService, ValidationService } from '../../../core/services';
import { RegisterData } from '../../../core/interfaces/auth.unified';

interface PasswordValidationResult {
  isValid: boolean;
  strength: 'weak' | 'medium' | 'strong';
  errors: string[];
}

/**
 * 📝 Register Page - Clean Architecture Implementation
 * Uses Facade Pattern and advanced validation with password strength
 * Implements Observer Pattern for reactive state management
 */
@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss', '../../../auth.styles.scss'],
  standalone: true,
  imports: [IonicModule, ReactiveFormsModule, CommonModule, RouterLink]
})
export class RegisterPage implements OnInit, OnDestroy {
  // Dependency Injection
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private authFacade = inject(AuthFacadeService);
  private validationService = inject(ValidationService);
  private alertController = inject(AlertController);
  private loadingController = inject(LoadingController);
  private toastController = inject(ToastController);

  // Reactive Form
  registerForm!: FormGroup;

  // Component State
  showPassword = false;
  showConfirmPassword = false;
  passwordValidation: PasswordValidationResult | null = null;
  private destroy$ = new Subject<void>();
  private registrationInProgress = false;

  // Observable State from AuthObserver (Observer Pattern)
  authState$ = this.authFacade.getAuthState();

  ngOnInit() {
    this.initializeForm();
    this.subscribeToAuthState();
    this.setupPasswordValidation();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Initialize reactive form with comprehensive validation
   */
  private initializeForm(): void {
    this.registerForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
      acceptTerms: [false, [Validators.requiredTrue]]
    }, {
      validators: this.passwordMatchValidator
    });
  }

  /**
   * Setup real-time password validation
   */
  private setupPasswordValidation(): void {
    this.registerForm.get('password')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(password => {
        if (password) {
          const validation = this.validationService.validatePassword(password);
          this.passwordValidation = {
            isValid: validation.isValid,
            strength: validation.strength === 1 ? 'weak' : validation.strength === 2 ? 'medium' : 'strong',
            errors: validation.errors
          };
        } else {
          this.passwordValidation = null;
        }
      });
  }

  /**
   * Custom validator for password confirmation
   */
  private passwordMatchValidator = (group: FormGroup) => {
    const password = group.get('password')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;

    if (password && confirmPassword && password !== confirmPassword) {
      group.get('confirmPassword')?.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    } else {
      const confirmControl = group.get('confirmPassword');
      if (confirmControl?.errors?.['passwordMismatch']) {
        delete confirmControl.errors['passwordMismatch'];
        if (Object.keys(confirmControl.errors).length === 0) {
          confirmControl.setErrors(null);
        }
      }
    }
    return null;
  };

  /**
   * Subscribe to authentication state changes (Observer Pattern)
   */
  private subscribeToAuthState(): void {
    // Eliminamos navegación automática por isAuthenticated en registro para evitar autologin
    this.authState$.isAuthenticated$
      .pipe(takeUntil(this.destroy$))
      .subscribe((isAuthenticated: boolean) => {
        // Si en otro flujo (login) y autenticado -> redirigir
        if (isAuthenticated && !this.registrationInProgress) {
          this.router.navigate(['/dashboard']);
        }
      });

    // Mantener manejo de errores
    this.authState$.error$
      .pipe(takeUntil(this.destroy$))
      .subscribe((error: string | null) => {
        if (error && this.registrationInProgress) {
          this.registrationInProgress = false;
          this.showErrorAlert(error);
        }
      });
  }

  /**
   * 📝 Handle registration form submission
   * Uses Facade Pattern with enhanced validation
   */
  async onRegister(): Promise<void> {
    if (!this.registerForm.valid) {
      this.markFormGroupTouched();
      return;
    }

    if (this.passwordValidation && !this.passwordValidation.isValid) {
      await this.showErrorAlert('Please fix password requirements before continuing.');
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Creating your account...',
      spinner: 'crescent'
    });
    await loading.present();

    this.registrationInProgress = true;

    try {
      const formValue = this.registerForm.value;
      const registerData: RegisterData = {
        email: formValue.email,
        password: formValue.password,
        firstName: formValue.firstName,
        lastName: formValue.lastName,
        acceptTerms: formValue.acceptTerms,
        username: formValue.email // si backend requiere username, reutilizamos email
      } as RegisterData;

      // Activamos autologin para llenar inmediatamente el estado y luego normalizamos con datos del form
      this.authFacade.register(registerData, { autoLogin: true }).subscribe({
        next: async (result) => {
          loading.dismiss();
          if (result.success) {
            this.registrationInProgress = false;
            // Si el backend no envió user.profile, enriquecemos mínimamente
            if (result.user) {
              const u: any = result.user;
              if (!u.firstName) u.firstName = registerData.firstName;
              if (!u.lastName) u.lastName = registerData.lastName;
              if (!u.email) u.email = registerData.email;
              if (!u.profile) {
                u.profile = {
                  user_id: u.id || 0,
                  nombre: registerData.firstName,
                  apellido: registerData.lastName,
                  telefono: undefined,
                  fecha_nacimiento: undefined,
                  avatar_url: undefined,
                  created_at: new Date()
                };
              }
            }

            const emailVerificationRequired = (result.metadata as any)?.emailVerificationRequired;
            if (emailVerificationRequired) {
              await this.showSuccessToast('Account created! Please verify your email.');
              // Tras verificación manual, usuario hará login nuevamente, no navegamos a profile
              return;
            }

            // Navegación directa a profile porque ya estamos autenticados
            await this.showSuccessToast('Account created! Redirecting to profile...');
            this.router.navigate(['/profile'], { replaceUrl: true });
          } else {
            this.registrationInProgress = false;
            this.showErrorAlert(result.error || 'Registration failed');
          }
        },
        error: (error) => {
          loading.dismiss();
            this.registrationInProgress = false;
          console.error('Registration error:', error);
          this.showErrorAlert('Unexpected error during registration');
        }
      });
    } catch (error) {
      loading.dismiss();
      this.registrationInProgress = false;
      console.error('Registration error:', error);
      this.showErrorAlert('Unexpected error during registration');
    }
  }

  /** Social authentication placeholders */
  loginWithGoogle(): void {
    this.showInfoAlert('Google Login', 'Google authentication will be implemented soon.');
  }
  loginWithFacebook(): void {
    this.showInfoAlert('Facebook Login', 'Facebook authentication will be implemented soon.');
  }
  loginWithApple(): void {
    this.showInfoAlert('Apple Login', 'Apple authentication will be implemented soon.');
  }

  /**
   * Toggle password visibility
   */
  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  /**
   * Toggle confirm password visibility
   */
  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  /**
   * Navigate to login page
   */
  goToLogin(): void {
    this.router.navigate(['/auth/login']);
  }

  /**
   * Navigate to terms and conditions
   */
  openTerms(): void {
    // This would open terms modal or navigate to terms page
    this.showInfoAlert('Terms & Conditions', 'Terms and conditions will be displayed here.');
  }

  /**
   * Get form control for template access
   */
  getFormControl(controlName: string) {
    return this.registerForm.get(controlName);
  }

  /**
   * Check if form control has error
   */
  hasError(controlName: string, errorType: string = ''): boolean {
    const control = this.getFormControl(controlName);
    if (!control) return false;

    if (errorType) {
      return control.hasError(errorType) && (control.dirty || control.touched);
    }
    return control.invalid && (control.dirty || control.touched);
  }

  /**
   * Get error message for form control
   */
  getErrorMessage(controlName: string): string {
    const control = this.getFormControl(controlName);
    if (!control || !control.errors) return '';

    if (control.errors['required']) {
      return `${this.getFieldLabel(controlName)} is required`;
    }
    if (control.errors['email']) {
      return 'Please enter a valid email address';
    }
    if (control.errors['minlength']) {
      return `${this.getFieldLabel(controlName)} must be at least ${control.errors['minlength'].requiredLength} characters`;
    }
    if (control.errors['passwordMismatch']) {
      return 'Passwords do not match';
    }
    if (control.errors['requiredTrue']) {
      return 'You must accept the terms and conditions';
    }

    return 'Invalid input';
  }

  /**
   * Get password strength description for UI
   */
  getPasswordStrength() {
    if (!this.passwordValidation) return null;

    const descriptions = {
      weak: {
        label: 'Weak - Add more characters and complexity',
        color: '#ff4444',
        percentage: 33
      },
      medium: {
        label: 'Good - Consider adding more complexity',
        color: '#ffaa00',
        percentage: 66
      },
      strong: {
        label: 'Strong - Excellent password!',
        color: '#00aa00',
        percentage: 100
      }
    };

    return descriptions[this.passwordValidation.strength];
  }

  /**
   * Get user-friendly field labels
   */
  private getFieldLabel(controlName: string): string {
    const labels: { [key: string]: string } = {
      firstName: 'First name',
      lastName: 'Last name',
      email: 'Email',
      password: 'Password',
      confirmPassword: 'Confirm password'
    };
    return labels[controlName] || controlName;
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
   * Show success message and navigate
   */
  private async showSuccessMessage(): Promise<void> { /* deprecated replaced by toast */ }

  private async showSuccessToast(message: string = 'Account created!'): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 2500,
      position: 'bottom',
      color: 'success',
      icon: 'checkmark-circle-outline'
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
}
