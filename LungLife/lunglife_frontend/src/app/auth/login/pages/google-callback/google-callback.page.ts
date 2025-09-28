import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { AuthFacadeService } from '../../../core/services';

@Component({
  selector: 'app-google-callback',
  templateUrl: './google-callback.page.html',
  styleUrls: ['./google-callback.page.scss', '../../../auth.styles.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule]
})
export class GoogleCallbackPage implements OnInit {
  private router = inject(Router);
  private authFacade = inject(AuthFacadeService);

  message = 'Procesando autenticación...';

  ngOnInit() {
    this.handleGoogleCallback();
  }

  private async handleGoogleCallback(): Promise<void> {
    try {
      // Por ahora, solo redirigir al dashboard
      // En una implementación real, esto manejaría el callback de Google OAuth
      setTimeout(() => {
        this.router.navigate(['/dashboard']);
      }, 2000);
    } catch (error) {
      console.error('Error en callback de Google:', error);
      this.message = 'Error en la autenticación. Redirigiendo a login...';
      setTimeout(() => {
        this.router.navigate(['/auth/login']);
      }, 3000);
    }
  }
}
