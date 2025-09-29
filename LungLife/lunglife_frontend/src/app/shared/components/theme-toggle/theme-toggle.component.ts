import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-theme-toggle',
  templateUrl: './theme-toggle.component.html',
  styleUrls: ['./theme-toggle.component.scss'],
  standalone: true,
  imports: [IonicModule, AsyncPipe]
})
export class ThemeToggleComponent {
  private themeService = inject(ThemeService);
  
  theme$ = this.themeService.theme$;
  
  toggleTheme(): void {
    this.themeService.toggleTheme();
  }
}