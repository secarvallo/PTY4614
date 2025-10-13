import { Injectable } from '@angular/core';

export interface SanitizedRegistrationData {
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  password: string; // No se sanitiza, solo se valida
  acceptTerms: boolean;
  acceptPrivacy: boolean;
  acceptMarketing: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class InputSanitizationService {

  /**
   * Sanitiza todos los inputs de registro
   */
  sanitizeRegistrationData(rawData: any): SanitizedRegistrationData {
    return {
      nombre: this.sanitizeName(rawData.nombre || ''),
      apellido: this.sanitizeName(rawData.apellido || ''),
      email: this.sanitizeEmail(rawData.email || ''),
      telefono: this.sanitizePhone(rawData.telefono || ''),
      password: rawData.password || '', // Las contraseñas no se sanitizan
      acceptTerms: Boolean(rawData.acceptTerms),
      acceptPrivacy: Boolean(rawData.acceptPrivacy),
      acceptMarketing: Boolean(rawData.acceptMarketing)
    };
  }

  /**
   * Sanitización general de texto para prevenir XSS
   */
  sanitizeInput(input: string): string {
    if (!input) return '';
    
    return input.trim()
      // Remover scripts maliciosos
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      // Remover URLs javascript:
      .replace(/javascript:/gi, '')
      // Remover event handlers HTML
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
      // Remover tags HTML
      .replace(/<[^>]*>/g, '')
      // Escapar caracteres especiales HTML
      .replace(/[<>'"&]/g, (char) => {
        const escapeMap: { [key: string]: string } = {
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#x27;',
          '&': '&amp;'
        };
        return escapeMap[char] || char;
      });
  }

  /**
   * Sanitización específica para nombres
   */
  sanitizeName(name: string): string {
    if (!name) return '';
    
    const sanitized = this.sanitizeInput(name);
    
    // Permitir solo caracteres válidos para nombres
    return sanitized.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]/g, '').trim();
  }

  /**
   * Sanitización específica para email
   */
  sanitizeEmail(email: string): string {
    if (!email) return '';
    
    // Convertir a minúsculas y sanitizar
    const sanitized = this.sanitizeInput(email.toLowerCase());
    
    // Permitir solo caracteres válidos para email
    return sanitized.replace(/[^a-zA-Z0-9.!#$%&'*+/=?^_`{|}~@-]/g, '');
  }

  /**
   * Sanitización específica para teléfono
   */
  sanitizePhone(phone: string): string {
    if (!phone) return '';
    
    const sanitized = this.sanitizeInput(phone);
    
    // Permitir solo números, + y espacios
    return sanitized.replace(/[^0-9+\s-]/g, '').trim();
  }

  /**
   * Validar que el input sanitizado no esté vacío después de la sanitización
   */
  isValidAfterSanitization(original: string, sanitized: string): boolean {
    // Si el input original tenía contenido pero después de sanitizar está vacío,
    // probablemente contenía solo caracteres maliciosos
    return !(original.trim().length > 0 && sanitized.trim().length === 0);
  }

  /**
   * Detectar posibles intentos de inyección
   */
  detectSuspiciousInput(input: string): {
    isSuspicious: boolean;
    reasons: string[];
  } {
    const reasons: string[] = [];
    
    // Detectar scripts
    if (/<script/i.test(input)) {
      reasons.push('Contiene tags de script');
    }
    
    // Detectar javascript:
    if (/javascript:/i.test(input)) {
      reasons.push('Contiene URLs javascript');
    }
    
    // Detectar event handlers
    if (/on\w+\s*=/i.test(input)) {
      reasons.push('Contiene event handlers HTML');
    }
    
    // Detectar SQL injection básico
    if (/(union|select|insert|update|delete|drop|create|alter)\s+/i.test(input)) {
      reasons.push('Posible inyección SQL');
    }
    
    // Detectar caracteres de escape excesivos
    const escapeChars = (input.match(/[\\'"]/g) || []).length;
    if (escapeChars > 3) {
      reasons.push('Exceso de caracteres de escape');
    }
    
    return {
      isSuspicious: reasons.length > 0,
      reasons
    };
  }

  /**
   * Limpiar completamente un string manteniendo solo caracteres seguros
   */
  strictSanitize(input: string): string {
    if (!input) return '';
    
    // Mantener solo letras, números, espacios y algunos símbolos seguros
    return input.replace(/[^a-zA-Z0-9\s.,!?@áéíóúÁÉÍÓÚñÑüÜ-]/g, '').trim();
  }
}