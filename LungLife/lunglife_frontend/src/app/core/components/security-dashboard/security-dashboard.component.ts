import { Component, OnInit, OnDestroy, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Observable, combineLatest } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';

// Servicios de seguridad
import { SecurityAuditService, SecurityEvent, SecurityAlert, SecurityMetrics } from '../../services/security-audit.service';
import { PasswordBreachValidatorService } from '../../services/password-breach-validator.service';

/**
 * 📊 Dashboard de Seguridad - Monitoreo en Tiempo Real
 * 
 * Características:
 * - Visualización de métricas de seguridad en tiempo real
 * - Alertas y eventos sospechosos
 * - Análisis de patrones de ataque
 * - Exportación de datos para análisis
 */
@Component({
  selector: 'app-security-dashboard',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './security-dashboard.component.html',
  styleUrls: ['./security-dashboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SecurityDashboardComponent implements OnInit, OnDestroy {
  
  private securityAudit = inject(SecurityAuditService);
  private passwordValidator = inject(PasswordBreachValidatorService);
  
  private destroy$ = new Subject<void>();

  // Observables para el template
  threatLevel$: Observable<string>;
  metrics$: Observable<SecurityMetrics>;
  passwordMetrics$: Observable<any>;
  alerts$: Observable<SecurityAlert[]>;
  recentEvents$: Observable<SecurityEvent[]>;

  constructor() {
    // Inicializar observables
    this.threatLevel$ = this.securityAudit.getThreatLevel();
    this.metrics$ = this.securityAudit.getMetrics();
    this.passwordMetrics$ = this.passwordValidator.getSecurityMetrics();
    this.alerts$ = this.securityAudit.getSecurityAlerts();
    this.recentEvents$ = this.securityAudit.getAuditLog().pipe(
      map(events => events.slice(0, 20))
    );
  }

  ngOnInit(): void {
    // Auto-refresh cada 30 segundos
    this.startAutoRefresh();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Obtener clase CSS para nivel de amenaza
   */
  getThreatLevelClass(level: string | null): string {
    switch (level) {
      case 'critical': return 'threat-critical';
      case 'high': return 'threat-high';
      case 'medium': return 'threat-medium';
      case 'low': return 'threat-low';
      default: return 'threat-unknown';
    }
  }

  /**
   * Obtener clase CSS para score de riesgo
   */
  getRiskScoreClass(score: number): string {
    if (score >= 80) return 'critical';
    if (score >= 60) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  }

  /**
   * Obtener icono para severidad de alerta
   */
  getAlertIcon(severity: string): string {
    switch (severity) {
      case 'critical': return 'alert-circle';
      case 'high': return 'warning';
      case 'medium': return 'information-circle';
      case 'low': return 'checkmark-circle';
      default: return 'help-circle';
    }
  }

  /**
   * Obtener icono para tipo de evento
   */
  getEventIcon(type: string): string {
    switch (type) {
      case 'registration_attempt': return 'person-add';
      case 'login_attempt': return 'log-in';
      case 'password_breach': return 'key';
      case 'suspicious_activity': return 'warning';
      case 'info': return 'information-circle';
      default: return 'ellipse';
    }
  }

  /**
   * Limpiar log de auditoría
   */
  async clearAuditLog(): Promise<void> {
    const confirmed = confirm('¿Estás seguro de que quieres limpiar todo el log de auditoría?');
    if (confirmed) {
      this.securityAudit.clearAuditLog();
      
      // Mostrar confirmación
      console.log('✅ Log de auditoría limpiado');
    }
  }

  /**
   * Exportar log de auditoría
   */
  async exportAuditLog(): Promise<void> {
    try {
      const auditData = this.securityAudit.exportAuditLog();
      const passwordData = JSON.stringify(await this.passwordValidator.getSecurityMetrics().toPromise(), null, 2);
      
      const exportData = {
        timestamp: new Date().toISOString(),
        auditLog: JSON.parse(auditData),
        passwordMetrics: JSON.parse(passwordData),
        summary: await this.generateSummaryReport()
      };

      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(dataBlob);
      link.download = `security-audit-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      
      console.log('📊 Datos de seguridad exportados');
    } catch (error) {
      console.error('Error exportando datos:', error);
    }
  }

  /**
   * Actualizar datos
   */
  refreshData(): void {
    // Los observables se actualizarán automáticamente
    console.log('🔄 Datos actualizados');
  }

  /**
   * Generar reporte resumen
   */
  private async generateSummaryReport(): Promise<any> {
    const metricsSnapshot = await this.metrics$.toPromise();
    const passwordMetricsSnapshot = await this.passwordMetrics$.toPromise();
    const alertsSnapshot = await this.alerts$.toPromise();
    const threatLevelSnapshot = await this.threatLevel$.toPromise();

    return {
      generatedAt: new Date().toISOString(),
      threatLevel: threatLevelSnapshot,
      totalEvents: metricsSnapshot?.totalEvents || 0,
      suspiciousEvents: metricsSnapshot?.suspiciousEvents || 0,
      blockedAttempts: metricsSnapshot?.blockedAttempts || 0,
      riskScore: metricsSnapshot?.riskScore || 0,
      activeAlerts: alertsSnapshot?.filter(a => !a.resolved).length || 0,
      passwordValidations: passwordMetricsSnapshot?.totalValidations || 0,
      breachedPasswords: passwordMetricsSnapshot?.breachedAttempts || 0,
      recommendedActions: this.getRecommendedActions(metricsSnapshot || null, alertsSnapshot || null)
    };
  }

  /**
   * Obtener acciones recomendadas basadas en métricas
   */
  private getRecommendedActions(metrics: SecurityMetrics | null, alerts: SecurityAlert[] | null): string[] {
    const actions: string[] = [];

    if (!metrics || !alerts) return actions;

    // Basado en score de riesgo
    if (metrics.riskScore > 70) {
      actions.push('Implementar restricciones de IP más estrictas');
      actions.push('Activar verificación en dos pasos obligatoria');
    }

    // Basado en eventos sospechosos
    const suspiciousRate = metrics.totalEvents > 0 ? 
      (metrics.suspiciousEvents / metrics.totalEvents) * 100 : 0;
    
    if (suspiciousRate > 20) {
      actions.push('Revisar y ajustar algoritmos de detección');
      actions.push('Considerar implementar CAPTCHA');
    }

    // Basado en alertas activas
    const criticalAlerts = alerts.filter(a => a.severity === 'critical' && !a.resolved);
    if (criticalAlerts.length > 0) {
      actions.push('Atender inmediatamente alertas críticas');
      actions.push('Contactar equipo de respuesta a incidentes');
    }

    // Basado en intentos bloqueados
    if (metrics.blockedAttempts > 50) {
      actions.push('Investigar patrones de ataque automatizado');
      actions.push('Considerar blacklist de IPs persistentemente maliciosas');
    }

    return actions.length > 0 ? actions : ['Sistema funcionando normalmente - mantener monitoreo'];
  }

  /**
   * Iniciar actualización automática
   */
  private startAutoRefresh(): void {
    // Actualizar cada 30 segundos
    setInterval(() => {
      // Los observables ya manejan la actualización automática
      // Este interval es para cualquier lógica adicional si es necesaria
    }, 30000);
  }

  /**
   * Métodos de utilidad para el template
   */
  
  /**
   * Formatear número con separadores de miles
   */
  formatNumber(value: number | null | undefined): string {
    if (value == null) return '0';
    return value.toLocaleString();
  }

  /**
   * Obtener color para métrica basado en valor
   */
  getMetricColor(value: number, thresholds: { high: number; medium: number }): string {
    if (value >= thresholds.high) return 'danger';
    if (value >= thresholds.medium) return 'warning';
    return 'success';
  }

  /**
   * Verificar si hay alertas críticas sin resolver
   */
  hasCriticalAlerts(alerts: SecurityAlert[] | null): boolean {
    return alerts ? alerts.some(a => a.severity === 'critical' && !a.resolved) : false;
  }

  /**
   * Obtener eventos de las últimas 24 horas
   */
  getRecentEventsCount(events: SecurityEvent[] | null): number {
    if (!events) return 0;
    
    const last24Hours = Date.now() - (24 * 60 * 60 * 1000);
    return events.filter(e => e.timestamp.getTime() > last24Hours).length;
  }

  /**
   * Calcular tasa de éxito de registros
   */
  calculateSuccessRate(metrics: SecurityMetrics | null): number {
    if (!metrics || metrics.totalEvents === 0) return 100;
    
    const successfulEvents = metrics.totalEvents - metrics.blockedAttempts;
    return (successfulEvents / metrics.totalEvents) * 100;
  }
}