/**
 * Profile Enums - LungLife
 * Enums sincronizados con backend para garantizar consistencia
 */

/**
 * Estado de fumador
 * Sincronizado con: backend/core/interfaces/profile.interface.ts > SmokingStatus
 */
export enum SmokingStatus {
  NEVER = 'NEVER',
  FORMER = 'FORMER',
  CURRENT = 'CURRENT'
}

/**
 * Género del usuario
 * Sincronizado con: backend/core/interfaces/profile.interface.ts > Gender
 */
export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
  PREFER_NOT_TO_SAY = 'PREFER_NOT_TO_SAY'
}

/**
 * Categoría de riesgo de cáncer pulmonar
 * Sincronizado con: backend/core/interfaces/profile.interface.ts > RiskCategory
 */
export enum RiskCategory {
  LOW = 'LOW',
  MODERATE = 'MODERATE',
  HIGH = 'HIGH',
  VERY_HIGH = 'VERY_HIGH'
}

/**
 * Roles de usuario
 * Sincronizado con: backend/core/interfaces/profile.interface.ts > UserRole
 */
export enum UserRole {
  PATIENT = 'PATIENT',
  HEALTH_PROFESSIONAL = 'HEALTH_PROFESSIONAL',
  ADMIN = 'ADMIN',
  RESEARCHER = 'RESEARCHER'
}

/**
 * Consumo de alcohol
 */
export enum AlcoholConsumption {
  NONE = 'NONE',
  LIGHT = 'LIGHT',
  MODERATE = 'MODERATE',
  HEAVY = 'HEAVY'
}

/**
 * Frecuencia de ejercicio
 */
export enum ExerciseFrequency {
  NONE = 'NONE',
  RARELY = 'RARELY',
  WEEKLY = 'WEEKLY',
  REGULARLY = 'REGULARLY',
  DAILY = 'DAILY'
}

/**
 * Método de comunicación preferido
 */
export enum CommunicationMethod {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  PHONE = 'PHONE',
  IN_APP = 'IN_APP'
}

/**
 * Tipos de métricas de salud
 */
export enum HealthMetricType {
  BLOOD_PRESSURE = 'BLOOD_PRESSURE',
  HEART_RATE = 'HEART_RATE',
  WEIGHT = 'WEIGHT',
  HEIGHT = 'HEIGHT',
  BMI = 'BMI',
  OXYGEN_SATURATION = 'OXYGEN_SATURATION'
}
