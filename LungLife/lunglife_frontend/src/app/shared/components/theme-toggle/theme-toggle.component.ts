import { Component, inject } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { ThemeService } from '../../../core/services/theme.service';
import { addIcons } from 'ionicons';
import { moonOutline, sunnyOutline } from 'ionicons/icons';

@Component({
  selector: 'app-theme-toggle',
  templateUrl: './theme-toggle.component.html',
  styleUrls: ['./theme-toggle.component.scss'],
  standalone: true,
  imports: [IonicModule]
})
export class ThemeToggleComponent {
  private themeService = inject(ThemeService);
  
  theme$ = this.themeService.theme$;
  
  constructor() {
    addIcons({ moonOutline, sunnyOutline });
  }
  
  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  onToggleChange(event: any): void {
    const isChecked = event.detail.checked;
    this.themeService.toggleTheme();
  }
  
  // Método helper para obtener el tema actual de forma consistente
  getCurrentTheme(): string {
    if (typeof (this.themeService as any).getCurrentTheme === 'function') {
      return (this.themeService as any).getCurrentTheme();
    }
    return (this.themeService as any).current || 'light';
  }
  
  get isDarkMode(): boolean {
    return this.getCurrentTheme() === 'dark';
  }
}