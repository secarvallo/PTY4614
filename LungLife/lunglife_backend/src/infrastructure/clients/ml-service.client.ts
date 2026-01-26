/**
 * ML Service Client
 * HTTP client for communicating with the LungLife ML prediction microservice.
 * Implements retry logic, timeout handling, and error management.
 * 
 * @author LungLife Team
 * @version 1.0.0
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { config } from '../config/config';

// ============================================
// Types & Interfaces
// ============================================

/**
 * Patient data required for ML prediction
 * Based on the 29 features used by the model
 */
export interface MLPatientData {
  // Demographics
  age: number;
  gender: 'Male' | 'Female';
  
  // Smoking history
  yearsSmoked: number;
  packYears: number;
  smokingHistory: 'Never' | 'Former' | 'Current';
  
  // Physical measurements
  bmi: number;
  
  // Clinical data
  lungFunctionTestResult: number;
  tumorSizeCm: number;
  
  // Environmental factors
  airQualityIndex: number;
  exposureToToxins: boolean;
  residentialArea: 'Urban' | 'Suburban' | 'Rural';
  
  // Symptoms
  chestPainSymptoms: boolean;
  shortnessOfBreath: boolean;
  chronicCough: boolean;
  weightLoss: boolean;
  
  // Medical history
  familyHistoryCancer: boolean;
  previousCancerDiagnosis: boolean;
  comorbidities?: string;
  
  // Lifestyle
  physicalActivityLevel: 'Low' | 'Moderate' | 'High';
  dietaryHabits: 'Poor' | 'Average' | 'Good';
  occupation: string;
}

/**
 * ML Service prediction response
 */
export interface MLPredictionResult {
  prediction: 'Early' | 'Advanced';
  probability: number;
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH';
  confidence: number;
  requiresReview: boolean;
  topRiskFactors: Array<{
    featureName: string;
    contribution: number;
    direction: string;
  }>;
  recommendation: string;
  timestamp: string;
  modelVersion: string;
}

/**
 * ML Service health status
 */
export interface MLHealthStatus {
  status: 'healthy' | 'unhealthy';
  modelLoaded: boolean;
  uptimeSeconds: number;
  version: string;
}

// ============================================
// ML Service Client Class
// ============================================

export class MLServiceClient {
  private readonly client: AxiosInstance;
  private readonly baseUrl: string;
  private readonly maxRetries: number;
  private readonly timeout: number;

  constructor() {
    // Configuration from environment
    this.baseUrl = process.env.ML_SERVICE_URL || 'http://localhost:8000';
    this.maxRetries = parseInt(process.env.ML_SERVICE_MAX_RETRIES || '3');
    this.timeout = parseInt(process.env.ML_SERVICE_TIMEOUT || '30000');

    // Create axios instance
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    // Setup request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        console.log(`[MLService] Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('[MLService] Request error:', error.message);
        return Promise.reject(error);
      }
    );

    // Setup response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        console.log(`[MLService] Response: ${response.status} from ${response.config.url}`);
        return response;
      },
      (error: AxiosError) => {
        console.error(`[MLService] Response error: ${error.message}`, {
          status: error.response?.status,
          url: error.config?.url,
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Generate prediction for patient data
   * @param patientData - Patient clinical and demographic data
   * @returns Prediction result from ML model
   */
  async predict(patientData: MLPatientData): Promise<MLPredictionResult> {
    const payload = this.transformToSnakeCase(patientData);

    return this.executeWithRetry(async () => {
      const response = await this.client.post<any>('/api/v1/predict', payload);
      return this.transformPredictionResponse(response.data);
    });
  }

  /**
   * Check ML service health status
   */
  async healthCheck(): Promise<MLHealthStatus> {
    try {
      const response = await this.client.get('/api/v1/health');
      return {
        status: response.data.status || 'healthy',
        modelLoaded: response.data.model_loaded ?? true,
        uptimeSeconds: response.data.uptime_seconds || 0,
        version: response.data.version || '1.0.0',
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        modelLoaded: false,
        uptimeSeconds: 0,
        version: 'unknown',
      };
    }
  }

  /**
   * Check if ML service is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const health = await this.healthCheck();
      return health.status === 'healthy' && health.modelLoaded;
    } catch {
      return false;
    }
  }

  /**
   * Execute request with exponential backoff retry
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    attempt: number = 1
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (attempt >= this.maxRetries) {
        throw this.createServiceError(error as AxiosError);
      }

      const isRetryable = this.isRetryableError(error as AxiosError);
      if (!isRetryable) {
        throw this.createServiceError(error as AxiosError);
      }

      const delay = Math.pow(2, attempt) * 1000;
      console.log(`[MLService] Retry attempt ${attempt}/${this.maxRetries}, waiting ${delay}ms`);

      await this.sleep(delay);
      return this.executeWithRetry(operation, attempt + 1);
    }
  }

  /**
   * Determine if error is retryable
   */
  private isRetryableError(error: AxiosError): boolean {
    if (!error.response) {
      return true; // Network errors are retryable
    }
    const retryableStatuses = [408, 429, 500, 502, 503, 504];
    return retryableStatuses.includes(error.response.status);
  }

  /**
   * Create a standardized service error
   */
  private createServiceError(error: AxiosError): Error {
    if (!error.response) {
      return new Error('ML Service no disponible. Por favor intente más tarde.');
    }

    const status = error.response.status;
    switch (status) {
      case 400:
        return new Error('Datos de paciente inválidos para predicción.');
      case 422:
        return new Error('Formato de datos incorrecto para el modelo ML.');
      case 500:
        return new Error('Error interno del servicio ML.');
      default:
        return new Error(`Error del servicio ML: ${error.message}`);
    }
  }

  /**
   * Transform object keys from camelCase to snake_case
   */
  private transformToSnakeCase(obj: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
      const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      result[snakeKey] = value;
    }

    return result;
  }

  /**
   * Transform ML response to standardized format
   */
  private transformPredictionResponse(data: any): MLPredictionResult {
    // Map risk_level from ML service to our format
    const riskLevelMap: Record<string, 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH'> = {
      'low': 'LOW',
      'LOW': 'LOW',
      'medium': 'MODERATE',
      'MODERATE': 'MODERATE',
      'high': 'HIGH',
      'HIGH': 'HIGH',
      'very_high': 'VERY_HIGH',
      'VERY_HIGH': 'VERY_HIGH',
      'critical': 'VERY_HIGH',
      'CRITICAL': 'VERY_HIGH',
    };

    return {
      prediction: data.prediction || 'Early',
      probability: data.probability || data.risk_score / 100 || 0.5,
      riskLevel: riskLevelMap[data.risk_level] || 'MODERATE',
      confidence: data.confidence || 0.85,
      requiresReview: data.requires_review ?? false,
      topRiskFactors: (data.top_risk_factors || data.risk_factors || []).map((f: any) => ({
        featureName: f.feature_name || f.name || f.featureName,
        contribution: f.contribution || 0,
        direction: f.direction || 'increases',
      })),
      recommendation: data.recommendation || data.recommendations || '',
      timestamp: data.timestamp || new Date().toISOString(),
      modelVersion: data.model_version || '1.0.0',
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const mlServiceClient = new MLServiceClient();
