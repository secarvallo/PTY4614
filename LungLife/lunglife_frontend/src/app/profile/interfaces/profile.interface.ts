/**
 * Profile Shared Interfaces - LungLife
 * Interfaces compartidas para servicios y estado global del módulo de perfil
 */

// ========== PERFIL BASE ==========

export interface LifestyleFactors {
  smoking_status: 'NEVER' | 'FORMER' | 'CURRENT';
  smoking_pack_years?: number;
  alcohol_consumption: 'NONE' | 'LIGHT' | 'MODERATE' | 'HEAVY';
  exercise_frequency: 'NONE' | 'RARELY' | 'WEEKLY' | 'REGULARLY' | 'DAILY';
  sleep_hours: number;
}

export interface UserProfile {
  id?: number;
  user_id: number;
  first_name: string;
  last_name: string;
  birth_date: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  phone?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  
  // Historial médico (arrays de strings para el servicio)
  medical_history: string[];
  allergies: string[];
  current_medications: string[];
  
  // Factores de estilo de vida
  lifestyle_factors: LifestyleFactors;
  
  // Información adicional
  occupation?: string;
  preferred_language: string;
  preferred_communication_method: 'EMAIL' | 'SMS' | 'PHONE' | 'IN_APP';
  
  // Consentimientos
  consent_terms: boolean;
  consent_data_sharing: boolean;
  consent_marketing: boolean;
  
  // Timestamps
  created_at?: string;
  updated_at?: string;
}

// ========== OPERACIONES CRUD ==========

export interface CreateProfileRequest extends Omit<UserProfile, 'id' | 'created_at' | 'updated_at'> {}

export interface UpdateProfileRequest extends Partial<Omit<UserProfile, 'id' | 'user_id' | 'created_at' | 'updated_at'>> {}

// ========== EVALUACIÓN DE RIESGO ==========

export interface RiskAssessment {
  id?: number;
  user_id: number;
  risk_score: number;
  risk_level: 'low' | 'medium' | 'high' | 'very_high';
  factors: {
    age_risk: number;
    smoking_risk: number;
    family_history_risk: number;
    environmental_risk: number;
    lifestyle_risk: number;
  };
  recommendations: string[];
  assessment_date: string;
  created_at?: string;
}

// ========== MÉTRICAS DE SALUD ==========

export interface HealthMetric {
  id?: number;
  user_id: number;
  metric_type: 'blood_pressure' | 'heart_rate' | 'weight' | 'height' | 'bmi' | 'oxygen_saturation';
  value: number;
  unit: string;
  measured_at: string;
  notes?: string;
  created_at?: string;
}

// ========== ESTADO GLOBAL ==========

export interface ProfileState {
  currentProfile: UserProfile | null;
  loading: boolean;
  error: string | null;
  lastUpdated: string | null;
}