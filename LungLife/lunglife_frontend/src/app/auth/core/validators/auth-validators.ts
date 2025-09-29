import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export class AuthValidators {

  /**
   * Validador de contraseña robusta
   * Requiere: 8+ caracteres, mayúscula, minúscula, número, carácter especial
   */
  static strongPassword(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      if (!value) return null;

      const hasUpperCase = /[A-Z]+/.test(value);
      const hasLowerCase = /[a-z]+/.test(value);
      const hasNumber = /[0-9]+/.test(value);
      const hasSpecial = /[\W_]+/.test(value);
      const hasMinLength = value.length >= 8;
      const hasMaxLength = value.length <= 128;

      const errors: any = {};

      if (!hasMinLength) errors.minLength = { requiredLength: 8, actualLength: value.length };
      if (!hasMaxLength) errors.maxLength = { requiredLength: 128, actualLength: value.length };
      if (!hasUpperCase) errors.uppercase = true;
      if (!hasLowerCase) errors.lowercase = true;
      if (!hasNumber) errors.number = true;
      if (!hasSpecial) errors.special = true;

      return Object.keys(errors).length ? { strongPassword: errors } : null;
    };
  }

  /**
   * Validador de email avanzado con dominios bloqueados
   */
  static advancedEmail(blockedDomains: string[] = []): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      if (!value) return null;

      // Regex más estricta para email
      const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

      if (!emailRegex.test(value)) {
        return { email: true };
      }

      // Verificar dominios bloqueados
      const domain = value.split('@')[1]?.toLowerCase();
      if (blockedDomains.includes(domain)) {
        return { blockedDomain: { domain } };
      }

      // Verificar dominios desechables comunes
      const disposableDomains = ['10minutemail.com', 'tempmail.org', 'guerrillamail.com'];
      if (disposableDomains.includes(domain)) {
        return { disposableEmail: { domain } };
      }

      return null;
    };
  }

  /**
   * Validador de confirmación de contraseña
   */
  static confirmPassword(passwordControlName: string): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.parent) return null;

      const password = control.parent.get(passwordControlName);
      const confirmPassword = control;

      if (!password || !confirmPassword) return null;

      return password.value === confirmPassword.value ? null : { confirmPassword: true };
    };
  }

  /**
   * Validador de nombre de usuario
   */
  static username(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      if (!value) return null;

      const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
      if (!usernameRegex.test(value)) {
        return { username: true };
      }

      // Palabras reservadas
      const reserved = ['admin', 'root', 'user', 'test', 'null', 'undefined'];
      if (reserved.includes(value.toLowerCase())) {
        return { reservedUsername: true };
      }

      return null;
    };
  }

  /**
   * Validador de teléfono internacional
   */
  static phoneNumber(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      if (!value) return null;

      // Formato internacional: +[código país][número]
      const phoneRegex = /^\+[1-9]\d{1,14}$/;
      if (!phoneRegex.test(value)) {
        return { phoneNumber: true };
      }

      return null;
    };
  }

  /**
   * Validador de código 2FA
   */
  static twoFactorCode(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      if (!value) return null;

      // 6 dígitos para TOTP o 8 para códigos backup
      const codeRegex = /^\d{6}$|^\d{8}$/;
      if (!codeRegex.test(value)) {
        return { twoFactorCode: true };
      }

      return null;
    };
  }
}
