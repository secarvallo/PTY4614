/**
 * 🏠 Dashboard Page - Protected Route Example
 * Demonstrates authenticated user interface with auth state management
 */

import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule, AlertController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';

import { AuthFacadeService } from 'src/app/auth/core/services';
import { User } from 'src/app/auth/core/interfaces/auth.unified';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule]
})
export class DashboardPage implements OnInit, OnDestroy {
  private authFacade = inject(AuthFacadeService);
  private router = inject(Router);
  private alertController = inject(AlertController);

  // Component State
  currentUser: User | null = null;
  private destroy$ = new Subject<void>();

  // Expose facade observables
  isAuthenticated$ = this.authFacade.isAuthenticated$;
  loading$ = this.authFacade.loading$;
  error$ = this.authFacade.error$;
  requiresTwoFA$ = this.authFacade.requiresTwoFA$;

  ngOnInit() {
    this.subscribeToAuthState();
    this.loadUserData();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Subscribe to authentication state changes
   */
  private subscribeToAuthState(): void {
    // Monitor authentication status
    this.authFacade.isAuthenticated$
      .pipe(takeUntil(this.destroy$))
      .subscribe((isAuthenticated: boolean) => {
        if (!isAuthenticated) {
          this.router.navigate(['/auth/login']);
        }
      });

    // Monitor user changes
    this.authFacade.user$
      .pipe(takeUntil(this.destroy$))
      .subscribe((user: User | null) => {
        this.currentUser = user;
      });
  }


  /**
   * Load additional user data
   */
  private loadUserData(): void {
    const user = this.authFacade.getCurrentUser();
    if (user) {
      // Ya viene normalizado desde el facade; aseguramos compatibilidad mínima
      this.ensureCompatibility(user);
      this.currentUser = user;
    }
  }

  private ensureCompatibility(user: User): void {
    // Rellenar camelCase si faltan (fallback a snake_case / profile)
    user.firstName = user.firstName ?? user.profile?.nombre ?? '';
    user.lastName = user.lastName ?? user.profile?.apellido ?? '';
    user.isEmailVerified = user.isEmailVerified ?? user.email_verified;
    user.twoFAEnabled = user.twoFAEnabled ?? user.two_fa_enabled;
    user.createdAt = user.createdAt ?? user.created_at;
    user.updatedAt = user.updatedAt ?? user.updated_at;
    user.lastLogin = user.lastLogin ?? user.last_login;
    user.isActive = user.isActive ?? user.is_active;
    user.phone = user.phone ?? user.profile?.telefono;
    user.birthDate = user.birthDate ?? user.profile?.fecha_nacimiento;
    user.avatar = user.avatar ?? user.profile?.avatar_url;
  }

  /**
   * Handle user logout
   */
  async onLogout(): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Confirm Logout',
      message: 'Are you sure you want to sign out?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Sign Out',
          handler: () => {
            this.authFacade.logout();
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Navigate to profile settings
   */
  goToProfile(): void {
    this.router.navigate(['/profile']);
  }

  /**
   * Navigate to 2FA settings
   */
  goTo2FASettings(): void {
    this.router.navigate(['/security/2fa']);
  }

  /**
   * Show user info
   */
  async showUserInfo(): Promise<void> {
    if (!this.currentUser) return;

    const created = this.currentUser.createdAt || this.currentUser.created_at;
    const alert = await this.alertController.create({
      header: 'User Information',
      message: `
        <strong>Name:</strong> ${this.currentUser.firstName} ${this.currentUser.lastName}<br>
        <strong>Email:</strong> ${this.currentUser.email}<br>
        <strong>Verified:</strong> ${this.currentUser.isEmailVerified ? 'Yes' : 'No'}<br>
        <strong>2FA:</strong> ${this.currentUser.twoFAEnabled ? 'Enabled' : 'Disabled'}<br>
        <strong>Joined:</strong> ${created ? new Date(created).toLocaleDateString() : 'N/A'}
      `,
      buttons: ['OK']
    });

    await alert.present();
  }

  /**
   * Get greeting based on time of day
   */
  getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }

  /**
   * Get user display name
   */
  getUserDisplayName(): string {
    if (!this.currentUser) return 'User';
    return `${this.currentUser.firstName} ${this.currentUser.lastName}`;
  }
}
