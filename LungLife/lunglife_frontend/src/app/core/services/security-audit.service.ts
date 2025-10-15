import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';

/**
 * 🛡️ Servicio de Auditoría de Seguridad
 * 
 * Funcionalidades:
 * - Registro detallado de eventos de seguridad
 * - Detección de patrones de ataque
 * - Análisis de comportamiento sospechoso
 * - Métricas y alertas de seguridad
 * - Geolocalización de intentos de acceso
 * - Rate limiting inteligente
 */
@Injectable({
  providedIn: 'root'
})
export class SecurityAuditService {

  private readonly STORAGE_KEY = 'lunglife_security_audit';
  private readonly MAX_LOG_ENTRIES = 1000;
  private readonly SUSPICIOUS_THRESHOLD = 5; // Intentos sospechosos antes de alerta
  
  // Estado de auditoría
  private auditLog$ = new BehaviorSubject<SecurityEvent[]>([]);
  private securityAlerts$ = new BehaviorSubject<SecurityAlert[]>([]);
  private threatLevel$ = new BehaviorSubject<ThreatLevel>('low');

  // Métricas en tiempo real
  private realTimeMetrics$ = new BehaviorSubject<SecurityMetrics>({
    totalEvents: 0,
    suspiciousEvents: 0,
    blockedAttempts: 0,
    uniqueIPs: new Set(),
    avgResponseTime: 0,
    lastIncident: null,
    riskScore: 0
  });

  // Patrones de ataque conocidos
  private readonly ATTACK_PATTERNS = {
    passwordSpray: /^(.{1,8}|password|123456|admin)$/i,
    credentialStuffing: /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}.*password/i,
    bruteForce: /(.)\1{4,}|012345|abcdef/i,
    sqlInjection: /'|--|union|select|drop|insert|update|delete/i,
    xssAttempt: /<script|javascript:|on\w+=/i
  };

  constructor(private http: HttpClient) {
    this.loadAuditLog();
    this.startRealTimeMonitoring();
  }

  /**
   * Registrar evento de seguridad
   */
  logSecurityEvent(event: Partial<SecurityEvent>): void {
    const fullEvent: SecurityEvent = {
      id: this.generateEventId(),
      timestamp: new Date(),
      type: event.type || 'info',
      action: event.action || 'unknown',
      userId: event.userId || null,
      ipAddress: event.ipAddress || this.getClientIP(),
      userAgent: event.userAgent || navigator.userAgent,
      location: event.location || null,
      details: event.details || {},
      riskLevel: event.riskLevel || 'low',
      blocked: event.blocked || false,
      sessionId: event.sessionId || this.generateSessionId()
    };

    // Enriquecer evento con análisis
    this.enrichSecurityEvent(fullEvent);
    
    // Agregar al log
    const currentLog = this.auditLog$.value;
    const updatedLog = [fullEvent, ...currentLog].slice(0, this.MAX_LOG_ENTRIES);
    
    this.auditLog$.next(updatedLog);
    this.saveAuditLog(updatedLog);
    
    // Analizar para patrones sospechosos
    this.analyzeForThreats(fullEvent);
    
    // Actualizar métricas
    this.updateMetrics(fullEvent);
  }

  /**
   * Validar intento de registro por seguridad
   */
  validateRegistrationAttempt(data: RegistrationAttemptData): SecurityValidationResult {
    const riskFactors: string[] = [];
    let riskScore = 0;

    // Análisis de contraseña
    if (this.detectAttackPattern(data.password, 'passwordSpray')) {
      riskFactors.push('Contraseña común en ataques de password spray');
      riskScore += 30;
    }

    if (this.detectAttackPattern(data.password, 'bruteForce')) {
      riskFactors.push('Patrón típico de fuerza bruta');
      riskScore += 25;
    }

    // Análisis de email
    if (this.detectAttackPattern(data.email, 'credentialStuffing')) {
      riskFactors.push('Posible intento de credential stuffing');
      riskScore += 40;
    }

    // Análisis de inputs por XSS/SQLi
    Object.values(data).forEach(value => {
      if (typeof value === 'string') {
        if (this.detectAttackPattern(value, 'sqlInjection')) {
          riskFactors.push('Intento de inyección SQL detectado');
          riskScore += 50;
        }
        if (this.detectAttackPattern(value, 'xssAttempt')) {
          riskFactors.push('Intento de XSS detectado');
          riskScore += 45;
        }
      }
    });

    // Análisis de frecuencia de intentos
    const recentAttempts = this.getRecentAttemptsByIP();
    if (recentAttempts > 3) {
      riskFactors.push('Múltiples intentos desde la misma IP');
      riskScore += 20;
    }

    // Análisis de User Agent
    if (this.isAutomatedUserAgent(navigator.userAgent)) {
      riskFactors.push('User Agent sospechoso (posible bot)');
      riskScore += 35;
    }

    const shouldBlock = riskScore >= 50;
    const riskLevel: RiskLevel = riskScore >= 70 ? 'critical' : 
                                 riskScore >= 40 ? 'high' : 
                                 riskScore >= 20 ? 'medium' : 'low';

    // Registrar evento
    this.logSecurityEvent({
      type: 'registration_attempt',
      action: shouldBlock ? 'blocked' : 'allowed',
      details: {
        email: this.maskEmail(data.email),
        riskFactors,
        riskScore
      },
      riskLevel,
      blocked: shouldBlock
    });

    return {
      allowed: !shouldBlock,
      riskScore,
      riskLevel,
      riskFactors,
      requiresAdditionalVerification: riskScore >= 30,
      recommendedActions: this.getRecommendedActions(riskScore, riskFactors)
    };
  }

  /**
   * Detectar patrón de ataque específico
   */
  private detectAttackPattern(input: string, patternType: keyof typeof this.ATTACK_PATTERNS): boolean {
    const pattern = this.ATTACK_PATTERNS[patternType];
    return pattern.test(input);
  }

  /**
   * Enriquecer evento con análisis adicional
   */
  private enrichSecurityEvent(event: SecurityEvent): void {
    // Análisis de geolocalización (simulado - en producción usar servicio real)
    if (!event.location && event.ipAddress) {
      event.location = this.getLocationFromIP(event.ipAddress);
    }

    // Análisis de dispositivo
    event.details['deviceInfo'] = this.analyzeUserAgent(event.userAgent);
    
    // Análisis de timing
    event.details['timingAnalysis'] = this.analyzeTimingPattern();
    
    // Correlación con eventos previos
    event.details['correlatedEvents'] = this.findCorrelatedEvents(event);
  }

  /**
   * Analizar para amenazas y patrones sospechosos
   */
  private analyzeForThreats(event: SecurityEvent): void {
    const recentEvents = this.auditLog$.value.slice(0, 50);
    
    // Detectar intentos de fuerza bruta
    const bruteForceAttempts = recentEvents.filter(e => 
      e.ipAddress === event.ipAddress && 
      e.action === 'blocked' && 
      Date.now() - e.timestamp.getTime() < 300000 // 5 minutos
    ).length;

    if (bruteForceAttempts >= 3) {
      this.generateAlert({
        type: 'brute_force_detected',
        severity: 'high',
        message: `Detección de fuerza bruta desde IP ${event.ipAddress}`,
        affectedIP: event.ipAddress,
        eventCount: bruteForceAttempts
      });
    }

    // Detectar ataques distribuidos
    const recentIPs = new Set(recentEvents.map(e => e.ipAddress));
    if (recentIPs.size > 10 && recentEvents.length > 20) {
      this.generateAlert({
        type: 'distributed_attack',
        severity: 'critical',
        message: 'Posible ataque distribuido detectado',
        affectedIP: 'multiple',
        eventCount: recentEvents.length
      });
    }

    // Actualizar nivel de amenaza
    this.updateThreatLevel();
  }

  /**
   * Generar alerta de seguridad
   */
  private generateAlert(alert: Partial<SecurityAlert>): void {
    const fullAlert: SecurityAlert = {
      id: this.generateEventId(),
      timestamp: new Date(),
      type: alert.type || 'unknown',
      severity: alert.severity || 'low',
      message: alert.message || 'Evento de seguridad detectado',
      affectedIP: alert.affectedIP || 'unknown',
      eventCount: alert.eventCount || 1,
      resolved: false,
      actions: alert.actions || []
    };

    const currentAlerts = this.securityAlerts$.value;
    this.securityAlerts$.next([fullAlert, ...currentAlerts].slice(0, 100));
    
    // En producción: enviar a sistema de monitoreo, email, Slack, etc.
    console.warn('🚨 SECURITY ALERT:', fullAlert);
  }

  /**
   * Obtener intentos recientes por IP
   */
  private getRecentAttemptsByIP(ipAddress?: string): number {
    const targetIP = ipAddress || this.getClientIP();
    const recentTime = Date.now() - 900000; // 15 minutos
    
    return this.auditLog$.value.filter(event => 
      event.ipAddress === targetIP && 
      event.timestamp.getTime() > recentTime
    ).length;
  }

  /**
   * Verificar si es User Agent automatizado
   */
  private isAutomatedUserAgent(userAgent: string): boolean {
    const botPatterns = [
      /bot|crawler|spider|scraper/i,
      /curl|wget|python|postman/i,
      /automated|selenium|phantomjs/i
    ];

    return botPatterns.some(pattern => pattern.test(userAgent));
  }

  /**
   * Obtener acciones recomendadas basadas en riesgo
   */
  private getRecommendedActions(riskScore: number, riskFactors: string[]): string[] {
    const actions: string[] = [];

    if (riskScore >= 70) {
      actions.push('Bloquear IP temporalmente');
      actions.push('Requerir verificación CAPTCHA');
      actions.push('Notificar al equipo de seguridad');
    } else if (riskScore >= 40) {
      actions.push('Requerir verificación adicional');
      actions.push('Monitorear actividad de cerca');
    } else if (riskScore >= 20) {
      actions.push('Aplicar rate limiting más estricto');
    }

    return actions;
  }

  /**
   * Actualizar métricas en tiempo real
   */
  private updateMetrics(event: SecurityEvent): void {
    const current = this.realTimeMetrics$.value;
    
    current.totalEvents++;
    if (event.riskLevel === 'high' || event.riskLevel === 'critical') {
      current.suspiciousEvents++;
    }
    if (event.blocked) {
      current.blockedAttempts++;
    }
    
    current.uniqueIPs.add(event.ipAddress);
    current.lastIncident = event.timestamp;
    
    // Calcular score de riesgo promedio
    const recentEvents = this.auditLog$.value.slice(0, 100);
    const riskScores = recentEvents
      .map(e => this.calculateEventRiskScore(e))
      .filter(score => score > 0);
    
    current.riskScore = riskScores.length > 0 ? 
      riskScores.reduce((a, b) => a + b) / riskScores.length : 0;

    this.realTimeMetrics$.next({ ...current });
  }

  /**
   * Calcular score de riesgo de evento
   */
  private calculateEventRiskScore(event: SecurityEvent): number {
    let score = 0;
    
    switch (event.riskLevel) {
      case 'critical': score += 100; break;
      case 'high': score += 75; break;
      case 'medium': score += 50; break;
      case 'low': score += 25; break;
    }
    
    if (event.blocked) score += 25;
    if (event.type === 'registration_attempt') score += 10;
    
    return score;
  }

  /**
   * Actualizar nivel de amenaza global
   */
  private updateThreatLevel(): void {
    const metrics = this.realTimeMetrics$.value;
    const alertSeverities = this.securityAlerts$.value.map(a => a.severity);
    
    let level: ThreatLevel = 'low';
    
    if (metrics.riskScore > 70 || alertSeverities.includes('critical')) {
      level = 'critical';
    } else if (metrics.riskScore > 40 || alertSeverities.includes('high')) {
      level = 'high';
    } else if (metrics.riskScore > 20 || alertSeverities.includes('medium')) {
      level = 'medium';
    }
    
    this.threatLevel$.next(level);
  }

  /**
   * Utilidades helper
   */
  private generateEventId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSessionId(): string {
    return `sess-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private getClientIP(): string {
    // En producción, obtener desde headers del servidor
    return 'unknown';
  }

  private maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    return `${local.substr(0, 2)}***@${domain}`;
  }

  private getLocationFromIP(ip: string): GeoLocation | null {
    // En producción, usar servicio de geolocalización
    return { country: 'Unknown', city: 'Unknown', latitude: 0, longitude: 0 };
  }

  private analyzeUserAgent(userAgent: string): DeviceInfo {
    // Análisis básico del User Agent
    return {
      browser: userAgent.includes('Chrome') ? 'Chrome' : 'Other',
      os: userAgent.includes('Windows') ? 'Windows' : 'Other',
      isMobile: /Mobile|Android|iPhone/.test(userAgent),
      isBot: this.isAutomatedUserAgent(userAgent)
    };
  }

  private analyzeTimingPattern(): TimingAnalysis {
    return {
      requestInterval: 0, // Calcular basado en requests previos
      suspiciouslyFast: false,
      humanLikePattern: true
    };
  }

  private findCorrelatedEvents(event: SecurityEvent): string[] {
    // Buscar eventos relacionados
    return [];
  }

  private startRealTimeMonitoring(): void {
    // Monitoreo en tiempo real (websockets, polling, etc.)
  }

  private loadAuditLog(): void {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        this.auditLog$.next(parsed.map((e: any) => ({
          ...e,
          timestamp: new Date(e.timestamp)
        })));
      } catch (error) {
        console.error('Error cargando audit log:', error);
      }
    }
  }

  private saveAuditLog(log: SecurityEvent[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(log));
    } catch (error) {
      console.error('Error guardando audit log:', error);
    }
  }

  // Métodos públicos para el componente
  getAuditLog(): Observable<SecurityEvent[]> {
    return this.auditLog$.asObservable();
  }

  getSecurityAlerts(): Observable<SecurityAlert[]> {
    return this.securityAlerts$.asObservable();
  }

  getThreatLevel(): Observable<ThreatLevel> {
    return this.threatLevel$.asObservable();
  }

  getMetrics(): Observable<SecurityMetrics> {
    return this.realTimeMetrics$.asObservable();
  }

  clearAuditLog(): void {
    this.auditLog$.next([]);
    localStorage.removeItem(this.STORAGE_KEY);
  }

  exportAuditLog(): string {
    return JSON.stringify(this.auditLog$.value, null, 2);
  }
}

// Interfaces de tipos
export interface SecurityEvent {
  id: string;
  timestamp: Date;
  type: 'registration_attempt' | 'login_attempt' | 'password_breach' | 'suspicious_activity' | 'info';
  action: string;
  userId: string | null;
  ipAddress: string;
  userAgent: string;
  location: GeoLocation | null;
  details: Record<string, any>;
  riskLevel: RiskLevel;
  blocked: boolean;
  sessionId: string;
}

export interface SecurityAlert {
  id: string;
  timestamp: Date;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  affectedIP: string;
  eventCount: number;
  resolved: boolean;
  actions: string[];
}

export interface RegistrationAttemptData {
  email: string;
  password: string;
  nombre: string;
  apellido?: string;
  telefono?: string;
}

export interface SecurityValidationResult {
  allowed: boolean;
  riskScore: number;
  riskLevel: RiskLevel;
  riskFactors: string[];
  requiresAdditionalVerification: boolean;
  recommendedActions: string[];
}

export interface SecurityMetrics {
  totalEvents: number;
  suspiciousEvents: number;
  blockedAttempts: number;
  uniqueIPs: Set<string>;
  avgResponseTime: number;
  lastIncident: Date | null;
  riskScore: number;
}

export interface GeoLocation {
  country: string;
  city: string;
  latitude: number;
  longitude: number;
}

export interface DeviceInfo {
  browser: string;
  os: string;
  isMobile: boolean;
  isBot: boolean;
}

export interface TimingAnalysis {
  requestInterval: number;
  suspiciouslyFast: boolean;
  humanLikePattern: boolean;
}

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type ThreatLevel = 'low' | 'medium' | 'high' | 'critical';