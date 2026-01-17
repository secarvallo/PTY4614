/**
 * 📊 Profile Dashboard Interfaces
 * Interfaces específicas para el componente dashboard de perfil
 * 
 * ⚠️ NOTA: UserProfile y LifestyleFactors se importan desde '../../interfaces/profile.interface'
 * para evitar duplicación de código y mantener una fuente única de verdad.
 */

export interface DashboardMetric {
  label: string;
  value: string | number;
  color: string;
  icon: string;
  status?: 'success' | 'warning' | 'danger' | 'primary';
}

export interface HealthSummary {
  age: number;
  smokingStatus: string;
  exerciseFrequency: string;
  riskLevel?: 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH';
}