// ============================================================================
// LungLife Frontend - TypeScript Interfaces
// Interfaces para comunicación con Backend API
// ============================================================================

/**
 * Enum para niveles de riesgo clínico
 */
export enum RiskLevel {
  LOW = 'LOW',
  MODERATE = 'MODERATE',
  HIGH = 'HIGH',
  VERY_HIGH = 'VERY_HIGH'
}

/**
 * Enum para género del paciente
 */
export enum Gender {
  MALE = 'M',
  FEMALE = 'F'
}

/**
 * Interface para datos del paciente en formulario
 */
export interface PatientFormData {
  patientId: string;
  age: number;
  gender: Gender;
  smoking: number;
  yellowFingers?: number;
  anxiety?: number;
  peerPressure?: number;
  chronicDisease?: number;
  fatigue?: number;
  allergy?: number;
  wheezing?: number;
  alcoholConsuming?: number;
  coughing?: number;
  shortnessOfBreath?: number;
  swallowingDifficulty?: number;
  chestPain?: number;
}

/**
 * Interface para solicitud de predicción al Backend
 */
export interface PredictionRequest extends PatientFormData {
  requestedBy?: string;  // ID del médico
  sessionId?: string;    // ID de sesión
}

/**
 * Interface para contribución de factor
 */
export interface FeatureContribution {
  feature: string;
  featureLabel: string;
  contribution: number;
  direction: 'positive' | 'negative';
}

/**
 * Interface para respuesta de predicción del Backend
 */
export interface PredictionResponse {
  // Resultados del modelo
  prediction: 0 | 1;
  probability: number;
  riskLevel: RiskLevel;
  confidence: number;

  // Metadata del modelo
  modelVersion: string;

  // Interpretabilidad (SHAP)
  topFeatures: FeatureContribution[];

  // Recomendación
  recommendation: string;

  // Timestamps
  timestamp: string;
  predictionId?: string;
}

/**
 * Interface para respuesta de error
 */
export interface ApiErrorResponse {
  error: string;
  message: string;
  statusCode: number;
  timestamp: string;
  path?: string;
}

/**
 * Interface para historial de predicciones
 */
export interface PredictionHistory {
  id: string;
  patientId: string;
  prediction: number;
  probability: number;
  riskLevel: RiskLevel;
  createdAt: string;
  createdBy: string;
}

/**
 * Type guard para verificar si es una respuesta de error
 */
export function isApiError(response: unknown): response is ApiErrorResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    'error' in response &&
    'message' in response
  );
}

/**
 * Mapeo de nombres de features a labels en español
 */
export const FEATURE_LABELS: Record<string, string> = {
  smoking: 'Tabaquismo',
  age: 'Edad',
  yellowFingers: 'Dedos amarillos',
  anxiety: 'Ansiedad',
  peerPressure: 'Presión social',
  chronicDisease: 'Enfermedad crónica',
  fatigue: 'Fatiga',
  allergy: 'Alergia',
  wheezing: 'Sibilancias',
  alcoholConsuming: 'Consumo de alcohol',
  coughing: 'Tos',
  shortnessOfBreath: 'Dificultad respiratoria',
  swallowingDifficulty: 'Dificultad para tragar',
  chestPain: 'Dolor de pecho',
  gender: 'Género'
};

/**
 * Mapeo de niveles de riesgo a colores CSS
 */
export const RISK_LEVEL_COLORS: Record<RiskLevel, string> = {
  [RiskLevel.LOW]: '#4caf50',        // Verde
  [RiskLevel.MODERATE]: '#ff9800',   // Naranja
  [RiskLevel.HIGH]: '#f44336',       // Rojo
  [RiskLevel.VERY_HIGH]: '#9c27b0'   // Púrpura
};

/**
 * Mapeo de niveles de riesgo a labels en español
 */
export const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  [RiskLevel.LOW]: 'Riesgo Bajo',
  [RiskLevel.MODERATE]: 'Riesgo Moderado',
  [RiskLevel.HIGH]: 'Riesgo Alto',
  [RiskLevel.VERY_HIGH]: 'Riesgo Muy Alto'
};
