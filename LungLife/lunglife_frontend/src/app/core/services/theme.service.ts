import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type AppTheme = 'light' | 'dark';
const STORAGE_KEY = 'app-theme-preference';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private themeSubject = new BehaviorSubject<AppTheme>(this.getInitialTheme());
  public theme$ = this.themeSubject.asObservable();

  constructor() {
    this.applyTheme(this.themeSubject.value);
    this.listenToSystemChanges();
  }

  private getInitialTheme(): AppTheme {
    const storedTheme = localStorage.getItem(STORAGE_KEY) as AppTheme;
    if (storedTheme) {
      return storedTheme;
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  private applyTheme(theme: AppTheme): void {
    document.documentElement.setAttribute('data-theme', theme);
    document.body.classList.remove('dark', 'light');
    document.body.classList.add(theme);
  }

  public toggleTheme(): void {
    const newTheme = this.themeSubject.value === 'light' ? 'dark' : 'light';
    localStorage.setItem(STORAGE_KEY, newTheme);
    this.applyTheme(newTheme);
    this.themeSubject.next(newTheme);
  }

  public getCurrentTheme(): AppTheme {
    return this.themeSubject.value;
  }

  private listenToSystemChanges(): void {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      // Only apply system theme if no preference is saved
      if (!localStorage.getItem(STORAGE_KEY)) {
        const newTheme = e.matches ? 'dark' : 'light';
        this.applyTheme(newTheme);
        this.themeSubject.next(newTheme);
      }
    });
  }
}

