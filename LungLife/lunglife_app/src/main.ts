import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';
import { initializeApp } from 'firebase/app';

// Auto-apply dark theme based on saved preference or OS and keep it in sync
(() => {
  const STORAGE_KEY = 'app.theme.preference';
  const saved = (localStorage.getItem(STORAGE_KEY) || '').toLowerCase();
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const apply = (isDark: boolean) => document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');

  if (saved === 'dark' || saved === 'light') {
    apply(saved === 'dark');
  } else {
    apply(media.matches);
    if (media.addEventListener) media.addEventListener('change', (e) => apply(e.matches));
    else (media as any).addListener?.((e: MediaQueryListEvent) => apply(e.matches));
  }
})();

bootstrapApplication(AppComponent, appConfig);
