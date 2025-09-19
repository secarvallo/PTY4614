import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { AuthFacadeService } from '../../../core/services';

@Component({
  selector: 'app-google-success',
  templateUrl: './google-success.page.html',
  styleUrls: ['./google-success.page.scss', '../../../auth.styles.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule]
})
export class GoogleSuccessPage implements OnInit {
  private router = inject(Router);
  private authFacade = inject(AuthFacadeService);

  message = 'Authentication successful!';
  countdown = 3;
  userInfo = {
    photoURL: null,
    nombre: 'Usuario',
    displayName: 'Usuario',
    email: 'user@example.com',
    emailVerified: true
  };

  ngOnInit() {
    this.loadUserInfo();
    this.startCountdown();
  }

  private loadUserInfo(): void {
    const currentUser = this.authFacade.getCurrentUser();
    if (currentUser) {
      this.userInfo = {
        photoURL: null,
        nombre: `${currentUser.firstName || ''} ${currentUser.lastName || ''}`,
        displayName: `${currentUser.firstName || ''} ${currentUser.lastName || ''}`,
        email: currentUser.email || '',
        emailVerified: currentUser.isEmailVerified || false
      };
    }
  }

  private startCountdown(): void {
    const interval = setInterval(() => {
      this.countdown--;
      if (this.countdown <= 0) {
        clearInterval(interval);
        this.router.navigate(['/dashboard']);
      }
    }, 1000);
  }

  continueToApp(): void {
    this.router.navigate(['/dashboard']);
  }

  logout(): void {
    this.authFacade.logout();
    this.router.navigate(['/auth/login']);
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }
}
