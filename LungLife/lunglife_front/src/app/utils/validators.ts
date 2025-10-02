import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { Helpers } from './helpers';

/**
 * Validadores personalizados para formularios reactivos
 */

export class CustomValidators {

  /**
   * Valida que las contraseñas coincidan
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

    const validation = Helpers.isStrongPassword(password);

    if (!validation.isValid) {
      return {
        weakPassword: {
          message: validation.errors.join(', ')
        }
      };
    }

    return null;
  }

  /**
   * Valida formato de email
   */
  static emailFormat(control: AbstractControl): ValidationErrors | null {
    const email = control.value;

    if (!email) return null;

    if (!Helpers.isValidEmail(email)) {
      return { invalidEmail: true };
    }

    return null;
  }

  /**
   * Valida que se acepten los términos y condiciones
   */
  static acceptTerms(control: AbstractControl): ValidationErrors | null {
    const accepted = control.value;

    if (!accepted) {
      return { termsNotAccepted: true };
    }

    return null;
  }

  /**
   * Valida que no sea solo espacios en blanco
   */
  static notEmpty(control: AbstractControl): ValidationErrors | null {
    const value = control.value;

    if (value && value.trim().length === 0) {
      return { empty: true };
    }

    return null;
  }
}
