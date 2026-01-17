/**
 * 📝 Profile Form Interfaces
 * Interfaces específicas para el componente formulario de perfil
 * 
 * ⚠️ NOTA: UserProfile y LifestyleFactors se importan desde '../../interfaces/profile.interface'
 * para evitar duplicación de código y mantener una fuente única de verdad.
 */

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