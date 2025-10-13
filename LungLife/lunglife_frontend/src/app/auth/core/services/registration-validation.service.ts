import { Injectable } from '@angular/core';

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  code: string;
  message: string;
}

export interface ValidationWarning {
  field: string;
  code: string;
  message: string;
}

export interface RegistrationData {
  nombre: string;
  apellido?: string;
  email: string;
  telefono?: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
  acceptPrivacy: boolean;
  acceptMarketing?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class RegistrationValidationService {

  /**
   * Valida completamente los datos de registro
   */
  validateRegistrationForm(formValue: Partial<RegistrationData>): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validar nombre
    const nameValidation = this.validateName(formValue.nombre || '');
    if (!nameValidation.isValid) {
      errors.push({
        field: 'nombre',
        code: 'INVALID_NAME',
        message: nameValidation.message
      });
    }

    // Validar email
    const emailValidation = this.validateEmail(formValue.email || '');
    if (!emailValidation.isValid) {
      errors.push({
        field: 'email',
        code: 'INVALID_EMAIL',
        message: emailValidation.message
      });
    }

    // Validar contraseña
    const passwordValidation = this.validatePassword(formValue.password || '');
    if (!passwordValidation.isValid) {
      errors.push({
        field: 'password',
        code: 'INVALID_PASSWORD',
        message: passwordValidation.message
      });
    }

    // Validar confirmación de contraseña
    const confirmPasswordValidation = this.validatePasswordMatch(
      formValue.password || '', 
      formValue.confirmPassword || ''
    );
    if (!confirmPasswordValidation.isValid) {
      errors.push({
        field: 'confirmPassword',
        code: 'PASSWORD_MISMATCH',
        message: confirmPasswordValidation.message
      });
    }

    // Validar teléfono (opcional pero si se proporciona debe ser válido)
    if (formValue.telefono) {
      const phoneValidation = this.validatePhone(formValue.telefono);
      if (!phoneValidation.isValid) {
        warnings.push({
          field: 'telefono',
          code: 'INVALID_PHONE',
          message: phoneValidation.message
        });
      }
    }

    // Validar términos y condiciones
    if (!formValue.acceptTerms) {
      errors.push({
        field: 'acceptTerms',
        code: 'TERMS_NOT_ACCEPTED',
        message: 'Debe aceptar los términos y condiciones'
      });
    }

    if (!formValue.acceptPrivacy) {
      errors.push({
        field: 'acceptPrivacy',
        code: 'PRIVACY_NOT_ACCEPTED',
        message: 'Debe aceptar la política de privacidad'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validaciones individuales de campos
   */
  validateName(name: string): { isValid: boolean; message: string } {
    if (!name || name.trim().length === 0) {
      return { isValid: false, message: 'El nombre es requerido' };
    }

    if (name.trim().length < 2) {
      return { isValid: false, message: 'El nombre debe tener al menos 2 caracteres' };
    }

    if (name.trim().length > 50) {
      return { isValid: false, message: 'El nombre no puede tener más de 50 caracteres' };
    }

    // Validar caracteres permitidos (incluye acentos y caracteres especiales de nombres)
    const nameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]+$/;
    if (!nameRegex.test(name.trim())) {
      return { isValid: false, message: 'El nombre contiene caracteres no válidos' };
    }

    return { isValid: true, message: '' };
  }

  validateEmail(email: string): { isValid: boolean; message: string } {
    if (!email || email.trim().length === 0) {
      return { isValid: false, message: 'El email es requerido' };
    }

    // Regex más estricta para email RFC 5322 compliant
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    
    if (!emailRegex.test(email.trim())) {
      return { isValid: false, message: 'El formato del email no es válido' };
    }

    if (email.length > 254) {
      return { isValid: false, message: 'El email es demasiado largo' };
    }

    // Verificar dominios bloqueados/temporales
    const domain = email.split('@')[1]?.toLowerCase();
    const blockedDomains = [
      'tempmail.org', '10minutemail.com', 'guerrillamail.com', 
      'mailinator.com', 'yopmail.com', 'throwaway.email'
    ];
    
    if (blockedDomains.includes(domain)) {
      return { isValid: false, message: 'No se permiten emails temporales' };
    }

    return { isValid: true, message: '' };
  }

  validatePassword(password: string): { isValid: boolean; message: string } {
    if (!password) {
      return { isValid: false, message: 'La contraseña es requerida' };
    }

    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('mínimo 8 caracteres');
    }

    if (password.length > 128) {
      errors.push('máximo 128 caracteres');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('al menos una mayúscula');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('al menos una minúscula');
    }

    if (!/[0-9]/.test(password)) {
      errors.push('al menos un número');
    }

    if (!/[\W_]/.test(password)) {
      errors.push('al menos un carácter especial');
    }

    if (errors.length > 0) {
      return { 
        isValid: false, 
        message: `La contraseña debe tener ${errors.join(', ')}` 
      };
    }

    return { isValid: true, message: '' };
  }

  validatePasswordMatch(password: string, confirmPassword: string): { isValid: boolean; message: string } {
    if (!confirmPassword) {
      return { isValid: false, message: 'La confirmación de contraseña es requerida' };
    }

    if (password !== confirmPassword) {
      return { isValid: false, message: 'Las contraseñas no coinciden' };
    }

    return { isValid: true, message: '' };
  }

  validatePhone(phone: string): { isValid: boolean; message: string } {
    if (!phone || phone.trim().length === 0) {
      return { isValid: true, message: '' }; // Opcional
    }

    // Formato internacional básico
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    
    if (!phoneRegex.test(phone.trim())) {
      return { 
        isValid: false, 
        message: 'Formato: +[código país][número] (ej: +56912345678)' 
      };
    }

    return { isValid: true, message: '' };
  }

  /**
   * Obtener la fortaleza de la contraseña
   */
  getPasswordStrength(password: string): {
    strength: 'weak' | 'medium' | 'strong';
    score: number;
    checks: {
      minLength: boolean;
      maxLength: boolean;
      uppercase: boolean;
      lowercase: boolean;
      number: boolean;
      special: boolean;
    };
  } {
    const checks = {
      minLength: password.length >= 8,
      maxLength: password.length <= 128,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[\W_]/.test(password)
    };

    const score = Object.values(checks).filter(Boolean).length;
    
    let strength: 'weak' | 'medium' | 'strong' = 'weak';
    if (score >= 6) strength = 'strong';
    else if (score >= 4) strength = 'medium';

    return { strength, score, checks };
  }
}