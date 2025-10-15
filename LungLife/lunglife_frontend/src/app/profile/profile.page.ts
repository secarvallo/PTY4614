/**
 * Profile Page - User Profile Management
 * Displays user information and provides actions like logout.
 */
import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule, AlertController, MenuController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { AuthFacadeService } from 'src/app/auth/core/services';
import { LoggerService } from '../core/services/logger.service';
import { Subscription } from 'rxjs';
import { User } from 'src/app/auth/core/interfaces/auth.unified';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  // Updated to use the new unified style file
  styleUrls: [
    './profile.page.scss',
    '../theme/shared-layout.scss'
  ],
  standalone: true,
  imports: [IonicModule, CommonModule]
})
export class ProfilePage implements OnInit, OnDestroy {
  private authFacade = inject(AuthFacadeService);
  private router = inject(Router);
  private alertController = inject(AlertController);
  private logger = inject(LoggerService).createChild('ProfilePage');
  private menuCtrl = inject(MenuController);

  currentUser: User | null = null;
  loadingUser = true;
  private userSubscription?: Subscription;

  // Getters to simplify template logic and fix parsing errors
  get isEmailVerified(): boolean {
    return (this.currentUser as any)?.isEmailVerified === true;
  }

  get twoFAEnabled(): boolean {
    return (this.currentUser as any)?.twoFAEnabled === true;
  }

  get createdAt(): Date | string | undefined {
    return (this.currentUser as any)?.createdAt || (this.currentUser as any)?.created_at;
  }

  ngOnInit() {
    this.userSubscription = this.authFacade.user$.subscribe(user => {
      if (user) {
        this.currentUser = user;
        this.logger.debug('User data loaded into profile', { userId: user.id });
      }
      this.loadingUser = false;
    });
  }

  ngOnDestroy() {
    this.userSubscription?.unsubscribe();
  }

  /**
   * Navigate back to the previous page or dashboard
   */
  goBack(): void {
    // This could be improved with a navigation service
    this.router.navigate(['/dashboard']);
  }

  /**
   * Logs the user out
   */
  async logout(): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Cerrar Sesión',
      message: '¿Estás seguro de que quieres cerrar sesión?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
        },
        {
          text: 'Cerrar Sesión',
          handler: () => {
            this.authFacade.logout();
            this.router.navigate(['/auth/login'], { replaceUrl: true });
          },
        },
      ],
    });
    await alert.present();
  }

  /**
   * Format date for display
   */
  formatDate(date?: Date | string): string {
    if (!date) return 'N/A';
    const d = typeof date === 'string' ? new Date(date) : date;
    return isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString();
  }

  /**
   * Format date and time for display
   */
  formatDateTime(date?: Date | string): string {
    if (!date) return 'N/A';
    const d = typeof date === 'string' ? new Date(date) : date;
    return isNaN(d.getTime()) ? 'N/A' : d.toLocaleString();
  }

  /**
   * Show a modal with all user details
   */
  async showUserInfo(): Promise<void> {
    if (!this.currentUser) return;
    const alert = await this.alertController.create({
      header: 'Información del Perfil',
      message: `
        <strong>Nombre:</strong> ${this.currentUser.firstName} ${this.currentUser.lastName}<br>
        <strong>Email:</strong> ${this.currentUser.email}<br>
        <strong>Verificado:</strong> ${this.isEmailVerified ? 'Sí' : 'No'}<br>
        <strong>2FA:</strong> ${this.twoFAEnabled ? 'Activado' : 'Desactivado'}<br>
        <strong>Miembro Desde:</strong> ${this.formatDate(this.createdAt)}
      `,
      buttons: ['OK'],
    });

    await alert.present();
  }
}

