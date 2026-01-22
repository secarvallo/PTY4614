import { Component, OnInit, OnDestroy, inject, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule, Validators, NonNullableFormBuilder } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IonicModule, LoadingController, ToastController, AlertController } from '@ionic/angular';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { addIcons } from 'ionicons';
import { shieldCheckmarkOutline } from 'ionicons/icons';
import { environment } from '../../../../../environments/environment';
import { passwordConfirmationValidator } from '../../../validators/password-confirmation.validator';
import {
  PasswordSecurityResult,
  SecurityValidationResult,
  RegisterFormData,
  RegisterRequestData,
  PasswordChecks,
  PasswordStrengthResult,
  PasswordSecurityStatus,
  RegisterComponentState,
  RegisterApiResponse,
  SecurityEvent,
  RegisterComponentConfig
} from './register.interface';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IonicModule, RouterLink],
  templateUrl: './register.page.html',
  styleUrls: [
    '../../../auth.styles.scss',
    '../../../../theme/shared-layout.scss',
    './register.page.scss'
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RegisterPage implements OnInit, OnDestroy {
  
  // Servicios inyectados
  private fb = inject(NonNullableFormBuilder);
  private router = inject(Router);
  private loadingController = inject(LoadingController);
  private toastController = inject(ToastController);
  private alertController = inject(AlertController);
  private http = inject(HttpClient);
  
  // Security services - Mock implementations for development
  // TODO: Replace with actual services when available
  private passwordValidator = {
    validatePasswordSecurity: async (password: string): Promise<PasswordSecurityResult> => ({
      isSecure: password.length >= 8,
      securityLevel: password.length >= 12 ? 'high' : password.length >= 8 ? 'medium' : 'low',
      breachStatus: { isBreached: false },
      recommendations: password.length < 12 ? [{ message: 'Considera usar una contraseña más larga para mayor seguridad' }] : []
    })
  };
  
  private securityAudit = {
    logSecurityEvent: (event: SecurityEvent) => {
      console.log('Security event logged:', event);
      // In production, this would send to security audit service
    },
    validateRegistrationAttempt: (data: any): SecurityValidationResult => ({
      allowed: true,
      requiresAdditionalVerification: false,
      riskLevel: 'low',
      riskFactors: []
    })
  };

  constructor() {
    // Initialize icons for security shield indicator
    addIcons({ shieldCheckmarkOutline });
  }

  // UI State Signals
  showPassword = signal(false);
  showConfirmPassword = signal(false);
  loading = signal(false);
  error = signal<string | null>(null);
  
  // Security validation signals
  passwordSecurityResult = signal<PasswordSecurityResult | null>(null);
  securityValidationResult = signal<SecurityValidationResult | null>(null);
  breachCheckInProgress = signal(false);
  securityWarnings = signal<string[]>([]);
  
  // Form validation signals - enhanced with security
  isFormValid = computed(() => {
    if (!this.registerForm) return false;
    
    // El FormGroup ya incluye la validación de confirmación de contraseña
    const isFormValidBasic = this.registerForm.valid;
    
    // Security validation
    const securityResult = this.passwordSecurityResult();
    const isSecure = securityResult ? securityResult.isSecure : true;
    
    return isFormValidBasic && isSecure;
  });
  
  canSubmit = computed(() => {
    const validationResult = this.securityValidationResult();
    const isSecurityValid = validationResult ? validationResult.allowed : true;
    
    return this.isFormValid() && 
           !this.loading() && 
           !this.breachCheckInProgress() &&
           isSecurityValid;
  });

  isRateLimited = signal(false);
  
  // Password strength
  passwordStrength = computed(() => {
    const password = this.registerForm?.get('password')?.value || '';
    return this.calculatePasswordStrength(password);
  });

  // Password security status for visual indicator
  passwordSecurityStatus = computed(() => {
    const strength = this.passwordStrength();
    const password = this.registerForm?.get('password')?.value || '';
    
    // No mostrar indicador si no hay contraseña
    if (!password || password.length < 3) {
      return { show: false, color: '', level: '', cssClass: '' };
    }

    // Mapear strength a los colores y animaciones de Ionic
    const statusMap = {
      weak: { 
        color: 'warning', 
        level: 'weak', 
        cssClass: 'pulse-warning',
        show: true 
      },
      medium: { 
        color: 'tertiary', 
        level: 'medium', 
        cssClass: 'pulse-tertiary',
        show: true 
      },
      strong: { 
        color: 'success', 
        level: 'strong', 
        cssClass: 'pulse-success',
        show: true 
      }
    };

    return statusMap[strength.strength] || { show: false, color: '', level: '', cssClass: '' };
  });

  // Getter para template compatibility
  get passwordChecks() {
    const strength = this.passwordStrength();
    return strength.checks;
  }

  // Form con validador personalizado para confirmación de contraseña
  registerForm: FormGroup = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
    apellido: ['', [Validators.maxLength(50)]],
    email: ['', [Validators.required, Validators.email]],
    telefono: [''],
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(128)]],
    confirmPassword: ['', [Validators.required]],
    acceptTerms: [false, [Validators.requiredTrue]],
    acceptPrivacy: [false, [Validators.requiredTrue]],
    acceptMarketing: [false]
  }, { 
    validators: [passwordConfirmationValidator()] // Validador a nivel de FormGroup
  });

  private destroy$ = new Subject<void>();

  ngOnInit() {
    // Validación de seguridad optimizada con debounce para mejor rendimiento
    this.registerForm.get('password')?.valueChanges
      .pipe(
        debounceTime(500), // Espera 500ms después de la última pulsación
        distinctUntilChanged(), // Solo emite si el valor ha cambiado
        takeUntil(this.destroy$)
      )
      .subscribe(async (password) => {
        // Validación de seguridad en tiempo real
        if (password && password.length >= 8) {
          await this.validatePasswordSecurity(password);
        } else {
          this.passwordSecurityResult.set(null);
        }
      });
      
    // Auditar el inicio de sesión de registro
    this.securityAudit.logSecurityEvent({
      type: 'info',
      action: 'registration_page_viewed',
      details: { referrer: document.referrer }
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Advanced password security validation
  private async validatePasswordSecurity(password: string): Promise<void> {
    if (!password || password.length < 8) {
      this.passwordSecurityResult.set(null);
      return;
    }

    this.breachCheckInProgress.set(true);
    
    try {
      const securityResult = await this.passwordValidator.validatePasswordSecurity(password);
      this.passwordSecurityResult.set(securityResult);
      
      // Update security warnings
      const warnings = securityResult.recommendations?.map((r: any) => r.message) || [];
      this.securityWarnings.set(warnings);
      
      // Log security check
      this.securityAudit.logSecurityEvent({
        type: 'password_breach',
        action: 'security_check_completed',
        details: {
          isBreached: securityResult.breachStatus.isBreached,
          breachCount: securityResult.breachStatus.count,
          securityLevel: securityResult.securityLevel,
          entropyScore: securityResult.entropyScore
        },
        riskLevel: securityResult.breachStatus.isBreached ? 'high' : 'low'
      });
      
    } catch (error) {
      console.error('Error validating password security:', error);
      this.securityWarnings.set(['No se pudo verificar la seguridad de la contraseña']);
    } finally {
      this.breachCheckInProgress.set(false);
    }
  }

  // Password strength calculation
  private calculatePasswordStrength(password: string): PasswordStrengthResult {
    const checks: PasswordChecks = {
      minLength: password.length >= 8 && password.length <= 128,
      maxLength: password.length <= 128,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\?]/.test(password)
    };

    const score = Object.values(checks).filter(check => check).length;
    
    let strength: 'weak' | 'medium' | 'strong' = 'weak';
    if (score >= 6) strength = 'strong';
    else if (score >= 4) strength = 'medium';

    return {
      score,
      strength,
      checks,
      isValid: checks.minLength && checks.uppercase && checks.lowercase && 
               checks.number && checks.special
    };
  }

  // UI Event Handlers
  togglePassword() { 
    this.showPassword.update(current => !current); 
  }
  
  toggleConfirmPassword() { 
    this.showConfirmPassword.update(current => !current); 
  }

  // Validation helper
  isFieldInvalid(field: string): boolean {
    const ctrl = this.registerForm.get(field);
    return !!ctrl && ctrl.invalid && (ctrl.dirty || ctrl.touched);
  }

  // Método eliminado: validatePasswordConfirmation()
  // Ahora se usa el validador personalizado passwordConfirmationValidator a nivel de FormGroup

  // Main registration flow
  async onSubmit(): Promise<void> {
    if (!this.canSubmit()) {
      this.markAllFieldsAsTouched();
      return;
    }

    await this.performRegistration();
  }

  // Advanced registration method with comprehensive security
  private async performRegistration(): Promise<void> {
    const formData = this.registerForm.value as RegisterFormData;
    
    // STEP 1: Security validation of attempt
    const validationResult = this.securityAudit.validateRegistrationAttempt({
      email: formData.email,
      password: formData.password,
      nombre: formData.nombre,
      apellido: formData.apellido || '',
      telefono: formData.telefono || ''
    });
    
    this.securityValidationResult.set(validationResult);
    
    // Block if security validation fails
    if (!validationResult.allowed) {
      await this.showSecurityBlockedMessage(validationResult);
      return;
    }
    
    // Show additional verification if required
    if (validationResult.requiresAdditionalVerification) {
      const additionalVerificationPassed = await this.showAdditionalVerification(validationResult);
      if (!additionalVerificationPassed) {
        return;
      }
    }

    const loading = await this.loadingController.create({
      message: 'Creando tu cuenta de forma segura...',
      spinner: 'crescent'
    });
    await loading.present();

    this.loading.set(true);
    this.error.set(null);

    try {
      // STEP 2: Advanced sanitization
      const sanitizedData: RegisterRequestData = {
        nombre: this.advancedSanitizeInput(formData.nombre),
        apellido: this.advancedSanitizeInput(formData.apellido),
        email: this.advancedSanitizeInput(formData.email),
        telefono: this.advancedSanitizeInput(formData.telefono),
        password: formData.password, // Don't sanitize passwords
        acceptTerms: formData.acceptTerms,
        acceptPrivacy: formData.acceptPrivacy,
        acceptMarketing: formData.acceptMarketing
      };

      // STEP 3: Final password security check
      const finalPasswordCheck = await this.passwordValidator.validatePasswordSecurity(formData.password);
      if (finalPasswordCheck.breachStatus.isBreached && (finalPasswordCheck.breachStatus.count || 0) > 1000) {
        throw new Error('SECURITY_BREACH_DETECTED');
      }

      // STEP 4: Make API call
      const result = await this.http.post<RegisterApiResponse>(`${environment.apiUrl}/auth/register`, sanitizedData).toPromise();
      
      await loading.dismiss();
      this.loading.set(false);

      if (result?.success) {
        // Log successful registration
        this.securityAudit.logSecurityEvent({
          type: 'registration_attempt',
          action: 'registration_successful',
          details: {
            email: this.maskEmail(sanitizedData.email),
            securityLevel: finalPasswordCheck.securityLevel
          },
          riskLevel: 'low'
        });
        
        await this.showSuccessMessage();
        await this.navigateToLogin(result);
      } else {
        this.error.set(result?.error || 'Error durante el registro');
      }

    } catch (error: any) {
      await loading.dismiss();
      this.loading.set(false);
      
      // Log security events
      this.securityAudit.logSecurityEvent({
        type: 'registration_attempt',
        action: 'registration_failed',
        details: {
          error: error.message,
          statusCode: error.status
        },
        riskLevel: error.message === 'SECURITY_BREACH_DETECTED' ? 'critical' : 'medium'
      });
      
      // Handle specific error cases with enhanced security messaging
      if (error.message === 'SECURITY_BREACH_DETECTED') {
        this.error.set('Por seguridad, no se permite esta contraseña. Ha sido comprometida en múltiples brechas.');
      } else if (error?.status === 429) {
        this.error.set('Demasiados intentos. Intenta nuevamente en unos minutos.');
        this.isRateLimited.set(true);
      } else if (error?.status === 409) {
        this.error.set('Ya existe una cuenta con este email.');
      } else {
        this.error.set('Error inesperado durante el registro');
      }
    }
  }

  // Basic input sanitization
  private sanitizeInput(input: string): string {
    if (!input) return input;
    
    return input
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim();
  }

  // Advanced input sanitization with deeper security checks
  private advancedSanitizeInput(input: string): string {
    if (!input) return input;
    
    return input
      .replace(/<[^>]*>/g, '') // Remove all HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '') // Remove event handlers
      .replace(/data:/gi, '') // Remove data URLs
      .replace(/vbscript:/gi, '') // Remove vbscript
      .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
      .replace(/[<>"'&]/g, (char) => {
        const escapeMap: { [key: string]: string } = {
          '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;', '&': '&amp;'
        };
        return escapeMap[char] || char;
      })
      .trim();
  }

  // Mask email for security logging
  private maskEmail(email: string): string {
    if (!email || !email.includes('@')) return 'invalid';
    const [local, domain] = email.split('@');
    return `${local.substr(0, 2)}***@${domain}`;
  }

  // UI Helpers
  private async showSuccessMessage(): Promise<void> {
    const toast = await this.toastController.create({
      message: 'Cuenta creada exitosamente! Revisa tu email para verificar tu cuenta.',
      duration: 4000,
      position: 'top',
      color: 'success'
    });
    await toast.present();
  }

  private async navigateToLogin(result: any): Promise<void> {
    const email = this.registerForm.get('email')?.value;
    this.router.navigate(['/auth/login'], { 
      queryParams: { email }
    });
  }

  private markAllFieldsAsTouched(): void {
    Object.keys(this.registerForm.controls).forEach(key => {
      const ctrl = this.registerForm.get(key);
      ctrl?.markAsTouched();
      ctrl?.updateValueAndValidity();
    });
  }

  // Alias para compatibilidad con el template existente
  onRegister(): Promise<void> {
    return this.onSubmit();
  }

  // Security UI methods
  private async showSecurityBlockedMessage(validationResult: SecurityValidationResult): Promise<void> {
    const alert = await this.alertController.create({
      header: '🛡️ Acceso Bloqueado por Seguridad',
      message: `
        <p>Tu intento de registro ha sido bloqueado por las siguientes razones de seguridad:</p>
        <ul>
          ${validationResult.riskFactors.map(factor => `<li>${factor}</li>`).join('')}
        </ul>
        <p><strong>Nivel de riesgo:</strong> ${validationResult.riskLevel.toUpperCase()}</p>
      `,
      buttons: [
        {
          text: 'Entendido',
          role: 'cancel'
        },
        {
          text: 'Contactar Soporte',
          handler: () => {
            // Redirect to support or show contact info
            window.open('mailto:security@lunglife.com?subject=Acceso Bloqueado', '_blank');
          }
        }
      ]
    });
    
    await alert.present();
  }

  private async showAdditionalVerification(validationResult: SecurityValidationResult): Promise<boolean> {
    return new Promise(async (resolve) => {
      const alert = await this.alertController.create({
        header: '🔐 Verificación Adicional Requerida',
        message: `
          <p>Por tu seguridad, necesitamos verificación adicional:</p>
          <p><strong>Motivo:</strong> ${validationResult.riskFactors.join(', ')}</p>
          <p>Por favor, resuelve esta verificación simple:</p>
          <p><strong>¿Cuánto es 7 + 5?</strong></p>
        `,
        inputs: [
          {
            name: 'verification',
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
            handler: (data) => {
              const answer = parseInt(data.verification);
              if (answer === 12) {
                resolve(true);
              } else {
                this.error.set('Respuesta incorrecta. Intenta nuevamente.');
                resolve(false);
              }
            }
          }
        ]
      });
      
      await alert.present();
    });
  }

  // Getters para template compatibility
  get rateLimitMessage(): string {
    return 'Demasiados intentos de registro. Por favor espera antes de intentar nuevamente.';
  }

  get securityWarningsList(): string[] {
    return this.securityWarnings();
  }

  get passwordSecurityLevel(): string {
    const result = this.passwordSecurityResult();
    return result ? result.securityLevel : 'unknown';
  }

  get isPasswordBreached(): boolean {
    const result = this.passwordSecurityResult();
    return result ? result.breachStatus.isBreached : false;
  }

  /**
   * Theme Toggle Methods
   */
  
}