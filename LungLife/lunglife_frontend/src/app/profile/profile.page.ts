/**
 * Profile Page - User Profile Management (Simplified)
 * Ahora sin máquina de estados ni timers de fallback: el guard protege la ruta.
 */
import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule, AlertController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { AuthFacadeService, CoreAuthStore } from 'src/app/auth/core/services';
import { LoggerService } from '../core/services/logger.service';
import { Subscription } from 'rxjs';
import { take } from 'rxjs/operators';
import { User, UserProfile } from 'src/app/auth/core/interfaces/auth.unified';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule]
})
export class ProfilePage implements OnInit, OnDestroy {
  private authFacade = inject(AuthFacadeService);
  private coreStore = inject(CoreAuthStore);
  private router = inject(Router);
  private alertController = inject(AlertController);
  private logger = inject(LoggerService).createChild('ProfilePage');

  currentUser: User | null = null;
  userProfile: UserProfile | null = null;
  loadingUser = true;
  private subs: Subscription[] = [];

  ngOnInit() {
    const userSub = this.authFacade.user$.subscribe(user => {
      if (user) {
        this.currentUser = user;
        this.userProfile = user.profile ?? null;
        this.loadingUser = false;
        this.logger.info('Profile: user loaded', { email: user.email });
      } else {
        if (this.authFacade.isAuthenticatedSync()) {
          this.logger.debug('Profile: authenticated but user null -> bootstrap attempt (store)');
          this.coreStore.bootstrapSession().pipe(take(1)).subscribe();
        } else {
          this.loadingUser = false;
          this.router.navigate(['/auth/login'], { replaceUrl: true });
        }
      }
    });
    this.subs.push(userSub);
  }

  ngOnDestroy(): void { this.subs.forEach(s => s.unsubscribe()); }

  /**
   * Obtener nombre completo del usuario
   */
  getFullName(): string {
    if (!this.userProfile) return '';
    return `${this.userProfile.nombre ?? ''} ${this.userProfile.apellido ?? ''}`.trim();
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Cerrar Sesión',
      message: '¿Estás seguro de que deseas cerrar sesión?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Cerrar Sesión',
          handler: () => {
            this.authFacade.logout();
            this.router.navigate(['/auth/login']);
          }
        }
      ]
    });
    await alert.present();
  }

  /**
   * Obtener email del usuario
   */
  getEmail(): string { return this.currentUser?.email ?? ''; }

  /**
   * Obtener teléfono del usuario
   */
  getPhone(): string { return this.userProfile?.telefono ?? ''; }

  /**
   * Obtener fecha de nacimiento
   */
  getBirthDate(): string { return this.userProfile?.fecha_nacimiento ? this.formatDate(this.userProfile.fecha_nacimiento) : 'N/A'; }

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

  async showUserInfo(): Promise<void> {
    if (!this.currentUser) return;
    const created = (this.currentUser as any).createdAt || (this.currentUser as any).created_at;
    const lastLogin = (this.currentUser as any).lastLogin || (this.currentUser as any).last_login;
    const alert = await this.alertController.create({
      header: 'Profile Information',
      message: `
        <strong>Name:</strong> ${this.currentUser.firstName} ${this.currentUser.lastName}<br>
        <strong>Email:</strong> ${this.currentUser.email}<br>
        <strong>Verified:</strong> ${(this.currentUser as any).isEmailVerified ? 'Yes' : 'No'}<br>
        <strong>2FA:</strong> ${(this.currentUser as any).twoFAEnabled ? 'Enabled' : 'Disabled'}<br>
        <strong>Member Since:</strong> ${this.formatDate(created)}<br>
        <strong>Last Login:</strong> ${lastLogin ? this.formatDateTime(lastLogin) : 'N/A'}
      `,
      buttons: ['OK']
    });
    await alert.present();
  }

  goBack(): void { this.router.navigate(['/dashboard']); }
}
