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

  // Observable State from AuthObserver (Observer Pattern)
  authState$ = this.authFacade.getAuthState();

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
    this.authState$.isAuthenticated$
      .pipe(takeUntil(this.destroy$))
      .subscribe((isAuthenticated: boolean) => {
        if (!isAuthenticated) {
          this.router.navigate(['/auth/login']);
        }
      });

    // Monitor user changes
    this.authState$.user$
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
      this.currentUser = {
        id: user.id,
        email: user.email || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        isEmailVerified: user.isEmailVerified || false,
        twoFAEnabled: user.twoFAEnabled || false,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastLogin: user.lastLogin,
        phone: user.phone,
        birthDate: user.birthDate,
        isActive: user.isActive || true,
        avatar: user.avatar,
        role: user.role
      };
    }
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

    const alert = await this.alertController.create({
      header: 'User Information',
      message: `
        <strong>Name:</strong> ${this.currentUser.firstName} ${this.currentUser.lastName}<br>
        <strong>Email:</strong> ${this.currentUser.email}<br>
        <strong>Verified:</strong> ${this.currentUser.isEmailVerified ? 'Yes' : 'No'}<br>
        <strong>2FA:</strong> ${this.currentUser.twoFAEnabled ? 'Enabled' : 'Disabled'}<br>
        <strong>Joined:</strong> ${new Date(this.currentUser.createdAt).toLocaleDateString()}
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
