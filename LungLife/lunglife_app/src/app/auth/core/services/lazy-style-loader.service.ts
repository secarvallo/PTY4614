/**
 * 🎨 Lazy Style Loader Service
 * Loads authentication styles only when needed to improve initial bundle size
 */

import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LazyStyleLoaderService {
  private loadedStyles = new Set<string>();

  /**
   * Load authentication styles lazily
   */
  async loadAuthStyles(): Promise<void> {
    if (this.loadedStyles.has('auth')) {
      return; // Already loaded
    }

    try {
      // Load the auth styles dynamically
      const styleUrl = 'assets/auth-styles.css';

      // Check if style is already in document
      const existingLink = document.querySelector(`link[href="${styleUrl}"]`);
      if (existingLink) {
        this.loadedStyles.add('auth');
        return;
      }

      // Create and append the stylesheet link
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = styleUrl;
      link.type = 'text/css';

      // Return a promise that resolves when the stylesheet loads
      return new Promise((resolve, reject) => {
        link.onload = () => {
          this.loadedStyles.add('auth');
          resolve();
        };
        link.onerror = () => {
          console.warn('Failed to load auth styles, falling back to inline styles');
          reject();
        };

        document.head.appendChild(link);
      });
    } catch (error) {
      console.warn('Error loading auth styles:', error);
      // Fallback: styles will be loaded via component stylesheets
    }
  }

  /**
   * Unload authentication styles (useful for logout)
   */
  unloadAuthStyles(): void {
    const styleUrl = 'assets/auth-styles.css';
    const link = document.querySelector(`link[href="${styleUrl}"]`);

    if (link) {
      document.head.removeChild(link);
      this.loadedStyles.delete('auth');
    }
  }

  /**
   * Check if auth styles are loaded
   */
  areAuthStylesLoaded(): boolean {
    return this.loadedStyles.has('auth');
  }
}