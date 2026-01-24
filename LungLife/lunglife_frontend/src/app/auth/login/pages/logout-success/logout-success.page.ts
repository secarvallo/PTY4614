/**
 * Logout Success Page
 * Confirmation screen after successful logout
 */
import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { 
  checkmarkCircleOutline, 
  logInOutline, 
  homeOutline,
  shieldCheckmarkOutline,
  lockClosedOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-logout-success',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './logout-success.page.html',
  styleUrls: [
    '../../../auth.styles.scss',
    './logout-success.page.scss'
  ]
})
export class LogoutSuccessPage implements OnInit {
  
  private router = inject(Router);

  // Datos del usuario que cerró sesión (opcional, para mostrar mensaje personalizado)
  userName = signal<string>('');
  logoutTime = signal<string>('');

  constructor() {
    addIcons({ 
      checkmarkCircleOutline, 
      logInOutline, 
      homeOutline,
      shieldCheckmarkOutline,
      lockClosedOutline
    });
  }

  ngOnInit(): void {
    // Establecer la hora del logout
    const now = new Date();
    this.logoutTime.set(now.toLocaleTimeString('es-CL', { 
      hour: '2-digit', 
      minute: '2-digit' 
    }));

    // Obtener nombre del usuario si está disponible en el state
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras?.state) {
      const state = navigation.extras.state as { userName?: string };
      if (state.userName) {
        this.userName.set(state.userName);
      }
    }
  }

  goToLogin(): void {
    this.router.navigate(['/auth/login'], { replaceUrl: true });
  }

  goToHome(): void {
    this.router.navigate(['/'], { replaceUrl: true });
  }
}
