/**
 * 🌙 Theme Service
 * Manages light/dark theme switching for the application
 */

import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type AppTheme = 'light' | 'dark';

const STORAGE_KEY = 'app.theme.preference';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly media = window.matchMedia('(prefers-color-scheme: dark)');
  private readonly subject = new BehaviorSubject<AppTheme>(this.readInitialTheme());
  public readonly theme$ = this.subject.asObservable();

  constructor() {
    // Apply initial theme
    this.applyTheme(this.subject.value);

    // Keep in sync with OS only if user has not set an explicit preference
    if (!localStorage.getItem(STORAGE_KEY)) {
      this.bindMediaListener();
    }
  }

  /**
   * Get current theme
   */
  get current(): AppTheme {
    return this.subject.value;
  }

  /**
   * Set theme and apply to document
   */
  setTheme(theme: AppTheme): void {
    localStorage.setItem(STORAGE_KEY, theme);
    this.unbindMediaListener();
    this.subject.next(theme);
    this.applyTheme(theme);
  }

  /**
   * Toggle between light and dark themes
   */
  toggleTheme(): void {
    this.setTheme(this.current === 'dark' ? 'light' : 'dark');
  }

  private readInitialTheme(): AppTheme {
    const saved = localStorage.getItem(STORAGE_KEY) as AppTheme | null;
    if (saved === 'light' || saved === 'dark') return saved;
    return this.media.matches ? 'dark' : 'light';
  }

  /**
   * Apply theme to document
   */
  private applyTheme(theme: AppTheme): void {
    document.documentElement.setAttribute('data-theme', theme);
  }

  private mediaListener = (e: MediaQueryListEvent) => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      const theme: AppTheme = e.matches ? 'dark' : 'light';
      this.subject.next(theme);
      this.applyTheme(theme);
    }
  };

  private bindMediaListener() {
    if (this.media.addEventListener) this.media.addEventListener('change', this.mediaListener);
    else (this.media as any).addListener?.(this.mediaListener);
  }
  private unbindMediaListener() {
    if (this.media.removeEventListener) this.media.removeEventListener('change', this.mediaListener);
    else (this.media as any).removeListener?.(this.mediaListener);
  }
}
