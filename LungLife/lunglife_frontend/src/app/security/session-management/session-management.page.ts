import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, AlertController } from '@ionic/angular';
import { AuthFacadeService } from '../../auth/core/services';
import { UserSession } from '../../auth/core/interfaces/auth-advanced.interface';

@Component({
  selector: 'app-session-management',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './session-management.page.html',
  styleUrls: ['./session-management.page.scss']
})
export class SessionManagementPage implements OnInit {
  private authService = inject(AuthFacadeService);
  private alertController = inject(AlertController);

  sessions = this.authService.getUserSessions();
  loading = false;
  error: string | null = null;

  ngOnInit() {
    this.loadSessions();
  }

  loadSessions() {
    this.loading = true;
    this.error = null;

    this.authService.getUserSessions().subscribe({
      next: (sessions) => {
        this.loading = false;
        // Las sesiones ya están disponibles a través del observable
      },
      error: (error) => {
        this.loading = false;
        this.error = 'Error al cargar las sesiones';
      }
    });
  }

  refreshSessions() {
    this.loadSessions();
  }

  async revokeSession(session: UserSession) {
    const alert = await this.alertController.create({
      header: 'Cerrar Sesión',
      message: `¿Estás seguro de que quieres cerrar la sesión en "${session.deviceName}"?`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Cerrar Sesión',
          role: 'destructive',
          handler: () => {
            this.performRevokeSession(session.id);
          }
        }
      ]
    });

    await alert.present();
  }

  async revokeAllSessions() {
    const alert = await this.alertController.create({
      header: 'Cerrar Todas las Sesiones',
      message: 'Esto cerrará la sesión en todos los dispositivos excepto en el actual. ¿Continuar?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Cerrar Todas',
          role: 'destructive',
          handler: () => {
            this.performRevokeAllSessions();
          }
        }
      ]
    });

    await alert.present();
  }

  private performRevokeSession(sessionId: number | string) {
    const idStr = sessionId != null ? String(sessionId) : '';
    this.authService.revokeSession({ sessionId: idStr }).subscribe({
      next: () => { this.loadSessions(); },
      error: () => { this.error = 'Error al cerrar la sesión'; }
    });
  }

  private performRevokeAllSessions() {
    this.authService.revokeSession({ revokeAll: true }).subscribe({
      next: () => {
        this.loadSessions(); // Recargar la lista
      },
      error: (error) => {
        this.error = 'Error al cerrar las sesiones';
      }
    });
  }

  getDeviceIcon(deviceType: string): string {
    switch (deviceType) {
      case 'mobile':
        return 'phone-portrait-outline';
      case 'tablet':
        return 'tablet-portrait-outline';
      case 'desktop':
        return 'desktop-outline';
      default:
        return 'device-desktop-outline';
    }
  }

  getDeviceTypeLabel(deviceType: string): string {
    switch (deviceType) {
      case 'mobile':
        return 'Móvil';
      case 'tablet':
        return 'Tablet';
      case 'desktop':
        return 'Escritorio';
      case 'web':
        return 'Navegador Web';
      default:
        return 'Dispositivo';
    }
  }

  getLocationString(session: UserSession): string {
    const location = session.location;
    if (!location) return 'Ubicación desconocida';

    const parts = [];
    if (location.city) parts.push(location.city);
    if (location.region) parts.push(location.region);
    if (location.country) parts.push(location.country);

    return parts.length > 0 ? parts.join(', ') : 'Ubicación desconocida';
  }

  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  }
}
