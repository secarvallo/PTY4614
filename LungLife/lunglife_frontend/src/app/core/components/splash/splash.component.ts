import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LoadingSpinnerComponent } from 'src/app/auth/shared/components/loading-spinner/loading-spinner.component';
// Fixed duplicated 'app' segment in paths
import { AuthFacadeService } from 'src/app/auth/core/services';
import { AppInitService } from 'src/app/core/services/app-init.service';

@Component({
  selector: 'app-splash',
  standalone: true,
  template: `
  <div class="splash-container">
    <app-loading-spinner message="Preparando tu sesión..."></app-loading-spinner>
  </div>
  `,
  styles: [`
    .splash-container { display:flex; align-items:center; justify-content:center; height:100vh; width:100%; background: var(--ion-color-light,#f4f5f8); }
  `],
  imports: [CommonModule, LoadingSpinnerComponent]
})
export class SplashComponent implements OnInit {
  private router = inject(Router);
  private auth = inject(AuthFacadeService);
  private init = inject(AppInitService);

  ngOnInit(): void {
    // Poll hasta que la inicialización termine o se alcance un máximo
    const start = Date.now();
    const maxMs = 2500; // fallback breve
    const loop = () => {
      if (this.init.isInitializingSync() && (Date.now() - start) < maxMs) {
        requestAnimationFrame(loop);
        return;
      }
      // Decidir destino
      if (this.auth.requiresTwoFASync()) {
        this.router.navigateByUrl('/auth/verify-2fa', { replaceUrl: true });
      } else if (this.auth.isAuthenticatedSync()) {
        this.router.navigateByUrl('/dashboard', { replaceUrl: true });
      } else {
        this.router.navigateByUrl('/auth/login', { replaceUrl: true });
      }
    };
    loop();
  }
}
