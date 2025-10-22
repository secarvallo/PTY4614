import { FormControl } from '@angular/forms';
import { phoneValidator, internationalPhoneValidator, getE164Format, getPhoneNumberInfo } from './phone.validator';

describe('PhoneValidator', () => {
  describe('phoneValidator', () => {
    it('should return null for a valid Colombian number', () => {
      const control = new FormControl('300 123 4567');
      const validator = phoneValidator('CO');
      expect(validator(control)).toBeNull();
    });

    it('should return null for a valid US number', () => {
      const control = new FormControl('201-555-0123');
      const validator = phoneValidator('US');
      expect(validator(control)).toBeNull();
    });

    it('should return error object for an invalid number', () => {
      const control = new FormControl('12345');
      const validator = phoneValidator('US');
      const result = validator(control);
      expect(result).toEqual({
        invalidPhoneNumber: {
          value: '12345',
          reason: 'Invalid number',
          message: 'El número de teléfono no es válido para el país seleccionado',
          countryCode: 'US'
        }
      });
    });

    it('should return null for an empty value', () => {
      const control = new FormControl('');
      const validator = phoneValidator('US');
      expect(validator(control)).toBeNull();
    });

    it('should return null for a null value', () => {
      const control = new FormControl(null);
      const validator = phoneValidator('US');
      expect(validator(control)).toBeNull();
    });

    it('should handle parse errors gracefully', () => {
      const control = new FormControl('invalid-phone-format!@#');
      const validator = phoneValidator('US');
      const result = validator(control);
      expect(result?.['invalidPhoneNumber']?.reason).toBe('Parse error');
      expect(result?.['invalidPhoneNumber']?.message).toBe('Formato de número de teléfono inválido');
    });
  });

  describe('internationalPhoneValidator', () => {
    it('should return null for a valid international number with country code', () => {
      const control = new FormControl('+57 300 123 4567');
      const validator = internationalPhoneValidator();
      expect(validator(control)).toBeNull();
    });

    it('should return null for a valid US international number', () => {
      const control = new FormControl('+1 201 555 0123');
      const validator = internationalPhoneValidator();
      expect(validator(control)).toBeNull();
    });

    it('should return error for number without country code', () => {
      const control = new FormControl('300 123 4567');
      const validator = internationalPhoneValidator();
      const result = validator(control);
      expect(result).toBeTruthy();
      expect(result?.['invalidPhoneNumber']?.message).toContain('código de país');
    });

    it('should return null for empty value', () => {
      const control = new FormControl('');
      const validator = internationalPhoneValidator();
      expect(validator(control)).toBeNull();
    });

    it('should handle various international formats', () => {
      const testCases = [
        '+44 20 7946 0958', // UK
        '+33 1 42 86 83 26', // France
        '+49 30 12345678', // Germany
        '+86 138 0013 8000', // China
        '+81 3 1234 5678' // Japan
      ];

      testCases.forEach(phoneNumber => {
        const control = new FormControl(phoneNumber);
        const validator = internationalPhoneValidator();
        expect(validator(control)).toBeNull();
      });
    });
  });

  describe('getE164Format', () => {
    it('should return E.164 format for valid number', () => {
      const control = new FormControl('300 123 4567');
      const result = getE164Format(control, 'CO');
      expect(result).toBe('+573001234567');
    });

    it('should return E.164 format for international number', () => {
      const control = new FormControl('+57 300 123 4567');
      const result = getE164Format(control);
      expect(result).toBe('+573001234567');
    });

    it('should return null for invalid number', () => {
      const control = new FormControl('invalid');
      const result = getE164Format(control, 'CO');
      expect(result).toBeNull();
    });

    it('should return null for empty value', () => {
      const control = new FormControl('');
      const result = getE164Format(control, 'CO');
      expect(result).toBeNull();
    });
  });

  describe('getPhoneNumberInfo', () => {
    it('should return detailed info for valid Colombian number', () => {
      const result = getPhoneNumberInfo('300 123 4567', 'CO');
      
      expect(result).toBeTruthy();
      expect(result?.isValid).toBe(true);
      expect(result?.country).toBe('CO');
      expect(result?.countryCallingCode).toBe('57' as any);
      expect(result?.e164).toBe('+573001234567');
      expect(result?.international).toBe('+57 300 123 4567');
    });

    it('should return detailed info for international number', () => {
      const result = getPhoneNumberInfo('+1 201 555 0123');
      
      expect(result).toBeTruthy();
      expect(result?.isValid).toBe(true);
      expect(result?.country).toBe('US');
      expect(result?.countryCallingCode).toBe('1' as any);
      expect(result?.e164).toBe('+12015550123');
    });

    it('should return null for invalid number', () => {
      const result = getPhoneNumberInfo('invalid');
      expect(result).toBeNull();
    });

    it('should return null for empty value', () => {
      const result = getPhoneNumberInfo('');
      expect(result).toBeNull();
    });

    it('should handle parse errors gracefully', () => {
      const result = getPhoneNumberInfo('!@#$%^&*()');
      expect(result).toBeNull();
    });

    it('should detect phone number type when available', () => {
      const result = getPhoneNumberInfo('+57 300 123 4567');
      expect(result).toBeTruthy();
      expect(result?.type).toBeDefined();
    });

    it('should provide possible countries for ambiguous numbers', () => {
      const result = getPhoneNumberInfo('+1 800 555 1234'); // Could be US/CA
      expect(result).toBeTruthy();
      if (result?.possibleCountries) {
        expect(Array.isArray(result.possibleCountries)).toBe(true);
      }
    });
  });

  describe('Edge cases and performance', () => {
    it('should handle very long input strings', () => {
      const longString = '1'.repeat(1000);
      const control = new FormControl(longString);
      const validator = phoneValidator('US');
      const result = validator(control);
      expect(result).toBeTruthy(); // Should return error, not crash
    });

    it('should handle special characters in input', () => {
      const control = new FormControl('+57 (300) 123-4567');
      const validator = internationalPhoneValidator();
      expect(validator(control)).toBeNull(); // Should be valid
    });

    it('should handle whitespace-only input', () => {
      const control = new FormControl('   ');
      const validator = phoneValidator('CO');
      expect(validator(control)).toBeNull(); // Treated as empty
    });
  });
});

// Pruebas de integración con FormControl
describe('PhoneValidator Integration', () => {
  it('should work with reactive forms', () => {
    const control = new FormControl('', [internationalPhoneValidator()]);
    
    // Initially valid (empty)
    expect(control.valid).toBe(true);
    
    // Invalid format
    control.setValue('123');
    expect(control.invalid).toBe(true);
    expect(control.errors?.['invalidPhoneNumber']).toBeTruthy();
    
    // Valid format
    control.setValue('+57 300 123 4567');
    expect(control.valid).toBe(true);
    expect(control.errors).toBeNull();
  });

  it('should work with dynamic country code updates', () => {
    let countryCode: any = 'US';
    const getValidator = () => phoneValidator(countryCode);
    const control = new FormControl('201 555 0123');
    
    // Valid for US
    expect(getValidator()(control)).toBeNull();
    
    // Change country code
    countryCode = 'CO';
    
    // Same number invalid for Colombia
    expect(getValidator()(control)).toBeTruthy();
  });
});