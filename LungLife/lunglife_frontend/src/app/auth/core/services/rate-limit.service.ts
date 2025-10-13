import { Injectable, signal } from '@angular/core';

export interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
  cooldownMs: number;
  storageKey: string;
}

export interface RateLimitState {
  attempts: number;
  lastAttempt: number;
  isLimited: boolean;
  timeRemaining: number;
}

export interface AntiBot {
  question: string;
  answer: number;
}

@Injectable({
  providedIn: 'root'
})
export class RateLimitService {

  // Configuraciones predefinidas
  static readonly REGISTRATION_CONFIG: RateLimitConfig = {
    maxAttempts: 3,
    windowMs: 900000, // 15 minutos
    cooldownMs: 300000, // 5 minutos
    storageKey: 'lunglife_reg'
  };

  static readonly LOGIN_CONFIG: RateLimitConfig = {
    maxAttempts: 5,
    windowMs: 1800000, // 30 minutos
    cooldownMs: 900000, // 15 minutos
    storageKey: 'lunglife_login'
  };

  /**
   * Verificar si una operación está permitida según el rate limiting
   */
  checkRateLimit(config: RateLimitConfig): RateLimitState {
    const now = Date.now();
    const state = this.loadState(config.storageKey);
    
    // Resetear si ha pasado la ventana de tiempo
    if (now - state.lastAttempt > config.windowMs) {
      const newState: RateLimitState = {
        attempts: 0,
        lastAttempt: 0,
        isLimited: false,
        timeRemaining: 0
      };
      this.saveState(config.storageKey, newState);
      return newState;
    }
    
    // Verificar cooldown
    if (state.attempts >= config.maxAttempts) {
      const timeRemaining = config.cooldownMs - (now - state.lastAttempt);
      
      if (timeRemaining > 0) {
        return {
          ...state,
          isLimited: true,
          timeRemaining
        };
      } else {
        // Cooldown terminado
        const resetState: RateLimitState = {
          attempts: 0,
          lastAttempt: 0,
          isLimited: false,
          timeRemaining: 0
        };
        this.saveState(config.storageKey, resetState);
        return resetState;
      }
    }
    
    return {
      ...state,
      isLimited: false,
      timeRemaining: 0
    };
  }

  /**
   * Registrar un intento
   */
  recordAttempt(config: RateLimitConfig): RateLimitState {
    const now = Date.now();
    const currentState = this.loadState(config.storageKey);
    
    const newState: RateLimitState = {
      attempts: currentState.attempts + 1,
      lastAttempt: now,
      isLimited: false,
      timeRemaining: 0
    };
    
    this.saveState(config.storageKey, newState);
    return newState;
  }

  /**
   * Limpiar el estado de rate limiting (en caso de éxito)
   */
  clearRateLimit(config: RateLimitConfig): void {
    localStorage.removeItem(`${config.storageKey}_attempts`);
    localStorage.removeItem(`${config.storageKey}_last_attempt`);
  }

  /**
   * Obtener mensaje de error amigable para rate limiting
   */
  getRateLimitMessage(config: RateLimitConfig, timeRemaining: number): string {
    const minutesRemaining = Math.ceil(timeRemaining / 60000);
    const operationType = config.storageKey.includes('login') ? 'inicio de sesión' : 'registro';
    
    return `Demasiados intentos de ${operationType}. Intenta nuevamente en ${minutesRemaining} minuto${minutesRemaining !== 1 ? 's' : ''}.`;
  }

  /**
   * Determinar si se debe mostrar verificación anti-bot
   */
  shouldShowAntiBot(config: RateLimitConfig): boolean {
    const state = this.loadState(config.storageKey);
    return state.attempts >= 2; // Mostrar después de 2 intentos
  }

  /**
   * Generar pregunta anti-bot simple
   */
  generateAntiBotChallenge(): AntiBot {
    const challenges = [
      { question: '¿Cuánto es 5 + 3?', answer: 8 },
      { question: '¿Cuánto es 7 - 2?', answer: 5 },
      { question: '¿Cuánto es 4 × 2?', answer: 8 },
      { question: '¿Cuánto es 9 ÷ 3?', answer: 3 },
      { question: '¿Cuánto es 6 + 4?', answer: 10 },
      { question: '¿Cuánto es 8 - 3?', answer: 5 }
    ];
    
    return challenges[Math.floor(Math.random() * challenges.length)];
  }

  /**
   * Validar respuesta anti-bot
   */
  validateAntiBotAnswer(challenge: AntiBot, userAnswer: number): boolean {
    return challenge.answer === userAnswer;
  }

  /**
   * Cargar estado desde localStorage
   */
  private loadState(storageKey: string): RateLimitState {
    const attempts = parseInt(localStorage.getItem(`${storageKey}_attempts`) || '0');
    const lastAttempt = parseInt(localStorage.getItem(`${storageKey}_last_attempt`) || '0');
    
    return {
      attempts,
      lastAttempt,
      isLimited: false,
      timeRemaining: 0
    };
  }

  /**
   * Guardar estado en localStorage
   */
  private saveState(storageKey: string, state: RateLimitState): void {
    localStorage.setItem(`${storageKey}_attempts`, state.attempts.toString());
    localStorage.setItem(`${storageKey}_last_attempt`, state.lastAttempt.toString());
  }

  /**
   * Obtener estadísticas de rate limiting para debugging
   */
  getStatistics(config: RateLimitConfig): {
    attempts: number;
    lastAttempt: Date | null;
    timeUntilReset: number;
    isInCooldown: boolean;
  } {
    const state = this.loadState(config.storageKey);
    const now = Date.now();
    
    return {
      attempts: state.attempts,
      lastAttempt: state.lastAttempt ? new Date(state.lastAttempt) : null,
      timeUntilReset: Math.max(0, config.windowMs - (now - state.lastAttempt)),
      isInCooldown: state.attempts >= config.maxAttempts && (now - state.lastAttempt) < config.cooldownMs
    };
  }
}