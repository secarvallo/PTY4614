import { Component, inject } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { NgIf, AsyncPipe } from '@angular/common';
import { AuthInitService } from './auth/core/services/auth-init.service';
import { ThemeToggleComponent } from './shared/components/theme-toggle/theme-toggle.component';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  imports: [IonApp, IonRouterOutlet, NgIf, AsyncPipe, ThemeToggleComponent],
})
export class AppComponent {
  private initSvc = inject(AuthInitService);
  isInitializing$ = this.initSvc.isInitializing();
}
