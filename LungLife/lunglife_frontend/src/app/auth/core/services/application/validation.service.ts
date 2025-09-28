import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ValidationService {
  validatePassword(password: string): { isValid: boolean; strength: number; errors: string[] } {
    const isValid = password.length >= 8;
    const strength = password.length < 8 ? 1 : password.length < 12 ? 2 : 3;
    const errors = isValid ? [] : ['Password must be at least 8 characters long'];

    return { isValid, strength, errors };
  }
}