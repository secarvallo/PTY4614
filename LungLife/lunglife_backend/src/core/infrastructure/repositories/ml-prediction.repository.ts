/**
 * 🎯 ML Predictions Repository Implementation
 * Handles risk predictions according to BD v5.0 schema
 * Uses: ml_predictions table
 */

import { IDatabaseConnection } from '../../interfaces/database.interface';
import { IRepository } from '../../interfaces/repository.interface';
import { Logger } from '../../services/logger.service';

// ML Prediction entity matching BD v5.0 schema
export interface IMLPrediction {
    prediction_id: number;
    patient_id: number;
    risk_score: number;          // 0-100
    risk_level: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
    confidence: number | null;   // 0-100
    model_version: string;
    input_features: Record<string, any> | null;
    assessment_type: 'AUTOMATED' | 'MANUAL_OVERRIDE' | 'RECALCULATED';
    reviewed_by_doctor_id: number | null;
    reviewed_at: Date | null;
    prediction_date: Date;
    created_at: Date;
    updated_at: Date;
    is_current: boolean;
}

export interface CreateMLPredictionDTO {
    patient_id: number;
    risk_score: number;
    risk_level: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
    confidence?: number;
    model_version?: string;
    input_features?: Record<string, any>;
    assessment_type?: 'AUTOMATED' | 'MANUAL_OVERRIDE' | 'RECALCULATED';
    reviewed_by_doctor_id?: number;
}

export interface UpdateMLPredictionDTO {
    risk_score?: number;
    risk_level?: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
    confidence?: number;
    assessment_type?: 'AUTOMATED' | 'MANUAL_OVERRIDE' | 'RECALCULATED';
    reviewed_by_doctor_id?: number;
    reviewed_at?: Date;
    is_current?: boolean;
}

export interface PredictionQueryOptions {
    patient_id?: number;
    risk_level?: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
    is_current?: boolean;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
}

export class MLPredictionRepository implements IRepository<IMLPrediction> {
    private db: IDatabaseConnection;
    private logger: Logger;

    constructor(db: IDatabaseConnection, logger: Logger) {
        this.db = db;
        this.logger = logger;
    }

    // ===== CRUD OPERATIONS =====

    async findById(predictionId: number): Promise<IMLPrediction | null> {
        try {
            const result = await this.db.query<IMLPrediction>(
                'SELECT * FROM ml_predictions WHERE prediction_id = $1',
                [predictionId]
            );
            return result.length > 0 ? result[0] : null;
        } catch (error) {
            this.logger.error(`Error finding prediction by id ${predictionId}:`, error);
            throw error;
        }
    }

    async findAll(): Promise<IMLPrediction[]> {
        try {
            return await this.db.query<IMLPrediction>(
                'SELECT * FROM ml_predictions ORDER BY prediction_date DESC'
            );
        } catch (error) {
            this.logger.error('Error finding all predictions:', error);
            throw error;
        }
    }

    async findBy(criteria: Partial<IMLPrediction>): Promise<IMLPrediction[]> {
        try {
            const conditions: string[] = [];
            const values: any[] = [];
            let paramIndex = 1;

            Object.entries(criteria).forEach(([key, value]) => {
                if (value !== undefined) {
                    conditions.push(`${key} = $${paramIndex}`);
                    values.push(value);
                    paramIndex++;
                }
            });

            const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
            const query = `SELECT * FROM ml_predictions ${whereClause} ORDER BY prediction_date DESC`;

            return await this.db.query<IMLPrediction>(query, values);
        } catch (error) {
            this.logger.error('Error finding predictions by criteria:', error);
            throw error;
        }
    }

    async create(predictionData: CreateMLPredictionDTO): Promise<IMLPrediction> {
        try {
            // First, mark any existing current predictions for this patient as not current
            await this.db.query(
                'UPDATE ml_predictions SET is_current = FALSE, updated_at = CURRENT_TIMESTAMP WHERE patient_id = $1 AND is_current = TRUE',
                [predictionData.patient_id]
            );

            const query = `
                INSERT INTO ml_predictions (
                    patient_id, risk_score, risk_level, confidence, model_version,
                    input_features, assessment_type, reviewed_by_doctor_id, is_current
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, TRUE
                ) RETURNING *
            `;

            const values = [
                predictionData.patient_id,
                predictionData.risk_score,
                predictionData.risk_level,
                predictionData.confidence || null,
                predictionData.model_version || 'v1.0',
                predictionData.input_features ? JSON.stringify(predictionData.input_features) : null,
                predictionData.assessment_type || 'AUTOMATED',
                predictionData.reviewed_by_doctor_id || null
            ];

            const result = await this.db.query<IMLPrediction>(query, values);
            this.logger.info(`ML prediction created for patient ${predictionData.patient_id}`);

            return result[0];
        } catch (error) {
            this.logger.error('Error creating ML prediction:', error);
            throw error;
        }
    }

    async update(predictionId: number, predictionData: UpdateMLPredictionDTO): Promise<IMLPrediction | null> {
        try {
            const setClauses: string[] = [];
            const values: any[] = [];
            let paramIndex = 1;

            Object.entries(predictionData).forEach(([key, value]) => {
                if (value !== undefined) {
                    setClauses.push(`${key} = $${paramIndex}`);
                    values.push(value);
                    paramIndex++;
                }
            });

            if (setClauses.length === 0) {
                return await this.findById(predictionId);
            }

            setClauses.push(`updated_at = CURRENT_TIMESTAMP`);
            values.push(predictionId);

            const query = `
                UPDATE ml_predictions 
                SET ${setClauses.join(', ')} 
                WHERE prediction_id = $${paramIndex} 
                RETURNING *
            `;

            const result = await this.db.query<IMLPrediction>(query, values);

            if (result.length > 0) {
                this.logger.info(`ML prediction ${predictionId} updated successfully`);
                return result[0];
            }

            return null;
        } catch (error) {
            this.logger.error(`Error updating ML prediction ${predictionId}:`, error);
            throw error;
        }
    }

    async delete(predictionId: number): Promise<boolean> {
        try {
            const result = await this.db.query(
                'DELETE FROM ml_predictions WHERE prediction_id = $1 RETURNING prediction_id',
                [predictionId]
            );

            const deleted = result.length > 0;
            if (deleted) {
                this.logger.info(`ML prediction ${predictionId} deleted successfully`);
            }

            return deleted;
        } catch (error) {
            this.logger.error(`Error deleting ML prediction ${predictionId}:`, error);
            throw error;
        }
    }

    async exists(predictionId: number): Promise<boolean> {
        try {
            const result = await this.db.query(
                'SELECT 1 FROM ml_predictions WHERE prediction_id = $1',
                [predictionId]
            );
            return result.length > 0;
        } catch (error) {
            this.logger.error(`Error checking prediction existence ${predictionId}:`, error);
            throw error;
        }
    }

    async count(criteria?: Partial<IMLPrediction>): Promise<number> {
        try {
            let query = 'SELECT COUNT(*) as count FROM ml_predictions';
            const values: any[] = [];

            if (criteria && Object.keys(criteria).length > 0) {
                const conditions: string[] = [];
                let paramIndex = 1;

                Object.entries(criteria).forEach(([key, value]) => {
                    if (value !== undefined) {
                        conditions.push(`${key} = $${paramIndex}`);
                        values.push(value);
                        paramIndex++;
                    }
                });

                if (conditions.length > 0) {
                    query += ` WHERE ${conditions.join(' AND ')}`;
                }
            }

            const result = await this.db.query<{ count: string }>(query, values);
            return parseInt(result[0].count, 10);
        } catch (error) {
            this.logger.error('Error counting predictions:', error);
            throw error;
        }
    }

    // ===== PREDICTION-SPECIFIC QUERIES =====

    async findCurrentByPatientId(patientId: number): Promise<IMLPrediction | null> {
        try {
            const result = await this.db.query<IMLPrediction>(
                'SELECT * FROM ml_predictions WHERE patient_id = $1 AND is_current = TRUE ORDER BY prediction_date DESC LIMIT 1',
                [patientId]
            );
            return result.length > 0 ? result[0] : null;
        } catch (error) {
            this.logger.error(`Error finding current prediction for patient ${patientId}:`, error);
            throw error;
        }
    }

    async findHistoryByPatientId(patientId: number, limit: number = 10): Promise<IMLPrediction[]> {
        try {
            return await this.db.query<IMLPrediction>(
                'SELECT * FROM ml_predictions WHERE patient_id = $1 ORDER BY prediction_date DESC LIMIT $2',
                [patientId, limit]
            );
        } catch (error) {
            this.logger.error(`Error finding prediction history for patient ${patientId}:`, error);
            throw error;
        }
    }

    async findPredictionsByRiskLevel(riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL', onlyCurrents: boolean = true): Promise<IMLPrediction[]> {
        try {
            let query = 'SELECT * FROM ml_predictions WHERE risk_level = $1';
            if (onlyCurrents) {
                query += ' AND is_current = TRUE';
            }
            query += ' ORDER BY risk_score DESC';

            return await this.db.query<IMLPrediction>(query, [riskLevel]);
        } catch (error) {
            this.logger.error(`Error finding predictions by risk level ${riskLevel}:`, error);
            throw error;
        }
    }

    async findHighRiskPatients(): Promise<IMLPrediction[]> {
        try {
            return await this.db.query<IMLPrediction>(
                `SELECT * FROM ml_predictions 
                 WHERE is_current = TRUE 
                   AND risk_level IN ('HIGH', 'CRITICAL')
                 ORDER BY risk_score DESC`
            );
        } catch (error) {
            this.logger.error('Error finding high-risk patients:', error);
            throw error;
        }
    }

    async getRiskDistribution(): Promise<{ risk_level: string; count: number }[]> {
        try {
            const query = `
                SELECT risk_level, COUNT(*) as count
                FROM ml_predictions
                WHERE is_current = TRUE
                GROUP BY risk_level
                ORDER BY 
                    CASE risk_level
                        WHEN 'CRITICAL' THEN 1
                        WHEN 'HIGH' THEN 2
                        WHEN 'MODERATE' THEN 3
                        WHEN 'LOW' THEN 4
                    END
            `;

            return await this.db.query(query);
        } catch (error) {
            this.logger.error('Error getting risk distribution:', error);
            throw error;
        }
    }

    async getRiskTrends(patientId: number, months: number = 12): Promise<{ month: string; avg_score: number; predictions_count: number }[]> {
        try {
            const query = `
                SELECT 
                    TO_CHAR(prediction_date, 'YYYY-MM') as month,
                    AVG(risk_score) as avg_score,
                    COUNT(*) as predictions_count
                FROM ml_predictions
                WHERE patient_id = $1
                  AND prediction_date >= CURRENT_DATE - INTERVAL '${months} months'
                GROUP BY TO_CHAR(prediction_date, 'YYYY-MM')
                ORDER BY month DESC
            `;

            return await this.db.query(query, [patientId]);
        } catch (error) {
            this.logger.error(`Error getting risk trends for patient ${patientId}:`, error);
            throw error;
        }
    }

    async markAsReviewed(predictionId: number, doctorId: number): Promise<IMLPrediction | null> {
        try {
            const result = await this.db.query<IMLPrediction>(
                `UPDATE ml_predictions 
                 SET reviewed_by_doctor_id = $1, 
                     reviewed_at = CURRENT_TIMESTAMP,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE prediction_id = $2
                 RETURNING *`,
                [doctorId, predictionId]
            );

            if (result.length > 0) {
                this.logger.info(`Prediction ${predictionId} marked as reviewed by doctor ${doctorId}`);
                return result[0];
            }

            return null;
        } catch (error) {
            this.logger.error(`Error marking prediction ${predictionId} as reviewed:`, error);
            throw error;
        }
    }

    async getPendingReviews(doctorId?: number): Promise<IMLPrediction[]> {
        try {
            let query = `
                SELECT mp.* 
                FROM ml_predictions mp
                WHERE mp.is_current = TRUE 
                  AND mp.reviewed_by_doctor_id IS NULL
                  AND mp.risk_level IN ('HIGH', 'CRITICAL')
            `;

            const values: any[] = [];

            if (doctorId) {
                query += `
                    AND mp.patient_id IN (
                        SELECT patient_id FROM relation_patient_doctor 
                        WHERE doctor_id = $1 AND active = TRUE
                    )
                `;
                values.push(doctorId);
            }

            query += ' ORDER BY mp.risk_score DESC';

            return await this.db.query<IMLPrediction>(query, values);
        } catch (error) {
            this.logger.error('Error getting pending reviews:', error);
            throw error;
        }
    }
}
