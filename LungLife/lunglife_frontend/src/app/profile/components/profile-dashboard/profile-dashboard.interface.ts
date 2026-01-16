/**
 * 📊 Profile Dashboard Interfaces
 * Interfaces específicas para el componente dashboard de perfil
 */

// ========== INTERFACES PARA DASHBOARD ==========

export interface UserProfile {
  id: number;
  user_id: number;
  first_name: string;
  last_name: string;
  birth_date: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  phone?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  medical_history: string[];
  allergies: string[];
  current_medications: string[];
  lifestyle_factors: LifestyleFactors;
  occupation?: string;
  preferred_language: string;
  preferred_communication_method: 'EMAIL' | 'SMS' | 'PHONE' | 'IN_APP';
  consent_terms: boolean;
  consent_data_sharing: boolean;
  consent_marketing: boolean;
  created_at: string;
  updated_at: string;
}

export interface LifestyleFactors {
  smoking_status: 'NEVER' | 'FORMER' | 'CURRENT';
  smoking_pack_years?: number;
  alcohol_consumption: 'NONE' | 'LIGHT' | 'MODERATE' | 'HEAVY';
  exercise_frequency: 'NONE' | 'RARELY' | 'WEEKLY' | 'REGULARLY' | 'DAILY';
  sleep_hours: number;
}

// ========== INTERFACES PARA MÉTRICAS VISUALES ==========

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