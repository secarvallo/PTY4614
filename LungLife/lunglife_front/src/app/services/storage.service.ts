import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class StorageService {

  /**
   * Almacena un valor en localStorage
   */
  setItem(key: string, value: any): void {
    try {
      const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);
      localStorage.setItem(key, serializedValue);
    } catch (error) {
      console.error('Error storing data in localStorage:', error);
    }
  }

  /**
   * Obtiene un valor de localStorage
   */
  getItem<T = any>(key: string): T | null {
    try {
      const item = localStorage.getItem(key);
      if (!item) return null;

      // Intentar parsear como JSON, si falla devolver como string
      try {
        return JSON.parse(item) as T;
      } catch {
        return item as T;
      }
    } catch (error) {
      console.error('Error retrieving data from localStorage:', error);
      return null;
    }
  }

  /**
   * Elimina un valor de localStorage
   */
  removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing data from localStorage:', error);
    }
  }

  /**
   * Limpia todo el almacenamiento
   */
  clear(): void {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
  }

  /**
   * Verifica si una clave existe
   */
  hasItem(key: string): boolean {
    return localStorage.getItem(key) !== null;
  }

  /**
   * Obtiene todas las claves del almacenamiento
   */
  getKeys(): string[] {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) keys.push(key);
    }
    return keys;
  }

  /**
   * Almacenamiento seguro con expiración (opcional para futuro)
   */
  setItemWithExpiry(key: string, value: any, ttl: number): void {
    const now = new Date();
    const item = {
      value: value,
      expiry: now.getTime() + ttl
    };
    this.setItem(key, item);
  }

  /**
   * Obtención segura con expiración
   */
  getItemWithExpiry<T = any>(key: string): T | null {
    const item = this.getItem<{ value: T; expiry: number }>(key);

    if (!item) return null;

    const now = new Date().getTime();
    if (now > item.expiry) {
      this.removeItem(key);
      return null;
    }

    return item.value;
  }
}
