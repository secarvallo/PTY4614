import {AppConstants} from './constants';
import {TokenPayload} from '../models/auth.model';

/**
 * Utilidades modernas para la aplicación
 */

export class Helpers {

  /**
   * Valida formato de email
   */
  static readonly isValidEmail = (email: string): boolean => {
    return AppConstants.VALIDATION.EMAIL.PATTERN.test(email);
  };

  /**
   * Valida fortaleza de contraseña
   */
  static readonly isStrongPassword = (password: string): { isValid: boolean; errors: string[] } => {
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

    return {isValid: errors.length === 0, errors};
  };

  /**
   * Decodifica token JWT
   */
  static readonly decodeJWT = (token: string): TokenPayload | null => {
    try {
      const payload = token.split('.')[1];
      const decoded = atob(payload);
      return JSON.parse(decoded);
    } catch {
      console.error('Error decoding JWT');
      return null;
    }
  };

  /**
   * Verifica si token está expirado
   */
  static readonly isTokenExpired = (token: string): boolean => {
    const payload = this.decodeJWT(token);
    return !payload?.exp || payload.exp < Math.floor(Date.now() / 1000);
  };

  /**
   * Calcula tiempo hasta expiración
   */
  static readonly getTokenExpiryTime = (token: string): number => {
    const payload = this.decodeJWT(token);
    if (!payload?.exp) return 0;

    return (payload.exp - Math.floor(Date.now() / 1000)) * 1000;
  };

  /**
   * Maneja errores de manera consistente
   */
  static readonly handleError = (error: unknown): string => {
    if (typeof error === 'string') return error;

    if (error && typeof error === 'object') {
      const err = error as any;
      if (err?.error?.message) return err.error.message;
      if (err?.message) return err.message;
    }

    return AppConstants.ERROR_MESSAGES.GENERIC_ERROR;
  };

  /**
   * Formatea errores de API
   */
  static readonly formatApiErrors = (errors: Record<string, string[]>): string[] => {
    const formattedErrors: string[] = [];

    for (const [field, messages] of Object.entries(errors)) {
      for (const message of messages) {
        formattedErrors.push(`${this.capitalizeFirst(field)}: ${message}`);
      }
    }

    return formattedErrors;
  };

  /**
   * Capitaliza primera letra
   */
  static readonly capitalizeFirst = (str: string): string => {
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  /**
   * Genera ID único
   */
  static readonly generateId = (): string => {
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  };
}
