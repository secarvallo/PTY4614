/**
 * 🧑‍⚕️ User Profile Domain Interfaces
 * Extended domain interfaces for LungLife user profiles and risk assessment
 */

import { IUser } from './repository.interface';

export enum UserRole {
  PATIENT = 'patient',
  HEALTH_PROFESSIONAL = 'health_professional',
  ADMIN = 'admin',
  RESEARCHER = 'researcher'
}

export enum SmokingStatus {
  NEVER = 'never',
  FORMER = 'former',
  CURRENT = 'current'
}

export enum RiskCategory {
  LOW = 'low',
  MODERATE = 'moderate',
  HIGH = 'high',
  VERY_HIGH = 'very_high'
}

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
  PREFER_NOT_TO_SAY = 'prefer_not_to_say'
}

// ===== CORE DOMAIN ENTITIES =====

export interface IUserProfile {
  id: number;
  userId: number;
  
  // Personal Information
  dateOfBirth?: Date;
  gender?: Gender;
  heightCm?: number;
  weightKg?: number;
  
  // Smoking History (Critical for risk assessment)
  smokingStatus?: SmokingStatus;
  smokingStartAge?: number;
  smokingQuitAge?: number;
  cigarettesPerDay?: number;
  packYears?: number;
  
  // Environmental & Genetic Factors
  occupationalExposure?: string[];
  familyHistoryLungCancer?: boolean;
  previousLungDisease?: boolean;
  radiationExposure?: boolean;
  
  // Location Demographics
  country?: string;
  city?: string;
  airQualityIndex?: number;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

export interface IRiskAssessment {
  id: number;
  userId: number;
  
  // Risk Calculation
  riskScore: number; // 0.000 to 1.000 (percentage)
  riskCategory: RiskCategory;
  
  // Model Information
  modelVersion: string;
  calculationMethod: string;
  
  // Assessment Details
  assessedBy?: number; // Health professional user ID
  assessmentNotes?: string;
  recommendations?: string;
  
  // Timing
  assessedAt: Date;
  validUntil?: Date;
  
  // Calculation factors (flexible JSON)
  factorsUsed?: Record<string, any>;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

export interface IHealthMetric {
  id: number;
  userId: number;
  
  // Measurement Data
  metricType: string; // 'spirometry', 'blood_pressure', 'oxygen_saturation'
  metricValue: number;
  metricUnit: string;
  
  // Source Information
  measuredBy?: string; // 'self_reported', 'device', 'professional'
  deviceId?: string;
  
  // Timing & Context
  measuredAt: Date;
  notes?: string;
  
  // Metadata
  createdAt: Date;
}

export interface IRolePermission {
  id: number;
  roleName: UserRole;
  permission: string; // 'read', 'write', 'delete', 'create'
  resource: string; // 'own_profile', 'patient_profiles', 'all_users'
  createdAt: Date;
}

// ===== EXTENDED USER INTERFACE =====

export interface IExtendedUser extends IUser {
  role: UserRole;
  profileCompleted: boolean;
  specialty?: string; // For health professionals
  licenseNumber?: string; // For health professionals
  institution?: string; // For professionals/admins
}

// ===== DATA TRANSFER OBJECTS =====

export interface CreateUserProfileDTO {
  userId: number;
  dateOfBirth?: Date;
  gender?: Gender;
  heightCm?: number;
  weightKg?: number;
  smokingStatus?: SmokingStatus;
  smokingStartAge?: number;
  smokingQuitAge?: number;
  cigarettesPerDay?: number;
  occupationalExposure?: string[];
  familyHistoryLungCancer?: boolean;
  previousLungDisease?: boolean;
  radiationExposure?: boolean;
  country?: string;
  city?: string;
  airQualityIndex?: number;
}

export interface UpdateUserProfileDTO extends Partial<CreateUserProfileDTO> {}

export interface CreateRiskAssessmentDTO {
  userId: number;
  riskScore: number;
  riskCategory: RiskCategory;
  modelVersion: string;
  calculationMethod: string;
  assessedBy?: number;
  assessmentNotes?: string;
  recommendations?: string;
  validUntil?: Date;
  factorsUsed?: Record<string, any>;
}

export interface CreateHealthMetricDTO {
  userId: number;
  metricType: string;
  metricValue: number;
  metricUnit: string;
  measuredBy?: string;
  deviceId?: string;
  measuredAt?: Date;
  notes?: string;
}

// ===== QUERY/FILTER INTERFACES =====

export interface UserProfileQueryOptions {
  userId?: number;
  role?: UserRole;
  profileCompleted?: boolean;
  riskCategory?: RiskCategory;
  lastAssessmentBefore?: Date;
  lastAssessmentAfter?: Date;
  limit?: number;
  offset?: number;
  includeAssessments?: boolean;
  includeMetrics?: boolean;
}

export interface HealthMetricsQueryOptions {
  userId?: number;
  metricType?: string;
  measuredAfter?: Date;
  measuredBefore?: Date;
  measuredBy?: string;
  limit?: number;
  offset?: number;
}

export interface RiskAssessmentQueryOptions {
  userId?: number;
  assessedBy?: number;
  riskCategory?: RiskCategory;
  assessedAfter?: Date;
  assessedBefore?: Date;
  includeExpired?: boolean;
  limit?: number;
  offset?: number;
}

// ===== AGGREGATED DATA INTERFACES =====

export interface UserProfileSummary {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  profileCompleted: boolean;
  smokingStatus?: SmokingStatus;
  packYears?: number;
  riskScore?: number;
  riskCategory?: RiskCategory;
  lastAssessment?: Date;
  totalMetrics: number;
}

export interface RiskTrends {
  userId: number;
  assessments: Array<{
    date: Date;
    riskScore: number;
    riskCategory: RiskCategory;
  }>;
  trend: 'improving' | 'stable' | 'worsening';
}

export interface DashboardStats {
  totalPatients: number;
  highRiskPatients: number;
  assessmentsThisMonth: number;
  avgRiskScore: number;
  riskDistribution: Record<RiskCategory, number>;
}

// ===== VALIDATION SCHEMAS =====

export interface UserProfileValidation {
  heightCm?: { min: number; max: number };
  weightKg?: { min: number; max: number };
  smokingStartAge?: { min: number; max: number };
  cigarettesPerDay?: { min: number; max: number };
  airQualityIndex?: { min: number; max: number };
}

export interface RiskAssessmentValidation {
  riskScore: { min: number; max: number };
  modelVersions: string[];
  calculationMethods: string[];
  requiredFactors: string[];
}

// ===== ERROR INTERFACES =====

export interface ProfileError extends Error {
  code: 'PROFILE_NOT_FOUND' | 'INVALID_PROFILE_DATA' | 'UNAUTHORIZED_ACCESS' | 'INCOMPLETE_PROFILE';
  details?: Record<string, any>;
}

export interface AssessmentError extends Error {
  code: 'ASSESSMENT_NOT_FOUND' | 'INVALID_RISK_DATA' | 'MODEL_NOT_AVAILABLE' | 'INSUFFICIENT_DATA';
  details?: Record<string, any>;
}