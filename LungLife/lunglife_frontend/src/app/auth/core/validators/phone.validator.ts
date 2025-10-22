import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { parsePhoneNumberFromString, CountryCode } from 'libphonenumber-js';

/**
 * Crea una función validadora de Angular para números de teléfono.
 * @param countryCode El código de país ISO 3166-1 alpha-2 a utilizar para la validación.
 * @returns Una ValidatorFn que devuelve un objeto de error si el número es inválido, o null si es válido.
 */
export function phoneValidator(countryCode: CountryCode = 'US'): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    // Si no hay valor, no se valida aquí. Se deja para el validador 'required'.
    if (!control.value) {
      return null;
    }

    let phoneNumber;
    try {
      // Intenta analizar el número de teléfono con el código de país proporcionado.
      phoneNumber = parsePhoneNumberFromString(control.value as string, countryCode);
    } catch (error) {
      // Si hay un error de análisis, el número es inválido.
      return { 
        invalidPhoneNumber: { 
          value: control.value, 
          reason: 'Parse error',
          message: 'Formato de número de teléfono inválido' 
        } 
      };
    }

    // Comprueba si el número analizado es válido.
    if (phoneNumber && phoneNumber.isValid()) {
      return null; // El número es válido.
    } else {
      // El número no es válido.
      const reason = phoneNumber ? 'Invalid number' : 'Could not parse number';
      const message = phoneNumber 
        ? 'El número de teléfono no es válido para el país seleccionado'
        : 'No se pudo analizar el número de teléfono';
      
      return { 
        invalidPhoneNumber: { 
          value: control.value, 
          reason,
          message,
          countryCode 
        } 
      };
    }
  };
}

/**
 * Validador que acepta cualquier formato internacional válido
 */
export function internationalPhoneValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null;
    }

    try {
      // Intenta analizar sin especificar país (formato internacional)
      const phoneNumber = parsePhoneNumberFromString(control.value as string);
      
      if (phoneNumber && phoneNumber.isValid()) {
        return null;
      } else {
        return {
          invalidPhoneNumber: {
            value: control.value,
            reason: 'Invalid international number',
            message: 'Ingrese un número de teléfono válido con código de país (ej: +57 300 123 4567)'
          }
        };
      }
    } catch (error) {
      return {
        invalidPhoneNumber: {
          value: control.value,
          reason: 'Parse error',
          message: 'Formato inválido. Use el formato internacional: +código número'
        }
      };
    }
  };
}

/**
 * Obtiene el número en formato E.164 desde un control de formulario
 */
export function getE164Format(control: AbstractControl, defaultCountry?: CountryCode): string | null {
  if (!control.value) {
    return null;
  }

  try {
    const phoneNumber = parsePhoneNumberFromString(control.value as string, defaultCountry);
    return phoneNumber?.format('E.164') || null;
  } catch {
    return null;
  }
}

/**
 * Obtiene información detallada del número de teléfono
 */
export function getPhoneNumberInfo(value: string, defaultCountry?: CountryCode) {
  if (!value) {
    return null;
  }

  try {
    const phoneNumber = parsePhoneNumberFromString(value, defaultCountry);
    
    if (phoneNumber) {
      return {
        isValid: phoneNumber.isValid(),
        country: phoneNumber.country,
        countryCallingCode: phoneNumber.countryCallingCode,
        nationalNumber: phoneNumber.nationalNumber,
        e164: phoneNumber.format('E.164'),
        international: phoneNumber.formatInternational(),
        national: phoneNumber.formatNational(),
        type: phoneNumber.getType(),
        possibleCountries: phoneNumber.getPossibleCountries?.() || []
      };
    }
  } catch (error) {
    console.warn('Error parsing phone number:', error);
  }

  return null;
}