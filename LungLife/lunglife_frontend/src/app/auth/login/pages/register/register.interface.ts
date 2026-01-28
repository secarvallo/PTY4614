/**
 * 📝 Register Page Interfaces
 * Interfaces específicas para el componente de registro de usuario
 */

// ========== FORM INTERFACES ==========

/**
 * Datos del formulario de registro
 */
export interface RegisterFormData {
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
  acceptPrivacy: boolean;
  acceptMarketing: boolean;
}

/**
 * Datos sanitizados para envío a API
 */
export interface RegisterRequestData {
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  password: string;
  acceptTerms: boolean;
  acceptPrivacy: boolean;
  acceptMarketing: boolean;
}

/**
 * Errores de validación del formulario
 */
export interface RegisterFormErrors {
  nombre?: string[];
  apellido?: string[];
  email?: string[];
  telefono?: string[];
  password?: string[];
  confirmPassword?: string[];
  acceptTerms?: string[];
  acceptPrivacy?: string[];
  general?: string[];
}

// ========== PASSWORD STRENGTH INTERFACES ==========

/**
 * Verificaciones individuales de contraseña
 */
export interface PasswordChecks {
  minLength: boolean;
  maxLength: boolean;
  uppercase: boolean;
  lowercase: boolean;
  number: boolean;
  special: boolean;
}

/**
 * Resultado completo de análisis de fortaleza de contraseña
 */
export interface PasswordStrengthResult {
  score: number;
  strength: 'weak' | 'medium' | 'strong';
  checks: PasswordChecks;
  isValid: boolean;
}

// ========== API INTERFACES ==========

/**
 * Respuesta de la API de registro
 */
export interface RegisterApiResponse {
  success: boolean;
  message?: string;
  error?: string;
  data?: {
    userId: string;
    email: string;
    verificationRequired: boolean;
  };
}