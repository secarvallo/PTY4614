/**
 * 👤 Profile Page - User Profile Management
 * Protected route for user profile settings
 */

import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule, AlertController } from '@ionic/angular';
import { CommonModule } from '@angular/common';

import { AuthFacadeService } from 'src/app/auth/core/services';
import { User } from 'src/app/auth/core/interfaces/auth.unified';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule]
})
export class ProfilePage implements OnInit {
  private authFacade = inject(AuthFacadeService);
  private router = inject(Router);
  private alertController = inject(AlertController);

  currentUser: User | null = null;

  ngOnInit() {
    this.loadUserProfile();
  }

  private loadUserProfile(): void {
    this.currentUser = this.authFacade.getCurrentUser();
    if (!this.currentUser) {
      this.router.navigate(['/auth/login']);
    }
  }

  /**
   * Format date for display
   */
  formatDate(date: Date | string): string {
    if (!date) return 'N/A';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString();
  }

  /**
   * Format date and time for display
   */
  formatDateTime(date: Date | string): string {
    if (!date) return 'N/A';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleString();
  }

  async showUserInfo(): Promise<void> {
    if (!this.currentUser) return;

    const alert = await this.alertController.create({
      header: 'Profile Information',
      message: `
        <strong>Name:</strong> ${this.currentUser.firstName} ${this.currentUser.lastName}<br>
        <strong>Email:</strong> ${this.currentUser.email}<br>
        <strong>Verified:</strong> ${this.currentUser.isEmailVerified ? 'Yes' : 'No'}<br>
        <strong>2FA:</strong> ${this.currentUser.twoFAEnabled ? 'Enabled' : 'Disabled'}<br>
        <strong>Member Since:</strong> ${this.formatDate(this.currentUser.createdAt)}
      `,
      buttons: ['OK']
    });

    await alert.present();
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }
}
