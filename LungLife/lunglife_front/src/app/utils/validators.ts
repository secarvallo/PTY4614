import {AbstractControl, ValidationErrors, ValidatorFn} from '@angular/forms';
import {Helpers} from './helpers';

/**
 * Validadores personalizados para formularios reactivos
 */

export class CustomValidators {

  /**
   * Valida formato de email
   */
  static email(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;

    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    if (!emailPattern.test(control.value)) {
      return { invalidEmail: true };
    }

    return null;
  }

  /**
   * Valida que no contenga números
   */
  static noNumbers(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;

    const hasNumbers = /\d/.test(control.value);

    if (hasNumbers) {
      return { noNumbers: true };
    }

    return null;
  }

  /**
   * Valida que las contraseñas coincidan (para formularios)
   */
  static passwordMatch(passwordField: string, confirmPasswordField: string): ValidatorFn {
    return (formGroup: AbstractControl): ValidationErrors | null => {
      const password = formGroup.get(passwordField)?.value;
      const confirmPassword = formGroup.get(confirmPasswordField)?.value;

      if (!password || !confirmPassword) return null;

      if (password !== confirmPassword) {
        return { passwordMismatch: true };
      }

      return null;
    };
  }

  /**
   * Valida que las contraseñas coincidan (para controles individuales)
   */
  static passwordsMatch(confirmPasswordControlName: string): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const password = control.value;
      const confirmPasswordControl = control.root.get(confirmPasswordControlName);

      if (!confirmPasswordControl) return null;

      const confirmPassword = confirmPasswordControl.value;

      if (password !== confirmPassword) {
        return { passwordsNotMatch: true };
      }

      return null;
    };
  }

  /**
   * Valida la fortaleza de la contraseña
   */
  static strongPassword(control: AbstractControl): ValidationErrors | null {
    const password = control.value;

    if (!password) return null;

    // Basic validation - can be enhanced with Helpers if available
    const hasMinLength = password.length >= 6;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);

    if (!hasMinLength || !hasUpper || !hasLower || !hasNumber) {
      return {
        weakPassword: {
          message: 'La contraseña debe tener al menos 6 caracteres, una mayúscula, una minúscula y un número'
        }
      };
    }

    return null;
  }

  /**
   * Valida números de teléfono
   */
  static phone(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;

    const phonePattern = /^[+]?[\d\s\-\(\)]{8,15}$/;

    if (!phonePattern.test(control.value)) {
      return { invalidPhone: true };
    }

    return null;
  }
}
