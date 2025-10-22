/**
 * 🔒 Two-FA Settings Page - 2FA Management
 * Protected route for managing two-factor authentication
 */

import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule, AlertController, LoadingController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { AuthFacadeService } from 'src/app/auth/core/services';
import { User } from 'src/app/auth/core/interfaces/auth.unified';

@Component({
  selector: 'app-two-fa-settings',
  templateUrl: './two-fa-settings.page.html',
  styleUrls: ['./two-fa-settings.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, ReactiveFormsModule]
})
export class TwoFaSettingsPage implements OnInit {
  private authFacade = inject(AuthFacadeService);
  private router = inject(Router);
  private alertController = inject(AlertController);
  private loadingController = inject(LoadingController);
  private formBuilder = inject(FormBuilder);

  currentUser: User | null = null;
  qrCodeData: string | null = null;
  backupCodes: string[] = [];

  ngOnInit() {
    this.loadUserProfile();
  }

  private loadUserProfile(): void {
    this.currentUser = this.authFacade.getCurrentUser();
    if (!this.currentUser) {
      this.router.navigate(['/auth/login']);
    }
  }

  setup2FA(): void {
    this.loadingController.create({
      message: 'Setting up 2FA...'
    }).then(loading => {
      loading.present();

      this.authFacade.setup2FA().subscribe({
        next: (setup) => {
          loading.dismiss();
          if (setup && typeof setup === 'object' && setup.success) {
            this.qrCodeData = (setup.metadata as any)?.qrCode || null;
            this.backupCodes = (setup.metadata as any)?.backupCodes || [];

            this.alertController.create({
              header: '2FA Setup Complete',
              message: 'Scan the QR code with your authenticator app and save your backup codes.',
              buttons: ['OK']
            }).then(alert => alert.present());
          } else {
            this.alertController.create({
              header: 'Error',
              message: setup?.error || 'Failed to set up two-factor authentication. Please try again.',
              buttons: ['OK']
            }).then(alert => alert.present());
          }
        },
        error: (error) => {
          loading.dismiss();
          console.error('Error setting up 2FA:', error);
          this.alertController.create({
            header: 'Error',
            message: 'Failed to set up two-factor authentication. Please try again.',
            buttons: ['OK']
          }).then(alert => alert.present());
        }
      });
    });
  }

  /**
   * Disables two-factor authentication after confirmation
   */
  async disable2FA(): Promise<void> {
    // Ask for password confirmation
    const alert = await this.alertController.create({
      header: 'Disable 2FA',
      message: 'For security purposes, please enter your password to disable two-factor authentication.',
      inputs: [
        {
          name: 'password',
          type: 'password',
          placeholder: 'Enter your password'
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Disable',
          handler: (data: any) => {
            if (!data.password) {
              return false; // Keep dialog open if no password
            }

            return new Promise((resolve) => {
              const loading = this.loadingController.create({
                message: 'Disabling 2FA...'
              }).then(loading => loading.present());

              this.authFacade.disable2FA(data.password).subscribe({
                next: (result) => {
                  this.loadingController.dismiss();
                  if (result.success) {
                    // Update UI
                    if (this.currentUser) {
                      this.currentUser.twoFAEnabled = false;
                    }
                    this.qrCodeData = null;
                    this.backupCodes = [];

                    this.alertController.create({
                      header: '2FA Disabled',
                      message: 'Two-factor authentication has been disabled for your account.',
                      buttons: ['OK']
                    }).then(alert => alert.present());
                    resolve(true); // Close dialog on success
                  } else {
                    this.alertController.create({
                      header: 'Error',
                      message: result.error || 'Failed to disable 2FA. Please try again.',
                      buttons: ['OK']
                    }).then(alert => alert.present());
                    resolve(false); // Keep dialog open on failure
                  }
                },
                error: (error) => {
                  this.loadingController.dismiss();
                  console.error('Error disabling 2FA:', error);
                  this.alertController.create({
                    header: 'Error',
                    message: 'An unexpected error occurred. Please try again.',
                    buttons: ['OK']
                  }).then(alert => alert.present());
                  resolve(false); // Keep dialog open on error
                }
              });
            });
          }
        }
      ]
    });

    await alert.present();
  }

  goBack(): void {
    // Navegar de vuelta al perfil cuando venimos del perfil
    this.router.navigate(['/profile']);
  }
}
