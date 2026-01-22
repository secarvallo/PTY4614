/**
 * Profile Shared Interfaces - LungLife
 * Interfaces compartidas para servicios y estado global del módulo de perfil
 */

import {
  SmokingStatus,
  Gender,
  RiskCategory,
  AlcoholConsumption,
  ExerciseFrequency,
  CommunicationMethod,
  HealthMetricType
} from './profile.enums';

// ========== PERFIL BASE ==========

export interface LifestyleFactors {
  smokingStatus: SmokingStatus;
  smokingPackYears?: number;
  alcoholConsumption: AlcoholConsumption;
  exerciseFrequency: ExerciseFrequency;
  sleepHours: number;
}

export interface UserProfile {
  id?: number;
  userId: number;
  firstName: string;
  lastName: string;
  birthDate: string;
  gender: Gender;
  phone?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  
  // Historial médico (arrays de strings para el servicio)
  medicalHistory: string[];
  allergies: string[];
  currentMedications: string[];
  
  // Factores de estilo de vida
  lifestyleFactors: LifestyleFactors;
  
  // Información adicional
  occupation?: string;
  preferredLanguage: string;
  preferredCommunicationMethod: CommunicationMethod;
  
  // Consentimientos
  consentTerms: boolean;
  consentDataSharing: boolean;
  consentMarketing: boolean;
  
  // Timestamps
  createdAt?: string;
  updatedAt?: string;
}

// ========== OPERACIONES CRUD ==========

export interface CreateProfileRequest extends Omit<UserProfile, 'id' | 'created_at' | 'updated_at'> {}

export interface UpdateProfileRequest extends Partial<Omit<UserProfile, 'id' | 'user_id' | 'created_at' | 'updated_at'>> {}

// ========== EVALUACIÓN DE RIESGO ==========

export interface RiskAssessment {
  id?: number;
  userId: number;
  riskScore: number;
  riskLevel: RiskCategory;
  factors: {
    ageRisk: number;
    smokingRisk: number;
    familyHistoryRisk: number;
    environmentalRisk: number;
    lifestyleRisk: number;
  };
  recommendations: string[];
  assessmentDate: string;
  createdAt?: string;
}

// ========== MÉTRICAS DE SALUD ==========

export interface HealthMetric {
  id?: number;
  userId: number;
  metricType: HealthMetricType;
  value: number;
  unit: string;
  measuredAt: string;
  notes?: string;
  createdAt?: string;
}

// ========== ESTADO GLOBAL ==========

export interface ProfileState {
  currentProfile: UserProfile | null;
  loading: boolean;
  error: string | null;
  lastUpdated: string | null;
}