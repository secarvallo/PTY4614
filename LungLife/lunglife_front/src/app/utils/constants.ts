export const AppConstants = {
  // Claves de almacenamiento
  STORAGE_KEYS: {
    AUTH_TOKEN: 'auth_token',
    USER_DATA: 'user_data',
    APP_SETTINGS: 'app_settings',
    LANGUAGE: 'app_language'
  },

  // Endpoints de API
  API_ENDPOINTS: {
    AUTH: {
      LOGIN: '/auth/login',
      REGISTER: '/auth/register',
      LOGOUT: '/auth/logout',
      REFRESH: '/auth/refresh',
      PROFILE: '/auth/profile'
    },
    USER: {
      BASE: '/users',
      PROFILE: '/users/profile',
      UPDATE: '/users/update',
      DELETE: '/users/delete'
    },
    USERS: {
      BASE: '/users',
      PROFILE: '/users/profile',
      UPDATE: '/users/update'
    }
  },

  // Validaciones
  VALIDATION: {
    PASSWORD: {
      MIN_LENGTH: 6,
      MAX_LENGTH: 128,
      PATTERN: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/ // Mínimo 1 mayúscula, 1 minúscula, 1 número
    },
    NAME: {
      MIN_LENGTH: 2,
      MAX_LENGTH: 50
    },
    EMAIL: {
      MAX_LENGTH: 255,
      PATTERN: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    }
  },

  // Mensajes de error
  ERROR_MESSAGES: {
    NETWORK_ERROR: 'Error de conexión. Por favor, verifica tu conexión a internet.',
    INVALID_CREDENTIALS: 'Email o contraseña incorrectos.',
    EMAIL_EXISTS: 'Este email ya está registrado.',
    PASSWORD_WEAK: 'La contraseña debe tener al menos 6 caracteres, incluyendo una mayúscula, una minúscula y un número.',
    PASSWORDS_NOT_MATCH: 'Las contraseñas no coinciden.',
    GENERIC_ERROR: 'Ha ocurrido un error inesperado. Por favor, intenta nuevamente.',
    SESSION_EXPIRED: 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.',
    UNAUTHORIZED: 'No tienes permisos para realizar esta acción.'
  },

  // Mensajes de éxito
  SUCCESS_MESSAGES: {
    REGISTER_SUCCESS: '¡Cuenta creada exitosamente! Ya puedes iniciar sesión.',
    LOGIN_SUCCESS: '¡Bienvenido de vuelta!',
    LOGOUT_SUCCESS: 'Sesión cerrada correctamente.',
    PROFILE_UPDATED: 'Perfil actualizado correctamente.'
  },

  // Configuración de la app
  APP_CONFIG: {
    TOKEN_EXPIRY_BUFFER: 5 * 60 * 1000, // 5 minutos antes de expirar
    MAX_RETRY_ATTEMPTS: 3,
    REQUEST_TIMEOUT: 30000 // 30 segundos
  }
} as const;

// Tipo para las claves de error
export type ErrorMessageKey = keyof typeof AppConstants.ERROR_MESSAGES;
