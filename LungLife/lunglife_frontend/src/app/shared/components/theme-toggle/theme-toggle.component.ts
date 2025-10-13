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

  onToggleChange(event: any): void {
    // Solo cambia si el estado actual es diferente al toggle
    const isDark = event.detail.checked;
    const currentTheme = this.themeService.getCurrentTheme();
    
    if ((isDark && currentTheme === 'light') || (!isDark && currentTheme === 'dark')) {
      this.themeService.toggleTheme();
    }
  }
}