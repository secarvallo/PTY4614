import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule, AlertController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthFacadeService } from '../../../core/services';

@Component({
  selector: 'app-verify-2fa',
  templateUrl: './verify-2fa.page.html',
  styleUrls: ['./verify-2fa.page.scss', '../../../auth.styles.scss'],
  standalone: true,
  imports: [IonicModule, FormsModule, CommonModule]
})
export class Verify2faPage implements OnInit {
  private router = inject(Router);
  private authFacade = inject(AuthFacadeService);
  private alertController = inject(AlertController);

  code = '';
  isLoading = false;
  errorMessage = '';
  userEmail = '';

  ngOnInit() {
    // Check if user should be here
    const authState = this.authFacade.getAuthState();
    authState.requiresTwoFA$.subscribe((requires2FA: boolean) => {
      if (!requires2FA) {
        this.router.navigate(['/auth/login']);
      }
    });

    // Get current user email for display
    const currentUser = this.authFacade.getCurrentUser();
    if (currentUser) {
      this.userEmail = currentUser.email || '';
    }
  }

  async verify2FA(): Promise<void> {
    if (!this.code || this.code.length !== 6) {
      this.errorMessage = 'Por favor, ingresa un código válido de 6 dígitos';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    try {
      this.authFacade.verify2FA({ code: this.code }).subscribe({
        next: (result) => {
          this.isLoading = false;
          if (result.success) {
            // 2FA verification successful, user will be redirected by observer
            console.log('Verificación 2FA exitosa');
          } else {
            this.errorMessage = result.error || 'La verificación 2FA falló. Por favor, inténtalo de nuevo.';
          }
        },
        error: (error) => {
          this.isLoading = false;
          console.error('Error en la verificación 2FA:', error);
          this.errorMessage = 'La verificación falló. Por favor, inténtalo de nuevo.';
        }
      });
    } catch (error) {
      this.isLoading = false;
      console.error('Error en la verificación 2FA:', error);
      this.errorMessage = 'La verificación falló. Por favor, inténtalo de nuevo.';
    }
  }

  async useBackupCode(): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Código de Respaldo',
      message: 'Ingresa uno de tus códigos de respaldo:',
      inputs: [{
        name: 'backupCode',
        type: 'text',
        placeholder: 'Código de Respaldo'
      }],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Verificar',
          handler: async (data) => {
            if (data.backupCode) {
              this.code = data.backupCode;
              await this.verify2FA();
            }
          }
        }
      ]
    });

    await alert.present();
  }

  cancelLogin(): void {
    this.router.navigate(['/auth/login']);
  }

  goBack(): void {
    this.router.navigate(['/auth/login']);
  }
}
