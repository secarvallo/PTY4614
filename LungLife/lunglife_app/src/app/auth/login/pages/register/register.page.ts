import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { IonicModule, AlertController, LoadingController } from '@ionic/angular';
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
  imports: [IonicModule, ReactiveFormsModule, CommonModule]
})
export class RegisterPage implements OnInit, OnDestroy {
  // Dependency Injection
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private authFacade = inject(AuthFacadeService);
  private validationService = inject(ValidationService);
  private alertController = inject(AlertController);
  private loadingController = inject(LoadingController);

  // Reactive Form
  registerForm!: FormGroup;

  // Component State
  showPassword = false;
  showConfirmPassword = false;
  passwordValidation: PasswordValidationResult | null = null;
  private destroy$ = new Subject<void>();

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
    // Navigate on successful registration
    this.authState$.isAuthenticated$
      .pipe(takeUntil(this.destroy$))
      .subscribe((isAuthenticated: boolean) => {
        if (isAuthenticated) {
          this.showSuccessMessage();
        }
      });

    // Handle errors
    this.authState$.error$
      .pipe(takeUntil(this.destroy$))
      .subscribe((error: string | null) => {
        if (error) {
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

    // Additional password validation
    if (this.passwordValidation && !this.passwordValidation.isValid) {
      await this.showErrorAlert('Please fix password requirements before continuing.');
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Creating your account...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      const formValue = this.registerForm.value;
      const registerData: RegisterData = {
        username: formValue.username, // Ensure username is included
        email: formValue.email,
        password: formValue.password,
        firstName: formValue.firstName,
        lastName: formValue.lastName,
        acceptTerms: formValue.acceptTerms
      };

      this.authFacade.register(registerData).subscribe({
        next: (result) => {
          loading.dismiss();
          if (!result.success) {
            console.error('Registration failed:', result.error);
          }
          // Auth state changes will be handled by the auth observer
        },
        error: (error) => {
          loading.dismiss();
          console.error('Registration error:', error);
        }
      });
    } catch (error) {
      loading.dismiss();
      console.error('Registration error:', error);
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
  private async showSuccessMessage(): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Registration Successful!',
      message: 'Please check your email to verify your account.',
      buttons: [{
        text: 'OK',
        handler: () => {
          this.router.navigate(['/auth/login']);
        }
      }],
      cssClass: 'success-alert'
    });
    await alert.present();
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
