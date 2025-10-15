import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { map, catchError, timeout, tap } from 'rxjs/operators';
import { SHA1 } from 'crypto-js';

/**
 * 🔐 Servicio de Validación contra Brechas de Contraseñas
 * 
 * Funcionalidades:
 * - Validación contra HaveIBeenPwned API usando técnica k-anonymity
 * - Cache local para evitar consultas repetidas
 * - Validación de entropía de contraseñas
 * - Detección de patrones comunes y diccionarios
 * - Métricas de seguridad y auditoría
 */
@Injectable({
  providedIn: 'root'
})
export class PasswordBreachValidatorService {

  private readonly HIBP_API_URL = 'https://api.pwnedpasswords.com/range';
  private readonly REQUEST_TIMEOUT = 5000; // 5 segundos
  private readonly CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 horas
  
  // Cache local para evitar consultas repetidas
  private breachCache = new Map<string, { breached: boolean; count: number; timestamp: number }>();
  
  // Métricas de seguridad
  private securityMetrics$ = new BehaviorSubject({
    totalValidations: 0,
    breachedAttempts: 0,
    lowEntropyAttempts: 0,
    commonPatternAttempts: 0,
    lastValidation: null as Date | null
  });

  // Patrones comunes inseguros
  private readonly COMMON_PATTERNS = [
    /^password\d*$/i,
    /^123456\d*$/,
    /^qwerty\d*$/i,
    /^admin\d*$/i,
    /^letmein\d*$/i,
    /^welcome\d*$/i,
    /^monkey\d*$/i,
    /^dragon\d*$/i,
    /^sunshine\d*$/i,
    /^master\d*$/i,
    /^(\w)\1{3,}/, // Caracteres repetidos (aaaa, 1111, etc.)
    /^(.{1,3})\1+$/, // Patrones repetidos (abcabc, 123123, etc.)
    /^\d{6,}$/, // Solo números
    /^[a-zA-Z]{6,}$/ // Solo letras
  ];

  // Diccionario de contraseñas más comunes (top 1000)
  private readonly COMMON_PASSWORDS = new Set([
    'password', '123456', 'password123', 'admin', 'qwerty', 'letmein',
    'welcome', 'monkey', 'dragon', 'sunshine', 'master', 'abc123',
    'login', 'passw0rd', 'football', 'baseball', 'superman', 'access',
    'shadow', 'trustno1', 'princess', 'azerty', 'jesus', 'ninja',
    'mustang', 'cheese', 'michael', 'jordan', 'harley', 'ranger'
    // Nota: En producción, cargar desde un archivo más extenso
  ]);

  constructor(private http: HttpClient) {}

  /**
   * Validación completa de contraseña contra múltiples criterios de seguridad
   */
  async validatePasswordSecurity(password: string): Promise<PasswordSecurityResult> {
    this.updateMetrics('totalValidations');

    const results: PasswordSecurityResult = {
      isSecure: true,
      breachStatus: { isBreached: false, count: 0, checked: false },
      entropyScore: this.calculateEntropy(password),
      strengthScore: this.calculateStrengthScore(password),
      commonPatternDetected: this.detectCommonPatterns(password),
      isDictionaryWord: this.isDictionaryPassword(password),
      recommendations: [],
      securityLevel: 'unknown'
    };

    // Validar contra brechas de seguridad
    try {
      const breachResult = await this.checkPasswordBreach(password).toPromise();
      if (breachResult) {
        results.breachStatus = breachResult;
      }
      if (results.breachStatus.isBreached) {
        results.isSecure = false;
        results.recommendations.push({
          type: 'critical',
          message: `Esta contraseña ha sido comprometida ${results.breachStatus.count} veces en brechas de seguridad.`,
          suggestion: 'Utiliza una contraseña completamente diferente y única.'
        });
        this.updateMetrics('breachedAttempts');
      }
    } catch (error) {
      console.warn('No se pudo verificar contra brechas de seguridad:', error);
      results.breachStatus.checked = false;
    }

    // Validar entropía
    if (results.entropyScore < 50) {
      results.isSecure = false;
      results.recommendations.push({
        type: 'high',
        message: 'La contraseña tiene baja entropía (predecibilidad alta).',
        suggestion: 'Agrega más variedad de caracteres y longitud.'
      });
      this.updateMetrics('lowEntropyAttempts');
    }

    // Validar patrones comunes
    if (results.commonPatternDetected.length > 0) {
      results.isSecure = false;
      results.recommendations.push({
        type: 'medium',
        message: `Contiene patrones comunes: ${results.commonPatternDetected.join(', ')}`,
        suggestion: 'Evita secuencias predecibles y patrones obvios.'
      });
      this.updateMetrics('commonPatternAttempts');
    }

    // Validar diccionario
    if (results.isDictionaryWord) {
      results.isSecure = false;
      results.recommendations.push({
        type: 'high',
        message: 'Esta contraseña está en la lista de contraseñas más comunes.',
        suggestion: 'Utiliza una combinación única de palabras, números y símbolos.'
      });
    }

    // Determinar nivel de seguridad
    results.securityLevel = this.determineSecurityLevel(results);

    // Actualizar métricas
    this.updateMetrics('lastValidation', new Date());

    return results;
  }

  /**
   * Verificar contraseña contra HaveIBeenPwned usando k-anonymity
   */
  private checkPasswordBreach(password: string): Observable<BreachStatus> {
    const passwordHash = SHA1(password).toString().toUpperCase();
    const hashPrefix = passwordHash.substring(0, 5);
    const hashSuffix = passwordHash.substring(5);

    // Verificar cache primero
    const cached = this.breachCache.get(passwordHash);
    if (cached && Date.now() - cached.timestamp < this.CACHE_EXPIRY) {
      return of({
        isBreached: cached.breached,
        count: cached.count,
        checked: true
      });
    }

    // Consultar API HaveIBeenPwned
    return this.http.get(`${this.HIBP_API_URL}/${hashPrefix}`, {
      responseType: 'text',
      headers: {
        'User-Agent': 'LungLife-Security-Validator',
        'Add-Padding': 'true'
      }
    }).pipe(
      timeout(this.REQUEST_TIMEOUT),
      map(response => {
        const lines = response.split('\n');
        const match = lines.find(line => 
          line.startsWith(hashSuffix + ':')
        );

        const isBreached = !!match;
        const count = match ? parseInt(match.split(':')[1]) : 0;

        // Guardar en cache
        this.breachCache.set(passwordHash, {
          breached: isBreached,
          count,
          timestamp: Date.now()
        });

        return { isBreached, count, checked: true };
      }),
      catchError(error => {
        console.error('Error verificando breach:', error);
        return of({ isBreached: false, count: 0, checked: false });
      })
    );
  }

  /**
   * Calcular entropía de la contraseña (Shannon entropy)
   */
  private calculateEntropy(password: string): number {
    if (!password) return 0;

    const charFrequency = new Map<string, number>();
    
    // Contar frecuencia de caracteres
    for (const char of password) {
      charFrequency.set(char, (charFrequency.get(char) || 0) + 1);
    }

    // Calcular entropía usando Shannon entropy formula
    let entropy = 0;
    for (const count of charFrequency.values()) {
      const probability = count / password.length;
      entropy -= probability * Math.log2(probability);
    }

    // Multiplicar por longitud para entropía total
    return entropy * password.length;
  }

  /**
   * Calcular puntuación de fuerza de contraseña
   */
  private calculateStrengthScore(password: string): number {
    let score = 0;

    // Longitud (0-25 puntos)
    score += Math.min(password.length * 2, 25);

    // Variedad de caracteres (0-40 puntos)
    if (/[a-z]/.test(password)) score += 10;
    if (/[A-Z]/.test(password)) score += 10;
    if (/\d/.test(password)) score += 10;
    if (/[^a-zA-Z0-9]/.test(password)) score += 10;

    // Complejidad adicional (0-35 puntos)
    const uniqueChars = new Set(password).size;
    score += Math.min(uniqueChars * 2, 20);

    // Penalizar patrones repetitivos
    if (/(.)\1{2,}/.test(password)) score -= 10;
    if (/012|123|234|345|456|567|678|789|890|abc|bcd|cde/.test(password.toLowerCase())) score -= 5;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Detectar patrones comunes inseguros
   */
  private detectCommonPatterns(password: string): string[] {
    const detectedPatterns: string[] = [];

    for (const pattern of this.COMMON_PATTERNS) {
      if (pattern.test(password)) {
        detectedPatterns.push(this.getPatternDescription(pattern));
      }
    }

    return detectedPatterns;
  }

  /**
   * Verificar si es una contraseña de diccionario común
   */
  private isDictionaryPassword(password: string): boolean {
    const lowerPassword = password.toLowerCase();
    
    // Verificar contraseñas exactas
    if (this.COMMON_PASSWORDS.has(lowerPassword)) {
      return true;
    }

    // Verificar variaciones comunes (agregar números al final)
    const basePassword = lowerPassword.replace(/\d+$/, '');
    if (this.COMMON_PASSWORDS.has(basePassword)) {
      return true;
    }

    return false;
  }

  /**
   * Determinar nivel general de seguridad
   */
  private determineSecurityLevel(results: PasswordSecurityResult): SecurityLevel {
    if (results.breachStatus.isBreached) return 'critical';
    if (!results.isSecure) return 'low';
    if (results.strengthScore >= 80 && results.entropyScore >= 60) return 'high';
    if (results.strengthScore >= 60 && results.entropyScore >= 40) return 'medium';
    return 'low';
  }

  /**
   * Obtener descripción legible del patrón detectado
   */
  private getPatternDescription(pattern: RegExp): string {
    const patternDescriptions = new Map([
      [this.COMMON_PATTERNS[0], 'palabra "password"'],
      [this.COMMON_PATTERNS[1], 'secuencia numérica simple'],
      [this.COMMON_PATTERNS[2], 'secuencia de teclado "qwerty"'],
      [this.COMMON_PATTERNS[3], 'palabra "admin"'],
      [this.COMMON_PATTERNS[4], 'frase "letmein"'],
      [this.COMMON_PATTERNS[9], 'caracteres repetidos'],
      [this.COMMON_PATTERNS[10], 'patrón repetitivo'],
      [this.COMMON_PATTERNS[11], 'solo números'],
      [this.COMMON_PATTERNS[12], 'solo letras']
    ]);

    return patternDescriptions.get(pattern) || 'patrón inseguro';
  }

  /**
   * Actualizar métricas de seguridad
   */
  private updateMetrics(metric: string, value?: any): void {
    const current = this.securityMetrics$.value;
    
    switch (metric) {
      case 'totalValidations':
        current.totalValidations++;
        break;
      case 'breachedAttempts':
        current.breachedAttempts++;
        break;
      case 'lowEntropyAttempts':
        current.lowEntropyAttempts++;
        break;
      case 'commonPatternAttempts':
        current.commonPatternAttempts++;
        break;
      case 'lastValidation':
        current.lastValidation = value;
        break;
    }

    this.securityMetrics$.next({ ...current });
  }

  /**
   * Obtener métricas de seguridad actuales
   */
  getSecurityMetrics(): Observable<SecurityMetrics> {
    return this.securityMetrics$.asObservable();
  }

  /**
   * Limpiar cache de validaciones
   */
  clearCache(): void {
    this.breachCache.clear();
  }

  /**
   * Obtener estadísticas del cache
   */
  getCacheStats(): { size: number; oldestEntry: number; newestEntry: number } {
    const timestamps = Array.from(this.breachCache.values()).map(v => v.timestamp);
    return {
      size: this.breachCache.size,
      oldestEntry: timestamps.length ? Math.min(...timestamps) : 0,
      newestEntry: timestamps.length ? Math.max(...timestamps) : 0
    };
  }
}

// Interfaces para tipos de datos
export interface PasswordSecurityResult {
  isSecure: boolean;
  breachStatus: BreachStatus;
  entropyScore: number;
  strengthScore: number;
  commonPatternDetected: string[];
  isDictionaryWord: boolean;
  recommendations: SecurityRecommendation[];
  securityLevel: SecurityLevel;
}

export interface BreachStatus {
  isBreached: boolean;
  count: number;
  checked: boolean;
}

export interface SecurityRecommendation {
  type: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  suggestion: string;
}

export interface SecurityMetrics {
  totalValidations: number;
  breachedAttempts: number;
  lowEntropyAttempts: number;
  commonPatternAttempts: number;
  lastValidation: Date | null;
}

export type SecurityLevel = 'critical' | 'low' | 'medium' | 'high' | 'unknown';