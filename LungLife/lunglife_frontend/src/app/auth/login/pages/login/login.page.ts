import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IonicModule, AlertController, LoadingController } from '@ionic/angular';
import {CommonModule, NgOptimizedImage} from '@angular/common';
import { ThemeToggleComponent } from '../../../shared/components/theme-toggle/theme-toggle.component';
import { Subject, takeUntil } from 'rxjs';

import { AuthFacadeService } from '../../../core/services';
import { LoggerService } from 'src/app/core/services/logger.service';
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
  imports: [IonicModule, ReactiveFormsModule, CommonModule, NgOptimizedImage, RouterLink, ThemeToggleComponent]
})
export class LoginPage implements OnInit, OnDestroy {
  // Dependency Injection
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private authFacade = inject(AuthFacadeService);
  private alertController = inject(AlertController);
  private loadingController = inject(LoadingController);
  private logger = inject(LoggerService).createChild('LoginPage');

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
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
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
    // Navigate to 2FA verification if required
    this.authState$.requiresTwoFA$
      .pipe(takeUntil(this.destroy$))
      .subscribe((requires2FA: boolean) => {
        if (requires2FA) {
          this.logger.info('2FA required, navigating to verification');
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
          this.logger.debug('Attempting login', { email: (credentials as any).email });
      
      this.authFacade.login(credentials).subscribe({
        next: async (result) => {
          await loading.dismiss();
          this.logger.debug('Login result received', { success: result.success, hasUser: !!(result as any).user, requiresTwoFA: !!(result as any).requiresTwoFA });
          
          if (result.success) {
            this.logger.info('Login successful');
            
            // Check if 2FA is required
            if ((result as any).requiresTwoFA) {
              this.logger.info('2FA required (will navigate via subscription)');
              return;
            }
            // Si no vino usuario en la respuesta pero hay token, simplemente navegamos y el guard/otros flujos podrán hidratar posteriormente si es necesario.
            if (!(result as any).user) {
              this.logger.debug('No user in result; navigating optimistically to profile');
              this.navigateToProfile();
              return;
            }
            
            // Navegar reemplazando la URL para evitar volver con back
            this.logger.info('Navigating to profile (replaceUrl)');
            this.navigateToProfile();
            
          } else {
            this.logger.error('Login failed', result.error);
            this.showErrorAlert(result.error || 'Login failed');
          }
        },
        error: async (error) => {
          await loading.dismiss();
          this.logger.error('Login error', error);
          this.showErrorAlert('An error occurred during login');
        }
      });
    } catch (error) {
      await loading.dismiss();
  this.logger.error('Login catch error', error);
      this.showErrorAlert('An unexpected error occurred');
    }
  }

  /**
   * Toggle password visibility
   */
  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  /**
   * Navega a perfil con replaceUrl y logging unificado
   */
  private navigateToProfile(): void {
    this.router.navigate(['/profile'], { replaceUrl: true }).then(
      success => {
        if (success) {
          this.logger.info('Navigation to /profile successful');
        } else {
          this.logger.error('Navigation to /profile failed');
        }
      },
      error => this.logger.error('Navigation promise rejected', error)
    );
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
