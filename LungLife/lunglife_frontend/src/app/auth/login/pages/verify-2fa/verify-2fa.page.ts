import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule, AlertController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthFacadeService } from '../../../core/services';
import { resolvePostAuthRedirect } from '../../../core/utils/auth-navigation';
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-verify-2fa',
  templateUrl: './verify-2fa.page.html',
  styleUrls: ['./verify-2fa.page.scss', '../../../auth.styles.scss'],
  standalone: true,
  imports: [IonicModule, FormsModule, CommonModule]
})
export class Verify2faPage implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private authFacade = inject(AuthFacadeService);
  private alertController = inject(AlertController);

  code = '';
  isLoading = false;
  errorMessage = '';
  userEmail = '';

  ngOnInit() {
    // If no pending 2FA requirement redirect away (guard should already prevent this)
    this.authFacade.requiresTwoFA$.pipe(take(1)).subscribe(requires => {
      if (!requires) {
        if (this.authFacade.isAuthenticatedSync()) {
          const resolved = resolvePostAuthRedirect(this.route.snapshot.queryParams['returnUrl']);
          this.router.navigateByUrl(resolved, { replaceUrl: true });
        } else {
          this.router.navigate(['/auth/login']);
        }
      }
    });

    const currentUser = this.authFacade.getCurrentUser();
    if (currentUser) this.userEmail = currentUser.email || '';
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
            // On success redirect to profile (state already updated)
            const resolved = resolvePostAuthRedirect(this.route.snapshot.queryParams['returnUrl']);
            this.router.navigateByUrl(resolved, { replaceUrl: true });
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
