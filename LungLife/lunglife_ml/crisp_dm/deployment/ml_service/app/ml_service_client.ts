/**
 * LungLife Backend - ML Service Client
 * Cliente para comunicación con el microservicio de ML.
 * 
 * @module services/ml-service-client
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { Logger } from '../utils/logger';

// Interfaces
interface PatientData {
    age: number;
    gender: 'Male' | 'Female';
    smokingHistory: 'Never' | 'Former' | 'Current';
    yearsSmoked: number;
    packYears: number;
    bmi: number;
    lungFunctionTestResult: number;
    familyHistoryCancer: boolean;
    exposureToToxins: boolean;
    airQualityIndex: number;
    chestPainSymptoms: boolean;
    shortnessOfBreath: boolean;
    chronicCough: boolean;
    weightLoss: boolean;
    tumorSizeCm?: number;
    occupation?: string;
    residentialArea?: string;
}

interface PredictionResult {
    prediction: 'Early' | 'Advanced';
    predictionCode: number;
    probability: number;
    confidence: number;
    riskLevel: 'low' | 'medium' | 'high';
    requiresReview: boolean;
    topFactors: Array<{
        feature: string;
        value: any;
        contribution: number;
        direction: 'positive' | 'negative';
    }>;
    modelVersion: string;
    predictionId: string;
    timestamp: string;
    processingTimeMs: number;
}

interface MLServiceConfig {
    baseUrl: string;
    timeout: number;
    maxRetries: number;
    retryDelay: number;
}

/**
 * Cliente para el Microservicio de ML.
 * Implementa patrón Circuit Breaker y reintentos con backoff.
 */
class MLServiceClient {
    private client: AxiosInstance;
    private logger: Logger;
    private config: MLServiceConfig;
    private consecutiveFailures: number = 0;
    private circuitBreakerOpen: boolean = false;
    private circuitBreakerResetTime: number = 30000; // 30 segundos

    constructor(config: MLServiceConfig) {
        this.config = config;
        this.logger = new Logger('MLServiceClient');

        this.client = axios.create({
            baseURL: config.baseUrl,
            timeout: config.timeout,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        // Interceptor para agregar headers de tracking
        this.client.interceptors.request.use((config) => {
            config.headers['X-Request-ID'] = this.generateRequestId();
            config.headers['X-Timestamp'] = new Date().toISOString();
            return config;
        });

        // Interceptor para logging de respuestas
        this.client.interceptors.response.use(
            (response) => {
                this.consecutiveFailures = 0;
                return response;
            },
            (error) => {
                this.handleError(error);
                throw error;
            }
        );
    }

    private generateRequestId(): string {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private handleError(error: AxiosError): void {
        this.consecutiveFailures++;

        if (this.consecutiveFailures >= 5) {
            this.openCircuitBreaker();
        }

        this.logger.error('ML Service error', {
            status: error.response?.status,
            message: error.message,
            consecutiveFailures: this.consecutiveFailures
        });
    }

    private openCircuitBreaker(): void {
        this.circuitBreakerOpen = true;
        this.logger.warn('Circuit breaker OPEN - ML Service no disponible');

        setTimeout(() => {
            this.circuitBreakerOpen = false;
            this.consecutiveFailures = 0;
            this.logger.info('Circuit breaker CLOSED - Reintentando conexión');
        }, this.circuitBreakerResetTime);
    }

    /**
     * Verifica si el servicio está disponible.
     */
    async healthCheck(): Promise<boolean> {
        try {
            const response = await this.client.get('/api/v1/health');
            return response.data.status === 'healthy';
        } catch (error) {
            return false;
        }
    }

    /**
     * Realiza una predicción con reintentos automáticos.
     */
    async predict(patientData: PatientData): Promise<PredictionResult> {
        if (this.circuitBreakerOpen) {
            throw new Error('ML Service no disponible (Circuit Breaker activo)');
        }

        const transformedData = this.transformToSnakeCase(patientData);

        for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
            try {
                const response = await this.client.post<PredictionResult>(
                    '/api/v1/predict',
                    transformedData
                );

                return this.transformToCamelCase(response.data);

            } catch (error) {
                if (attempt === this.config.maxRetries) {
                    throw error;
                }

                const delay = this.config.retryDelay * Math.pow(2, attempt - 1);
                this.logger.warn(`Reintento ${attempt}/${this.config.maxRetries} en ${delay}ms`);
                await this.sleep(delay);
            }
        }

        throw new Error('Máximo de reintentos alcanzado');
    }

    private transformToSnakeCase(data: PatientData): object {
        return {
            age: data.age,
            gender: data.gender,
            smoking_history: data.smokingHistory,
            years_smoked: data.yearsSmoked,
            pack_years: data.packYears,
            bmi: data.bmi,
            lung_function_test_result: data.lungFunctionTestResult,
            family_history_cancer: data.familyHistoryCancer,
            exposure_to_toxins: data.exposureToToxins,
            air_quality_index: data.airQualityIndex,
            chest_pain_symptoms: data.chestPainSymptoms,
            shortness_of_breath: data.shortnessOfBreath,
            chronic_cough: data.chronicCough,
            weight_loss: data.weightLoss,
            tumor_size_cm: data.tumorSizeCm,
            occupation: data.occupation,
            residential_area: data.residentialArea
        };
    }

    private transformToCamelCase(data: any): PredictionResult {
        return {
            prediction: data.prediction,
            predictionCode: data.prediction_code,
            probability: data.probability,
            confidence: data.confidence,
            riskLevel: data.risk_level,
            requiresReview: data.requires_review,
            topFactors: data.top_factors?.map((f: any) => ({
                feature: f.feature,
                value: f.value,
                contribution: f.contribution,
                direction: f.direction
            })) || [],
            modelVersion: data.model_version,
            predictionId: data.prediction_id,
            timestamp: data.timestamp,
            processingTimeMs: data.processing_time_ms
        };
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Exportar instancia configurada
export const mlServiceClient = new MLServiceClient({
    baseUrl: process.env.ML_SERVICE_URL || 'http://ml-service:8000',
    timeout: 10000,
    maxRetries: 3,
    retryDelay: 1000
});

export { MLServiceClient, PatientData, PredictionResult };
