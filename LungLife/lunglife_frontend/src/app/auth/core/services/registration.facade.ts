import { Injectable, inject, signal } from '@angular/core';
import { AlertController } from '@ionic/angular';
import { Observable, from, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

import { RegistrationValidationService, ValidationResult, RegistrationData } from './registration-validation.service';
import { InputSanitizationService, SanitizedRegistrationData } from './input-sanitization.service';
import { RateLimitService, RateLimitConfig, AntiBot } from './rate-limit.service';
import { AuthFacadeService } from './application/auth-facade.service';

export interface RegistrationResult {
  success: boolean;
  user?: any;
  error?: string;
  requiresVerification?: boolean;
}

export interface RegistrationAttemptResult {
  canProceed: boolean;
  error?: string;
  requiresAntiBot?: boolean;
  antiBotChallenge?: AntiBot;
}

@Injectable({
  providedIn: 'root'
})
export class RegistrationFacade {
  
  private validationService = inject(RegistrationValidationService);
  private sanitizationService = inject(InputSanitizationService);
  private rateLimitService = inject(RateLimitService);
  private authFacade = inject(AuthFacadeService);
  private alertController = inject(AlertController);

  // Signals para estado reactivo
  private currentValidation = signal<ValidationResult | null>(null);
  private isRateLimited = signal(false);
  private rateLimitMessage = signal<string>('');

  // Getters públicos para los signals
  getCurrentValidation() { return this.currentValidation(); }
  getIsRateLimited() { return this.isRateLimited(); }
  getRateLimitMessage() { return this.rateLimitMessage(); }

  /**
   * Verificar si se puede proceder con el registro
   */
  async checkRegistrationAttempt(): Promise<RegistrationAttemptResult> {
    const config = RateLimitService.REGISTRATION_CONFIG;
    const rateLimitState = this.rateLimitService.checkRateLimit(config);

    if (rateLimitState.isLimited) {
      const message = this.rateLimitService.getRateLimitMessage(config, rateLimitState.timeRemaining);
      this.rateLimitMessage.set(message);
      this.isRateLimited.set(true);
      
      return {
        canProceed: false,
        error: message
      };
    }

    // Verificar si necesita anti-bot
    if (this.rateLimitService.shouldShowAntiBot(config)) {
      const challenge = this.rateLimitService.generateAntiBotChallenge();
      return {
        canProceed: false,
        requiresAntiBot: true,
        antiBotChallenge: challenge
      };
    }

    return { canProceed: true };
  }

  /**
   * Validar datos de registro
   */
  validateRegistration(formValue: Partial<RegistrationData>): ValidationResult {
    const validation = this.validationService.validateRegistrationForm(formValue);
    this.currentValidation.set(validation);
    return validation;
  }

  /**
   * Procesar y registrar usuario
   */
  registerUser(rawData: any): Observable<RegistrationResult> {
    return from(this.processRegistration(rawData));
  }

  /**
   * Verificar anti-bot challenge
   */
  async verifyAntiBot(challenge: AntiBot, userAnswer: number): Promise<boolean> {
    const isValid = this.rateLimitService.validateAntiBotAnswer(challenge, userAnswer);
    
    if (!isValid) {
      const alert = await this.alertController.create({
        header: 'Verificación Incorrecta',
        message: 'Respuesta incorrecta. Por favor, intenta nuevamente.',
        buttons: ['OK']
      });
      await alert.present();
    }

    return isValid;
  }

  /**
   * Mostrar challenge anti-bot
   */
  async showAntiBotChallenge(challenge: AntiBot): Promise<boolean> {
    return new Promise(async (resolve) => {
      const alert = await this.alertController.create({
        header: 'Verificación de Seguridad',
        message: `Por favor, confirma que no eres un robot: ${challenge.question}`,
        inputs: [
          {
            name: 'answer',
            type: 'number',
            placeholder: 'Ingresa tu respuesta'
          }
        ],
        buttons: [
          {
            text: 'Cancelar',
            role: 'cancel',
            handler: () => resolve(false)
          },
          {
            text: 'Verificar',
            handler: async (data) => {
              const answer = parseInt(data.answer);
              const isValid = await this.verifyAntiBot(challenge, answer);
              resolve(isValid);
            }
          }
        ]
      });
      await alert.present();
    });
  }

  /**
   * Limpiar estado de rate limiting (en caso de éxito)
   */
  clearRegistrationState(): void {
    this.rateLimitService.clearRateLimit(RateLimitService.REGISTRATION_CONFIG);
    this.isRateLimited.set(false);
    this.rateLimitMessage.set('');
  }

  /**
   * Obtener fortaleza de contraseña
   */
  getPasswordStrength(password: string) {
    return this.validationService.getPasswordStrength(password);
  }

  /**
   * Proceso completo de registro
   */
  private async processRegistration(rawData: any): Promise<RegistrationResult> {
    try {
      // 1. Verificar rate limiting
      const attemptResult = await this.checkRegistrationAttempt();
      if (!attemptResult.canProceed) {
        if (attemptResult.requiresAntiBot && attemptResult.antiBotChallenge) {
          const antiBotPassed = await this.showAntiBotChallenge(attemptResult.antiBotChallenge);
          if (!antiBotPassed) {
            return { success: false, error: 'Verificación anti-bot no completada' };
          }
        } else {
          return { success: false, error: attemptResult.error };
        }
      }

      // 2. Registrar intento
      this.rateLimitService.recordAttempt(RateLimitService.REGISTRATION_CONFIG);

      // 3. Sanitizar datos
      const sanitizedData = this.sanitizationService.sanitizeRegistrationData(rawData);

      // 4. Validar datos sanitizados
      const validation = this.validationService.validateRegistrationForm(sanitizedData);
      if (!validation.isValid) {
        const errorMessages = validation.errors.map(e => e.message).join(', ');
        return { success: false, error: `Datos inválidos: ${errorMessages}` };
      }

      // 5. Verificar inputs sospechosos
      const suspiciousChecks = [
        this.sanitizationService.detectSuspiciousInput(rawData.nombre || ''),
        this.sanitizationService.detectSuspiciousInput(rawData.apellido || ''),
        this.sanitizationService.detectSuspiciousInput(rawData.email || ''),
        this.sanitizationService.detectSuspiciousInput(rawData.telefono || '')
      ];

      const hasSuspiciousInput = suspiciousChecks.some(check => check.isSuspicious);
      if (hasSuspiciousInput) {
        return { 
          success: false, 
          error: 'Se detectó contenido sospechoso en los datos proporcionados' 
        };
      }

      // 6. Preparar datos para el backend
      const registrationPayload = {
        email: sanitizedData.email,
        password: sanitizedData.password,
        firstName: sanitizedData.nombre,
        lastName: sanitizedData.apellido,
        phone: sanitizedData.telefono || undefined,
        acceptTerms: sanitizedData.acceptTerms,
        acceptPrivacy: sanitizedData.acceptPrivacy,
        acceptMarketing: sanitizedData.acceptMarketing
      };

      // 7. Llamar al servicio de autenticación
      return new Promise((resolve) => {
        this.authFacade.register(registrationPayload).subscribe({
          next: (result) => {
            if (result.success) {
              // Limpiar rate limiting en caso de éxito
              this.clearRegistrationState();
              resolve({
                success: true,
                user: result.user,
                requiresVerification: true
              });
            } else {
              resolve({
                success: false,
                error: result.error || 'Error desconocido durante el registro'
              });
            }
          },
          error: (error) => {
            let errorMessage = 'Error inesperado durante el registro';
            
            if (error?.status === 409) {
              errorMessage = 'Este email ya está registrado';
            } else if (error?.status === 400) {
              errorMessage = 'Los datos proporcionados no son válidos';
            } else if (error?.status === 429) {
              errorMessage = 'Demasiados intentos. Intenta más tarde';
            }
            
            resolve({
              success: false,
              error: errorMessage
            });
          }
        });
      });

    } catch (error) {
      return {
        success: false,
        error: 'Error inesperado durante el procesamiento'
      };
    }
  }
}