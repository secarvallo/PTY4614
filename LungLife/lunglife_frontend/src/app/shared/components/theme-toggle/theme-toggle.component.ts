import { Component, inject } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { ThemeService } from '../../../core/services/theme.service';

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
    // Debug: verificar qué servicio se está inyectando
    console.log('ThemeToggleComponent initialized with service:', {
      hasGetCurrentTheme: typeof (this.themeService as any).getCurrentTheme === 'function',
      hasCurrent: 'current' in this.themeService,
      service: this.themeService.constructor.name
    });
  }
  
  toggleTheme(): void {
    console.log('Toggle theme called');
    this.themeService.toggleTheme();
  }

  onToggleChange(event: any): void {
    const isChecked = event.detail.checked;
    
    // Debug: log para verificar el evento
    console.log('Toggle change event:', isChecked, 'Current theme:', this.getCurrentTheme());
    
    // Siempre llamar al toggle, el servicio se encarga de la lógica
    this.themeService.toggleTheme();
  }
  
  // Método helper para obtener el tema actual de forma consistente
  getCurrentTheme(): string {
    // Verificar si tiene el método getCurrentTheme (versión del core)
    if (typeof (this.themeService as any).getCurrentTheme === 'function') {
      return (this.themeService as any).getCurrentTheme();
    }
    // Si no, usar la propiedad current (versión de auth)
    return (this.themeService as any).current || 'light';
  }
  
  // Método helper para debugging
  get isDarkMode(): boolean {
    const theme = this.getCurrentTheme();
    console.log('isDarkMode check:', theme, 'result:', theme === 'dark');
    return theme === 'dark';
  }
}