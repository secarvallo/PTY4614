import {Component, inject, OnInit} from '@angular/core';
import {Router, RouterLink} from '@angular/router';
import {IonicModule} from '@ionic/angular';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {AuthFacadeService} from '../../../core/services';
import {
  ForgotPasswordRequest,
  ForgotPasswordState,
  ForgotPasswordErrors,
  ForgotPasswordMessages,
  ForgotPasswordConfig
} from './forgot.interface';

/**
 * Component for the "Forgot Password" page.
 * Provides functionality for users to request a password reset email.
 */
@Component({
  selector: 'app-forgot',
  templateUrl: './forgot.page.html',
  styleUrls: [
    '../../../auth.styles.scss',
    '../../../../theme/shared-layout.scss',
    './forgot.page.scss'
  ],
  standalone: true,
  imports: [IonicModule, FormsModule, CommonModule, RouterLink]
})
export class ForgotPage implements OnInit {
  // Router service for navigation between pages
  private router = inject(Router);
  // AuthFacadeService for handling authentication-related operations
  private authFacade = inject(AuthFacadeService);

  // Component state using interface
  public state: ForgotPasswordState = {
    email: '',
    isLoading: false,
    message: '',
    isSuccess: false,
    validationErrors: {}
  };

  // Configuration for messages and validation
  private readonly config: ForgotPasswordConfig = {
    validation: {
      email: {
        required: true,
        pattern: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        maxLength: 320
      }
    },
    messages: {
      validation: {
        emailRequired: 'Por favor ingresa tu correo electrónico',
        emailInvalid: 'El formato del correo electrónico no es válido'
      },
      feedback: {
        success: 'Se ha enviado un enlace de recuperación a tu correo electrónico. Revisa tu bandeja de entrada.',
        error: 'Ocurrió un error. Por favor, intenta nuevamente.',
        loading: 'Enviando enlace de recuperación...'
      },
      actions: {
        submit: 'Enviar Enlace',
        backToLogin: 'Volver al inicio'
      }
    },
    redirectDelay: 3000,
    enableAutoRedirect: false
  };

  // Getters for template access
  get email(): string {
    return this.state.email;
  }

  set email(value: string) {
    this.state.email = value;
    this.clearValidationError('email');
  }

  get isLoading(): boolean {
    return this.state.isLoading;
  }

  get message(): string {
    return this.state.message;
  }

  get isSuccess(): boolean {
    return this.state.isSuccess;
  }

  ngOnInit(): void {
    // Initialize component state
    this.resetForm();
  }

  /**
   * Validates email format using the configured pattern
   */
  private validateEmail(email: string): ForgotPasswordErrors {
    const errors: ForgotPasswordErrors = {};
    
    if (!email || email.trim() === '') {
      errors.email = this.config.messages.validation.emailRequired;
    } else if (!this.config.validation.email.pattern?.test(email)) {
      errors.email = this.config.messages.validation.emailInvalid;
    } else if (this.config.validation.email.maxLength && email.length > this.config.validation.email.maxLength) {
      errors.email = `El correo electrónico no puede tener más de ${this.config.validation.email.maxLength} caracteres`;
    }
    
    return errors;
  }

  /**
   * Clears validation error for a specific field
   */
  private clearValidationError(field: keyof ForgotPasswordErrors): void {
    this.state.validationErrors = {
      ...this.state.validationErrors,
      [field]: undefined
    };
  }

  /**
   * Resets the form to initial state
   */
  private resetForm(): void {
    this.state = {
      email: '',
      isLoading: false,
      message: '',
      isSuccess: false,
      validationErrors: {}
    };
  }

  /**
   * Updates component state with new values
   */
  private updateState(updates: Partial<ForgotPasswordState>): void {
    this.state = { ...this.state, ...updates };
  }

  /**
   * Handles the password reset process with improved validation and error handling
   */
  async onSubmit(): Promise<void> {
    // Validate form
    const validationErrors = this.validateEmail(this.state.email);
    
    if (Object.keys(validationErrors).length > 0) {
      this.updateState({
        validationErrors,
        message: validationErrors.email || '',
        isSuccess: false
      });
      return;
    }

    // Clear previous state and start loading
    this.updateState({
      isLoading: true,
      message: '',
      validationErrors: {}
    });

    const request: ForgotPasswordRequest = { email: this.state.email };

    try {
      this.authFacade.forgotPassword(request).subscribe({
        next: (result) => {
          this.updateState({ isLoading: false });
          
          if (result.success) {
            this.updateState({
              message: this.config.messages.feedback.success,
              isSuccess: true
            });
            
            // Optional auto-redirect to login
            if (this.config.enableAutoRedirect && this.config.redirectDelay) {
              setTimeout(() => {
                this.goToLogin();
              }, this.config.redirectDelay);
            }
          } else {
            this.updateState({
              message: result.error || 'No se pudo enviar el correo de recuperación',
              isSuccess: false
            });
          }
        },
        error: (error) => {
          console.error('Error in forgot password:', error);
          this.updateState({
            isLoading: false,
            message: this.config.messages.feedback.error,
            isSuccess: false
          });
        }
      });
    } catch (error) {
      console.error('Unexpected error in forgot password:', error);
      this.updateState({
        isLoading: false,
        message: this.config.messages.feedback.error,
        isSuccess: false
      });
    }
  }

  /**
   * Navigates to the login page
   */
  goToLogin(): void {
    this.router.navigate(['/auth/login']);
  }
}
