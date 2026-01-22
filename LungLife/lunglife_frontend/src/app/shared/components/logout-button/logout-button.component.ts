/**
 * Logout Button Component
 * Componente reutilizable para cerrar sesión con confirmación opcional
 * Funciona para todos los roles: PATIENT, DOCTOR, ADMINISTRATOR
 */
import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonicModule, AlertController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { logOutOutline, chevronForwardOutline } from 'ionicons/icons';
import { AuthFacadeService } from '../../../auth/core/services';

export type LogoutButtonStyle = 'card' | 'button' | 'icon' | 'menu-item';

@Component({
  selector: 'app-logout-button',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './logout-button.component.html',
  styleUrls: ['./logout-button.component.scss']
})
export class LogoutButtonComponent {
  private authFacade = inject(AuthFacadeService);
  private alertController = inject(AlertController);
  private router = inject(Router);

  // Configuración del componente
  @Input() buttonStyle: LogoutButtonStyle = 'card';
  @Input() showConfirmation: boolean = true;
  @Input() logoutAll: boolean = false;
  @Input() showText: boolean = true;
  @Input() color: string = 'danger';
  @Input() fill: 'clear' | 'outline' | 'solid' = 'clear';
  @Input() size: 'small' | 'default' | 'large' = 'default';

  constructor() {
    addIcons({ logOutOutline, chevronForwardOutline });
  }

  async handleLogout(): Promise<void> {
    if (this.showConfirmation) {
      await this.showConfirmationAlert();
    } else {
      this.performLogout();
    }
  }

  private async showConfirmationAlert(): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Cerrar Sesión',
      message: this.logoutAll 
        ? '¿Estás seguro que deseas cerrar sesión en todos tus dispositivos?' 
        : '¿Estás seguro que deseas cerrar sesión?',
      cssClass: 'logout-confirmation-alert',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
          cssClass: 'alert-button-cancel'
        },
        {
          text: 'Cerrar Sesión',
          role: 'confirm',
          cssClass: 'alert-button-confirm',
          handler: () => {
            this.performLogout();
          }
        }
      ]
    });

    await alert.present();
  }

  private performLogout(): void {
    // Llamar al servicio de logout
    this.authFacade.logout(this.logoutAll);
    
    // Navegar a la página de logout exitoso después de un pequeño delay
    // para asegurar que el estado se limpió
    setTimeout(() => {
      this.router.navigate(['/auth/logout-success'], { replaceUrl: true });
    }, 100);
  }
}
