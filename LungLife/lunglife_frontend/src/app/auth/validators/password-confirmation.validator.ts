import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Validador personalizado para confirmar que las contraseñas coinciden
 * Se aplica al FormGroup completo para comparar password y confirmPassword
 */
export function passwordConfirmationValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');
    
    // Si alguno de los campos no existe, no validamos aquí
    if (!password || !confirmPassword) {
      return null;
    }
    
    // Si confirmPassword está vacío, no mostramos este error
    // (ya se mostrará el error 'required' del campo individual)
    if (!confirmPassword.value) {
      return null;
    }
    
    // Si las contraseñas no coinciden, establecemos el error en confirmPassword
    if (password.value !== confirmPassword.value) {
      // Establecemos el error específicamente en el campo confirmPassword
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    } else {
      // Si coinciden, limpiamos cualquier error de mismatch
      // pero preservamos otros errores que pueda tener el campo
      if (confirmPassword.errors) {
        delete confirmPassword.errors['passwordMismatch'];
        
        // Si no quedan otros errores, establecemos errors a null
        if (Object.keys(confirmPassword.errors).length === 0) {
          confirmPassword.setErrors(null);
        }
      }
      return null;
    }
  };
}

/**
 * Validador alternativo más simple que solo retorna el error a nivel de FormGroup
 * sin modificar directamente los errores del campo confirmPassword
 */
export function simplePasswordConfirmationValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const password = control.get('password')?.value;
    const confirmPassword = control.get('confirmPassword')?.value;
    
    if (!password || !confirmPassword) {
      return null;
    }
    
    return password === confirmPassword ? null : { passwordMismatch: true };
  };
}