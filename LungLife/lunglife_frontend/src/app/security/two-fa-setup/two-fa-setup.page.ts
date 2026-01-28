import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { AuthFacadeService } from '../../auth/core/services';
import { AuthValidators } from '../../auth/core/validators/auth-validators';
import { TwoFactorMethod } from '../../auth/core/interfaces/auth.unified';

@Component({
  selector: 'app-two-fa-setup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, IonicModule],
  templateUrl: './two-fa-setup.page.html',
  styleUrls: ['./two-fa-setup.page.scss']
})
export class TwoFaSetupPage implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthFacadeService);
  private router = inject(Router);

  currentStep: 'method' | 'totp' | 'sms' | 'email' | 'backup' = 'method';
  selectedMethod: 'totp' | 'sms' | 'email' | null = null;

  // TOTP específico
  qrCode: string | null = null;
  secretKey: string | null = null;

  // Códigos de respaldo
  backupCodes: string[] = [];
  codesConfirmed = false;

  // Estados
  loading = false;
  error: string | null = null;

  verificationForm: FormGroup = this.fb.group({
    code: ['', [Validators.required, AuthValidators.twoFactorCode()]]
  });

  ngOnInit() {
    // Verificar si el usuario ya tiene 2FA habilitado
    const user = this.authService.getCurrentUser();
    if (user?.twoFAEnabled) {
      this.router.navigate(['/security/2fa-settings']);
    }
  }

  startSetup() {
    if (!this.selectedMethod) return;

    this.loading = true;
    this.error = null;

    this.authService.setup2FA({ method: this.selectedMethod }).subscribe({
      next: (response) => {
        this.loading = false;
        if (response.success) {
          if (this.selectedMethod === 'totp') {
            this.qrCode = response.qrCode || null;
            this.secretKey = response.secret || null;
            this.backupCodes = response.backupCodes || [];
            this.currentStep = 'totp';
          } else {
            this.currentStep = this.selectedMethod as typeof this.currentStep; // explicit cast
          }
        } else {
          this.error = response.error || 'Error al configurar 2FA';
        }
      },
      error: (error) => {
        this.loading = false;
        this.error = 'Error de conexión';
      }
    });
  }

  verifySetup() {
    if (!this.verificationForm.valid) return;

    this.loading = true;
    this.error = null;

    const code = this.verificationForm.get('code')?.value;

    this.authService.verify2FA({ code, isBackupCode: false }).subscribe({
      next: (response) => {
        this.loading = false;
        if (response.success) {
          this.currentStep = 'backup';
        } else {
          this.error = response.error || 'Código incorrecto';
        }
      },
      error: (error) => {
        this.loading = false;
        this.error = 'Error al verificar código';
      }
    });
  }

  copySecret() {
    if (this.secretKey) {
      navigator.clipboard.writeText(this.secretKey);
      // Mostrar toast de confirmación
    }
  }

  downloadCodes() {
    const content = this.backupCodes.join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lunglife-backup-codes.txt';
    a.click();
    window.URL.revokeObjectURL(url);
  }

  printCodes() {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head><title>Códigos de Respaldo - LungLife</title></head>
          <body>
            <h2>Códigos de Respaldo - LungLife</h2>
            <p>Guarda estos códigos en un lugar seguro:</p>
            <ul>
              ${this.backupCodes.map(code => `<li>${code}</li>`).join('')}
            </ul>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  }

  completeSetup() {
    this.router.navigate(['/security/2fa-settings'], {
      queryParams: { success: 'true' }
    });
  }
}
