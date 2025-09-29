import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthFacadeService } from '../../../core/services';

/**
 * Component for the "Forgot Password" page.
 * Provides functionality for users to request a password reset email.
 */
@Component({
  selector: 'app-forgot',
  templateUrl: './forgot.page.html',
  styleUrls: ['./forgot.page.scss', '../../../auth.styles.scss'],
  standalone: true,
  imports: [IonicModule, FormsModule, CommonModule, RouterLink]
})
export class ForgotPage implements OnInit {
  // Router service for navigation between pages
  private router = inject(Router);
  // AuthFacadeService for handling authentication-related operations
  private authFacade = inject(AuthFacadeService);

  // User's email input
  email = '';
  // Indicates whether a request is in progress
  isLoading = false;
  // Message to be displayed to the user
  message = '';
  // Indicates whether the last operation was successful
  isSuccess = false;

  ngOnInit() {}

  /**
   * Handles the password reset process.
   * Validates the email input, sends a password reset request, and displays appropriate messages.
   */
  async onSubmit(): Promise<void> {
    if (!this.email) {
      this.message = 'Por favor ingresa tu correo electrónico';
      this.isSuccess = false;
      return;
    }

    this.isLoading = true;
    this.message = '';

    try {
      this.authFacade.forgotPassword({ email: this.email }).subscribe({
        next: (result) => {
          this.isLoading = false;
          if (result.success) {
            this.message = 'Se ha enviado un enlace de recuperación a tu correo electrónico. Revisa tu bandeja de entrada.';
            this.isSuccess = true;
          } else {
            this.message = result.error || 'No se pudo enviar el correo de recuperación';
            this.isSuccess = false;
          }
        },
        error: (error) => {
          this.isLoading = false;
          console.error('Error in forgot password:', error);
          this.message = 'Ocurrió un error. Por favor, intenta nuevamente.';
          this.isSuccess = false;
        }
      });
    } catch (error) {
      this.isLoading = false;
      this.message = 'Ocurrió un error. Por favor, intenta nuevamente.';
      this.isSuccess = false;
    }
  }

  /**
   * Navigates to the login page.
   */
  goToLogin(): void {
    this.router.navigate(['/auth/login']);
  }
}
