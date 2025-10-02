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
import { AuthResponse } from '../../models/auth.model';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
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
export class RegisterPage {
  private formBuilder = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  registerForm = this.formBuilder.group({
    name: ['', [Validators.required, Validators.minLength(AppConstants.VALIDATION.NAME.MIN_LENGTH)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(AppConstants.VALIDATION.PASSWORD.MIN_LENGTH)]]
  });

  isLoading = false;
  showAlert = false;
  alertHeader = '';
  alertMessage = '';

  async onSubmit() {
    if (this.registerForm.valid) {
      this.isLoading = true;

      this.authService.register(this.registerForm.value as any).subscribe({
        next: (response: AuthResponse) => {
          this.isLoading = false;

          if (response.success) {
            this.showAlertMessage('Éxito', response.message || 'Cuenta creada correctamente');
            setTimeout(() => {
              this.router.navigate(['/home']);
            }, 1000);
          } else {
            this.showAlertMessage('Error', response.message || 'Error en el registro');
          }
        },
        error: () => {
          this.isLoading = false;
          this.showAlertMessage('Error', AppConstants.ERROR_MESSAGES.NETWORK_ERROR);
        }
      });
    } else {
      this.showAlertMessage('Formulario inválido', 'Por favor completa todos los campos correctamente.');
    }
  }

  navigateToLogin() {
    this.router.navigate(['/login']);
  }

  private showAlertMessage(header: string, message: string) {
    this.alertHeader = header;
    this.alertMessage = message;
    this.showAlert = true;
  }
}
