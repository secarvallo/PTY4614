// src/app/utils/helpers.ts

import { AppConstants } from './constants';
import { TokenPayload } from '../models/auth.model';

/**
 * Utilidades generales para la aplicación
 */

export class Helpers {

  /**
   * Valida si un email tiene formato válido
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = AppConstants.VALIDATION.EMAIL.PATTERN;
    return emailRegex.test(email);
  }

  /**
   * Valida la fortaleza de una contraseña
   */
  static isStrongPassword(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < AppConstants.VALIDATION.PASSWORD.MIN_LENGTH) {
      errors.push(`La contraseña debe tener al menos ${AppConstants.VALIDATION.PASSWORD.MIN_LENGTH} caracteres`);
    }

    if (password.length > AppConstants.VALIDATION.PASSWORD.MAX_LENGTH) {
      errors.push(`La contraseña no puede tener más de ${AppConstants.VALIDATION.PASSWORD.MAX_LENGTH} caracteres`);
    }

    if (!AppConstants.VALIDATION.PASSWORD.PATTERN.test(password)) {
      errors.push('La contraseña debe incluir al menos una letra mayúscula, una minúscula y un número');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Decodifica un token JWT (sin verificar firma)
   */
  static decodeJWT(token: string): TokenPayload | null {
    try {
      const payload = token.split('.')[1];
      const decoded = atob(payload);
      return JSON.parse(decoded);
    } catch (error) {
      console.error('Error decoding JWT:', error);
      return null;
    }
  }

  /**
   * Verifica si un token JWT está expirado
   */
  static isTokenExpired(token: string): boolean {
    const payload = this.decodeJWT(token);
    if (!payload || !payload.exp) return true;

    const currentTime = Math.floor(Date.now() / 1000);
    return payload.exp < currentTime;
  }

  /**
   * Calcula el tiempo restante para que expire un token
   */
  static getTokenExpiryTime(token: string): number {
    const payload = this.decodeJWT(token);
    if (!payload || !payload.exp) return 0;

    const currentTime = Math.floor(Date.now() / 1000);
    return (payload.exp - currentTime) * 1000; // En milisegundos
  }

  /**
   * Formatea errores de API a mensajes legibles
   */
  static formatApiErrors(errors: Record<string, string[]>): string[] {
    const formattedErrors: string[] = [];

    for (const [field, messages] of Object.entries(errors)) {
      messages.forEach(message => {
        formattedErrors.push(`${this.capitalizeFirst(field)}: ${message}`);
      });
    }

    return formattedErrors;
  }

  /**
   * Capitaliza la primera letra de un string
   */
  static capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Genera un ID único simple
   */
  static generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Maneja errores de manera consistente
   */
  static handleError(error: any): string {
    if (typeof error === 'string') return error;

    if (error?.error?.message) {
      return error.error.message;
    }

    if (error?.message) {
      return error.message;
    }

    return AppConstants.ERROR_MESSAGES.GENERIC_ERROR;
  }
}
