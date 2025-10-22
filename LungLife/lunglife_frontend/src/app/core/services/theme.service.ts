import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

// Define el tipo fuera de la clase para que sea reutilizable
export type AppTheme = 'light' | 'dark';

// Define la constante para la clave de almacenamiento
const STORAGE_KEY = 'app-theme';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  // BehaviorSubject para mantener y emitir el estado actual del tema. Privado.
  private themeSubject = new BehaviorSubject<AppTheme>(this.getInitialTheme());

  // Observable público para que los componentes se suscriban a los cambios del tema.
  public theme$ = this.themeSubject.asObservable();

  constructor() {
    // Aplica el tema inicial al cargar el servicio
    this.applyTheme(this.themeSubject.value);
    // Escucha los cambios del tema del sistema operativo
    this.listenToSystemChanges();
  }

  /**
   * Cambia el tema actual entre 'light' y 'dark'.
   */
  public toggleTheme(): void {
    const currentTheme = this.getCurrentTheme();
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    localStorage.setItem(STORAGE_KEY, newTheme);
    this.applyTheme(newTheme);
    this.themeSubject.next(newTheme);
  }

  /**
   * Obtiene el tema actual directamente desde el BehaviorSubject.
   */
  public getCurrentTheme(): AppTheme {
    return this.themeSubject.value;
  }

  /**
   * Aplica el tema al DOM, afectando al <html>, <body> y <ion-app>.
   * @param theme El tema a aplicar ('light' o 'dark').
   */
  private applyTheme(theme: AppTheme): void {
    // Aplica el tema al elemento raíz para que las variables CSS globales funcionen
    document.documentElement.setAttribute('data-theme', theme);

    // Aplica las clases directamente al body para compatibilidad
    document.body.classList.remove('dark', 'light');
    document.body.classList.add(theme);

    // También aplica las clases al componente raíz de Ionic para asegurar consistencia
    const ionApp = document.querySelector('ion-app');
    if (ionApp) { // Comprobación de nulos para seguridad
      ionApp.classList.remove('dark', 'light');
      ionApp.classList.add(theme);
    }
  }

  /**
   * Obtiene el tema inicial, priorizando el guardado en localStorage
   * y luego la preferencia del sistema.
   */
  private getInitialTheme(): AppTheme {
    const storedTheme = localStorage.getItem(STORAGE_KEY) as AppTheme | null;
    if (storedTheme) {
      return storedTheme;
    }
    
    // Si no hay nada guardado, usa la preferencia del sistema
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
  }

  /**
   * Configura un listener para detectar cambios en la preferencia de tema del sistema operativo.
   */
  private listenToSystemChanges(): void {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e: MediaQueryListEvent) => {
      // Solo actualiza si el usuario no ha elegido un tema manualmente
      if (!localStorage.getItem(STORAGE_KEY)) {
        const newTheme = e.matches ? 'dark' : 'light';
        this.applyTheme(newTheme);
        this.themeSubject.next(newTheme);
      }
    });
  }
}