/**
 * 📝 Profile Form Interfaces
 * Interfaces específicas para el componente formulario de perfil
 */

// ========== INTERFACES PRINCIPALES PARA FORMULARIO ==========

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

// ========== OPERACIONES CRUD ESPECÍFICAS DEL FORMULARIO ==========

export interface CreateProfileRequest {
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
}

export interface UpdateProfileRequest extends Partial<CreateProfileRequest> {
  id: number;
}

// ========== INTERFACES ESPECÍFICAS PARA FORM MANAGEMENT ==========

export interface FormValidationError {
  field: string;
  message: string;
  type: 'required' | 'minlength' | 'maxlength' | 'pattern' | 'custom';
}

export interface FormTabConfig {
  id: string;
  label: string;
  icon: string;
  isComplete: boolean;
  isValid: boolean;
}

export interface FormProgressInfo {
  completedFields: number;
  totalFields: number;
  percentage: number;
}

// ========== ARRAYS DINÁMICOS PARA FORMULARIO ==========

export interface MedicalHistoryItem {
  condition: string;
}

export interface AllergyItem {
  allergen: string;
}

export interface MedicationItem {
  name: string;
}