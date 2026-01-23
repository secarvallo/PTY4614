/**
 * 🎯 Risk Assessment Repository Implementation
 * Handles risk assessments, calculations, and historical data
 * Updated to use BD v5.0 ml_predictions table
 */

import { IDatabaseConnection } from '../../domain/interfaces/database.interface';
import { IRepository } from '../../domain/interfaces/repository.interface';
import { 
  IRiskAssessment,
  CreateRiskAssessmentDTO,
  RiskAssessmentQueryOptions,
  RiskCategory,
  RiskTrends
} from '../../domain/interfaces/profile.interface';
import { Logger } from '../../application/services/logger.service';

/**
 * Maps IRiskAssessment interface to ml_predictions table columns
 * IRiskAssessment.id -> ml_predictions.prediction_id
 * IRiskAssessment.userId -> ml_predictions.patient_id (via patient.user_id)
 * IRiskAssessment.riskScore -> ml_predictions.risk_score
 * IRiskAssessment.riskCategory -> ml_predictions.risk_level
 * IRiskAssessment.assessedAt -> ml_predictions.prediction_date
 */
export class RiskAssessmentRepository implements IRepository<IRiskAssessment> {
  constructor(
    private db: IDatabaseConnection,
    private logger: Logger
  ) {}

  private mapToRiskAssessment(row: any): IRiskAssessment {
    return {
      id: row.prediction_id,
      userId: row.user_id,
      riskScore: parseFloat(row.risk_score) / 100, // Convert 0-100 to 0-1
      riskCategory: this.mapRiskLevel(row.risk_level),
      modelVersion: row.model_version || 'v1.0',
      calculationMethod: row.assessment_type || 'AUTOMATED',
      assessedBy: row.reviewed_by_doctor_id,
      assessmentNotes: null,
      recommendations: null,
      assessedAt: row.prediction_date,
      validUntil: null,
      factorsUsed: row.input_features,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapRiskLevel(level: string): RiskCategory {
    const mapping: Record<string, RiskCategory> = {
      'LOW': RiskCategory.LOW,
      'MODERATE': RiskCategory.MODERATE,
      'HIGH': RiskCategory.HIGH,
      'CRITICAL': RiskCategory.VERY_HIGH
    };
    return mapping[level] || RiskCategory.LOW;
  }

  private mapToDbRiskLevel(category: RiskCategory): string {
    const mapping: Record<RiskCategory, string> = {
      [RiskCategory.LOW]: 'LOW',
      [RiskCategory.MODERATE]: 'MODERATE',
      [RiskCategory.HIGH]: 'HIGH',
      [RiskCategory.VERY_HIGH]: 'CRITICAL'
    };
    return mapping[category] || 'LOW';
  }

  async findById(id: number): Promise<IRiskAssessment | null> {
    try {
      const result = await this.db.query(
        `SELECT mp.*, p.user_id 
         FROM ml_predictions mp
         INNER JOIN patient p ON mp.patient_id = p.patient_id
         WHERE mp.prediction_id = $1`,
        [id]
      );
      return result.length > 0 ? this.mapToRiskAssessment(result[0]) : null;
    } catch (error) {
      this.logger.error(`Error finding risk assessment by id ${id}:`, error);
      throw error;
    }
  }

  async findAll(): Promise<IRiskAssessment[]> {
    try {
      const result = await this.db.query(
        `SELECT mp.*, p.user_id 
         FROM ml_predictions mp
         INNER JOIN patient p ON mp.patient_id = p.patient_id
         ORDER BY mp.prediction_date DESC`
      );
      return result.map(row => this.mapToRiskAssessment(row));
    } catch (error) {
      this.logger.error('Error finding all risk assessments:', error);
      throw error;
    }
  }

  async findBy(criteria: Partial<IRiskAssessment>): Promise<IRiskAssessment[]> {
    try {
      const conditions: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (criteria.userId !== undefined) {
        conditions.push(`p.user_id = $${paramIndex}`);
        values.push(criteria.userId);
        paramIndex++;
      }

      if (criteria.riskCategory !== undefined) {
        conditions.push(`mp.risk_level = $${paramIndex}`);
        values.push(this.mapToDbRiskLevel(criteria.riskCategory));
        paramIndex++;
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const query = `
        SELECT mp.*, p.user_id 
        FROM ml_predictions mp
        INNER JOIN patient p ON mp.patient_id = p.patient_id
        ${whereClause}
        ORDER BY mp.prediction_date DESC
      `;

      const result = await this.db.query(query, values);
      return result.map(row => this.mapToRiskAssessment(row));
    } catch (error) {
      this.logger.error('Error finding risk assessments by criteria:', error);
      throw error;
    }
  }

  async create(assessmentData: CreateRiskAssessmentDTO): Promise<IRiskAssessment> {
    try {
      // First get patient_id from user_id
      const patientResult = await this.db.query<{ patient_id: number }>(
        'SELECT patient_id FROM patient WHERE user_id = $1',
        [assessmentData.userId]
      );

      if (patientResult.length === 0) {
        throw new Error(`Patient not found for user ${assessmentData.userId}`);
      }

      const patientId = patientResult[0].patient_id;

      // Mark previous predictions as not current
      await this.db.query(
        'UPDATE ml_predictions SET is_current = FALSE, updated_at = CURRENT_TIMESTAMP WHERE patient_id = $1 AND is_current = TRUE',
        [patientId]
      );

      // Convert risk score from 0-1 to 0-100 for DB
      const dbRiskScore = assessmentData.riskScore * 100;

      const query = `
        INSERT INTO ml_predictions (
          patient_id, risk_score, risk_level, confidence, model_version,
          input_features, assessment_type, reviewed_by_doctor_id, is_current
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, TRUE
        ) RETURNING prediction_id
      `;

      const values = [
        patientId,
        dbRiskScore,
        this.mapToDbRiskLevel(assessmentData.riskCategory),
        90, // Default confidence
        assessmentData.modelVersion || 'v1.0',
        assessmentData.factorsUsed ? JSON.stringify(assessmentData.factorsUsed) : null,
        assessmentData.calculationMethod || 'AUTOMATED',
        assessmentData.assessedBy || null
      ];

      const result = await this.db.query<{ prediction_id: number }>(query, values);
      this.logger.info(`Risk assessment created for user ${assessmentData.userId}`);
      
      return await this.findById(result[0].prediction_id) as IRiskAssessment;
    } catch (error) {
      this.logger.error('Error creating risk assessment:', error);
      throw error;
    }
  }

  async update(id: number, assessmentData: Partial<CreateRiskAssessmentDTO>): Promise<IRiskAssessment | null> {
    try {
      const setClauses: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (assessmentData.riskScore !== undefined) {
        setClauses.push(`risk_score = $${paramIndex}`);
        values.push(assessmentData.riskScore * 100);
        paramIndex++;
      }

      if (assessmentData.riskCategory !== undefined) {
        setClauses.push(`risk_level = $${paramIndex}`);
        values.push(this.mapToDbRiskLevel(assessmentData.riskCategory));
        paramIndex++;
      }

      if (assessmentData.assessedBy !== undefined) {
        setClauses.push(`reviewed_by_doctor_id = $${paramIndex}`);
        values.push(assessmentData.assessedBy);
        paramIndex++;
        setClauses.push(`reviewed_at = CURRENT_TIMESTAMP`);
      }

      if (assessmentData.factorsUsed !== undefined) {
        setClauses.push(`input_features = $${paramIndex}`);
        values.push(JSON.stringify(assessmentData.factorsUsed));
        paramIndex++;
      }

      if (setClauses.length === 0) {
        return await this.findById(id);
      }

      setClauses.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(id);

      const query = `
        UPDATE ml_predictions 
        SET ${setClauses.join(', ')} 
        WHERE prediction_id = $${paramIndex} 
        RETURNING prediction_id
      `;

      const result = await this.db.query(query, values);
      
      if (result.length > 0) {
        return await this.findById(id);
      }
      return null;
    } catch (error) {
      this.logger.error(`Error updating risk assessment ${id}:`, error);
      throw error;
    }
  }

  async delete(id: number): Promise<boolean> {
    try {
      const result = await this.db.query(
        'DELETE FROM ml_predictions WHERE prediction_id = $1 RETURNING prediction_id',
        [id]
      );
      return result.length > 0;
    } catch (error) {
      this.logger.error(`Error deleting risk assessment ${id}:`, error);
      throw error;
    }
  }

  async exists(id: number): Promise<boolean> {
    try {
      const result = await this.db.query(
        'SELECT 1 FROM ml_predictions WHERE prediction_id = $1',
        [id]
      );
      return result.length > 0;
    } catch (error) {
      this.logger.error(`Error checking risk assessment existence ${id}:`, error);
      throw error;
    }
  }

  async count(criteria?: Partial<IRiskAssessment>): Promise<number> {
    try {
      let query = 'SELECT COUNT(*) as count FROM ml_predictions mp';
      const values: any[] = [];
      const conditions: string[] = [];
      
      if (criteria && Object.keys(criteria).length > 0) {
        let paramIndex = 1;

        if (criteria.riskCategory !== undefined) {
          conditions.push(`mp.risk_level = $${paramIndex}`);
          values.push(this.mapToDbRiskLevel(criteria.riskCategory));
          paramIndex++;
        }

        if (conditions.length > 0) {
          query += ` WHERE ${conditions.join(' AND ')}`;
        }
      }

      const result = await this.db.query<{ count: string }>(query, values);
      return parseInt(result[0].count, 10);
    } catch (error) {
      this.logger.error('Error counting risk assessments:', error);
      throw error;
    }
  }

  // ===== RISK-SPECIFIC QUERIES =====

  async getLatestAssessmentByUser(userId: number): Promise<IRiskAssessment | null> {
    try {
      const result = await this.db.query(
        `SELECT mp.*, p.user_id 
         FROM ml_predictions mp
         INNER JOIN patient p ON mp.patient_id = p.patient_id
         WHERE p.user_id = $1 AND mp.is_current = TRUE
         ORDER BY mp.prediction_date DESC 
         LIMIT 1`,
        [userId]
      );
      return result.length > 0 ? this.mapToRiskAssessment(result[0]) : null;
    } catch (error) {
      this.logger.error(`Error getting latest assessment for user ${userId}:`, error);
      throw error;
    }
  }

  async getRiskTrends(userId: number, months: number = 12): Promise<RiskTrends> {
    try {
      const result = await this.db.query(
        `SELECT mp.prediction_date as assessed_at, mp.risk_score, mp.risk_level
         FROM ml_predictions mp
         INNER JOIN patient p ON mp.patient_id = p.patient_id
         WHERE p.user_id = $1 
           AND mp.prediction_date >= CURRENT_DATE - INTERVAL '${months} months'
         ORDER BY mp.prediction_date ASC`,
        [userId]
      );

      const assessments = result.map((row: any) => ({
        date: row.assessed_at,
        riskScore: parseFloat(row.risk_score) / 100,
        riskCategory: this.mapRiskLevel(row.risk_level)
      }));

      // Determine trend
      let trend: 'improving' | 'stable' | 'worsening' = 'stable';
      if (assessments.length >= 2) {
        const firstScore = assessments[0].riskScore;
        const lastScore = assessments[assessments.length - 1].riskScore;
        const change = lastScore - firstScore;
        
        if (change < -0.01) {
          trend = 'improving';
        } else if (change > 0.01) {
          trend = 'worsening';
        }
      }

      return {
        userId,
        assessments,
        trend
      };
    } catch (error) {
      this.logger.error(`Error getting risk trends for user ${userId}:`, error);
      throw error;
    }
  }

  async getExpiredAssessments(): Promise<IRiskAssessment[]> {
    try {
      // In ml_predictions, we consider assessments without recent follow-up as "expired"
      // We'll return assessments older than 6 months that are still current
      const result = await this.db.query(
        `SELECT mp.*, p.user_id 
         FROM ml_predictions mp
         INNER JOIN patient p ON mp.patient_id = p.patient_id
         WHERE mp.is_current = TRUE 
           AND mp.prediction_date < CURRENT_DATE - INTERVAL '6 months'
         ORDER BY mp.prediction_date ASC`
      );
      return result.map((row: any) => this.mapToRiskAssessment(row));
    } catch (error) {
      this.logger.error('Error getting expired assessments:', error);
      throw error;
    }
  }

  async getHighRiskAssessments(limit: number = 50): Promise<IRiskAssessment[]> {
    try {
      const result = await this.db.query(
        `SELECT mp.*, p.user_id 
         FROM ml_predictions mp
         INNER JOIN patient p ON mp.patient_id = p.patient_id
         WHERE mp.is_current = TRUE
           AND mp.risk_level IN ('HIGH', 'CRITICAL')
         ORDER BY mp.risk_score DESC, mp.prediction_date DESC
         LIMIT $1`,
        [limit]
      );
      return result.map((row: any) => this.mapToRiskAssessment(row));
    } catch (error) {
      this.logger.error('Error getting high risk assessments:', error);
      throw error;
    }
  }
}