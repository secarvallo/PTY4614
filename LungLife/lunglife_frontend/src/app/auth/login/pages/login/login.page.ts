import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { IonicModule, AlertController, LoadingController } from '@ionic/angular';
import {CommonModule, NgOptimizedImage} from '@angular/common';
import { Subject, takeUntil } from 'rxjs';

import { AuthFacadeService } from '../../../core/services';
import { LazyStyleLoaderService } from '../../../core/services/lazy-style-loader.service';
import { ThemeToggleComponent } from '../../../shared/components/theme-toggle/theme-toggle.component';
import { AuthCredentials } from '../../../core/interfaces/auth.unified';

/**
 * 🔐 Login Page - Clean Architecture Implementation
 * Uses Facade Pattern for simplified authentication
 * Implements Observer Pattern for reactive state management
 */
@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss', '../../../auth.styles.scss'],
  standalone: true,
  imports: [IonicModule, ReactiveFormsModule, CommonModule, NgOptimizedImage, ThemeToggleComponent]
})
export class LoginPage implements OnInit, OnDestroy {
  // Dependency Injection
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private authFacade = inject(AuthFacadeService);
  private lazyStyleLoader = inject(LazyStyleLoaderService);
  private alertController = inject(AlertController);
  private loadingController = inject(LoadingController);

  // Reactive Form
  loginForm!: FormGroup;

  // Component State
  showPassword = false;
  private destroy$ = new Subject<void>();

  // Observable State from AuthObserver (Observer Pattern)
  authState$ = this.authFacade.getAuthState();

  ngOnInit() {
    this.initializeForm();
    this.subscribeToAuthState();
    this.loadAuthStyles();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load authentication styles lazily for better performance
   */
  private async loadAuthStyles(): Promise<void> {
    try {
      await this.lazyStyleLoader.loadAuthStyles();
    } catch (error) {
      console.warn('Failed to load auth styles lazily, using fallback');
    }
  }

  /**
   * Initialize reactive form with validation
   */
  private initializeForm(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      rememberMe: [false]
    });
  }

  /**
   * Subscribe to authentication state changes (Observer Pattern)
   */
  private subscribeToAuthState(): void {
    // Navigate on successful authentication
    this.authState$.isAuthenticated$
      .pipe(takeUntil(this.destroy$))
      .subscribe((isAuthenticated: boolean) => {
        if (isAuthenticated) {
          this.router.navigate(['/dashboard']);
        }
      });

    // Navigate to 2FA verification if required
    this.authState$.requiresTwoFA$
      .pipe(takeUntil(this.destroy$))
      .subscribe((requires2FA: boolean) => {
        if (requires2FA) {
          this.router.navigate(['/auth/verify-2fa']);
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
   * 🔐 Handle login form submission
   * Uses Facade Pattern for simplified authentication
   */
  async onLogin(): Promise<void> {
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
      const credentials: AuthCredentials = this.loginForm.value;
      this.authFacade.login(credentials).subscribe({
        next: (result) => {
          loading.dismiss();
          if (!result.success) {
            console.error('Login failed:', result.error);
          }
          // Auth state changes will be handled by the auth observer
        },
        error: (error) => {
          loading.dismiss();
          console.error('Login error:', error);
        }
      });
    } catch (error) {
      loading.dismiss();
      console.error('Login error:', error);
    }
  }

  /**
   * Toggle password visibility
   */
  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  /**
   * Navigate to registration page
   */
  goToRegister(): void {
    this.router.navigate(['/auth/register']);
  }

  /**
   * Navigate to forgot password page
   */
  goToForgotPassword(): void {
    this.router.navigate(['/auth/forgot']);
  }

  /**
   * Navigate to Google authentication
   */
  loginWithGoogle(): void {
    // This would be handled by a GoogleStrategy in the future
    this.showInfoAlert('Google Login', 'Google authentication will be implemented soon.');
  }

  /**
   * Navigate to Facebook authentication (placeholder)
   */
  loginWithFacebook(): void {
    this.showInfoAlert('Facebook Login', 'Facebook authentication will be implemented soon.');
  }

  /**
   * Navigate to Apple authentication (placeholder)
   */
  loginWithApple(): void {
    this.showInfoAlert('Apple Login', 'Apple authentication will be implemented soon.');
  }

  /**
   * Get form control for template access
   */
  getFormControl(controlName: string) {
    return this.loginForm.get(controlName);
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

    return 'Invalid input';
  }

  /**
   * Get user-friendly field labels
   */
  private getFieldLabel(controlName: string): string {
    const labels: { [key: string]: string } = {
      email: 'Email',
      password: 'Password'
    };
    return labels[controlName] || controlName;
  }

  /**
   * Mark all form controls as touched for validation display
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

}
