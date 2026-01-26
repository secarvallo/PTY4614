/**
 * LungLife Backend - ML Service Client
 * 
 * HTTP client for communicating with the ML prediction microservice.
 * Implements retry logic, timeout handling, and error management.
 * 
 * @author LungLife Team
 * @version 1.0.0
 */

import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from '../utils/logger';

// Types
interface PatientData {
  age: number;
  gender: 'Male' | 'Female';
  yearsSmoked: number;
  packYears: number;
  smokingHistory: 'Never' | 'Former' | 'Current';
  bmi: number;
  lungFunctionTestResult: number;
  airQualityIndex: number;
  exposureToToxins: boolean;
  residentialArea: string;
  tumorSizeCm: number;
  chestPainSymptoms: boolean;
  shortnessOfBreath: boolean;
  chronicCough: boolean;
  weightLoss: boolean;
  familyHistoryCancer: boolean;
  previousCancerDiagnosis: boolean;
  comorbidities?: string;
  physicalActivityLevel: string;
  dietaryHabits: string;
  occupation: string;
}

interface PredictionResult {
  prediction: 'Early' | 'Advanced';
  probability: number;
  riskLevel: 'low' | 'medium' | 'high';
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

interface MLServiceConfig {
  baseUrl: string;
  apiKey: string;
  timeout: number;
  maxRetries: number;
}

/**
 * ML Service HTTP Client
 * 
 * Handles all communication with the ML prediction microservice.
 */
export class MLServiceClient {
  private readonly client: AxiosInstance;
  private readonly config: MLServiceConfig;
  private readonly logger: Logger;

  constructor(config: Partial<MLServiceConfig> = {}) {
    this.config = {
      baseUrl: process.env.ML_SERVICE_URL || 'http://ml-service:8000/api/v1',
      apiKey: process.env.ML_SERVICE_API_KEY || '',
      timeout: parseInt(process.env.ML_SERVICE_TIMEOUT || '30000'),
      maxRetries: parseInt(process.env.ML_SERVICE_MAX_RETRIES || '3'),
      ...config,
    };

    this.logger = new Logger('MLServiceClient');

    this.client = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  /**
   * Configure request/response interceptors
   */
  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        const requestId = uuidv4();
        config.headers['X-API-Key'] = this.config.apiKey;
        config.headers['X-Request-ID'] = requestId;

        this.logger.info('ML Service request', {
          requestId,
          method: config.method,
          url: config.url,
        });

        return config;
      },
      (error) => {
        this.logger.error('Request configuration error', { error });
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        this.logger.info('ML Service response', {
          requestId: response.config.headers['X-Request-ID'],
          status: response.status,
        });
        return response;
      },
      (error: AxiosError) => {
        this.logger.error('ML Service error', {
          requestId: error.config?.headers?.['X-Request-ID'],
          status: error.response?.status,
          message: error.message,
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Generate prediction for patient data
   * 
   * @param patientData - Patient clinical and demographic data
   * @returns Prediction result from ML model
   * @throws Error if prediction fails after all retries
   */
  async predict(patientData: PatientData): Promise<PredictionResult> {
    const payload = this.transformToSnakeCase(patientData);

    return this.executeWithRetry(async () => {
      const response = await this.client.post<PredictionResult>(
        '/predict/',
        payload
      );
      return this.transformToCamelCase(response.data);
    });
  }

  /**
   * Check ML service health status
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health/');
      return response.status === 200 && response.data.status === 'healthy';
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
      if (attempt >= this.config.maxRetries) {
        throw error;
      }

      const isRetryable = this.isRetryableError(error as AxiosError);
      if (!isRetryable) {
        throw error;
      }

      const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
      this.logger.warn(`Retry attempt ${attempt}/${this.config.maxRetries}`, {
        delay,
      });

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
   * Transform object keys from snake_case to camelCase
   */
  private transformToCamelCase(obj: Record<string, any>): any {
    if (Array.isArray(obj)) {
      return obj.map(item => this.transformToCamelCase(item));
    }

    if (obj !== null && typeof obj === 'object') {
      const result: Record<string, any> = {};

      for (const [key, value] of Object.entries(obj)) {
        const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        result[camelKey] = this.transformToCamelCase(value);
      }

      return result;
    }

    return obj;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const mlServiceClient = new MLServiceClient();
