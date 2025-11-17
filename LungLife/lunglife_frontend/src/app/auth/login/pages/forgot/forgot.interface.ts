/**
 * 📧 Forgot Password Page Interfaces
 * Interfaces específicas para el componente de recuperación de contraseña
 */

// ========== REQUEST INTERFACES ==========

/**
 * Datos requeridos para solicitar recuperación de contraseña
 */
export interface ForgotPasswordRequest {
  email: string;
}

/**
 * Configuración de validación para el formulario
 */
export interface ForgotPasswordValidation {
  email: {
    required: boolean;
    pattern?: RegExp;
    minLength?: number;
    maxLength?: number;
  };
}

// ========== RESPONSE INTERFACES ==========

/**
 * Resultado de la operación de forgot password
 */
export interface ForgotPasswordResult {
  success: boolean;
  message?: string;
  error?: string;
  requestId?: string;
}

// ========== COMPONENT STATE INTERFACES ==========

/**
 * Estado interno del componente forgot password
 */
export interface ForgotPasswordState {
  email: string;
  isLoading: boolean;
  message: string;
  isSuccess: boolean;
  validationErrors: ForgotPasswordErrors;
}

/**
 * Errores de validación específicos del formulario
 */
export interface ForgotPasswordErrors {
  email?: string;
  general?: string;
}

// ========== UI INTERFACES ==========

/**
 * Configuración de mensajes del componente
 */
export interface ForgotPasswordMessages {
  validation: {
    emailRequired: string;
    emailInvalid: string;
  };
  feedback: {
    success: string;
    error: string;
    loading: string;
  };
  actions: {
    submit: string;
    backToLogin: string;
  };
}

/**
 * Configuración de formulario y UI
 */
export interface ForgotPasswordConfig {
  validation: ForgotPasswordValidation;
  messages: ForgotPasswordMessages;
  redirectDelay?: number;
  enableAutoRedirect?: boolean;
}