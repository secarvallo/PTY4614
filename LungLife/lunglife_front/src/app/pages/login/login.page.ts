import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonItem,
  IonInput,
  IonButton,
  IonAlert,
  IonSpinner
} from '@ionic/angular/standalone';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { AppConstants } from '../../utils/constants';
import { LoginCredentials, AuthResponse } from '../../models/auth.model';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonItem,
    IonInput,
    IonButton,
    IonAlert,
    IonSpinner,
    ReactiveFormsModule
  ]
})
export class LoginPage {
  private formBuilder: FormBuilder = inject(FormBuilder);
  private authService: AuthService = inject(AuthService);
  private router: Router = inject(Router);

  loginForm = this.formBuilder.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(AppConstants.VALIDATION.PASSWORD.MIN_LENGTH)]]
  });

  isLoading = false;
  showAlert = false;
  alertHeader = '';
  alertMessage = '';

  async onSubmit(): Promise<void> {
    if (this.loginForm.valid) {
      this.isLoading = true;

      const credentials: LoginCredentials = {
        email: this.loginForm.value.email!,
        password: this.loginForm.value.password!
      };

      this.authService.login(credentials).subscribe({
        next: (response: AuthResponse) => {
          this.isLoading = false;

          if (response.success) {
            this.router.navigate(['/home']);
          } else {
            this.showAlertMessage('Error', response.message || AppConstants.ERROR_MESSAGES.INVALID_CREDENTIALS);
          }
        },
        error: (error: unknown) => {
          this.isLoading = false;
          this.showAlertMessage('Error', AppConstants.ERROR_MESSAGES.NETWORK_ERROR);
        }
      });
    } else {
      this.showAlertMessage('Formulario inválido', 'Por favor completa todos los campos correctamente.');
    }
  }

  navigateToRegister(): void {
    this.router.navigate(['/register']);
  }

  private showAlertMessage(header: string, message: string): void {
    this.alertHeader = header;
    this.alertMessage = message;
    this.showAlert = true;
  }
}
