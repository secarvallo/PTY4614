/**
 * 🎯 Risk Assessment Repository Implementation
 * Handles risk assessments, calculations, and historical data
 */

import { IDatabaseConnection } from '../../interfaces/database.interface';
import { IRepository } from '../../interfaces/repository.interface';
import { 
  IRiskAssessment,
  CreateRiskAssessmentDTO,
  RiskAssessmentQueryOptions,
  RiskCategory,
  RiskTrends
} from '../../interfaces/profile.interface';
import { Logger } from '../../services/logger.service';

export class RiskAssessmentRepository implements IRepository<IRiskAssessment> {
  constructor(
    private db: IDatabaseConnection,
    private logger: Logger
  ) {}

  async findById(id: number): Promise<IRiskAssessment | null> {
    try {
      const result = await this.db.query<IRiskAssessment>(
        'SELECT * FROM risk_assessments WHERE id = $1',
        [id]
      );
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      this.logger.error(`Error finding risk assessment by id ${id}:`, error);
      throw error;
    }
  }

  async findAll(): Promise<IRiskAssessment[]> {
    try {
      return await this.db.query<IRiskAssessment>(
        'SELECT * FROM risk_assessments ORDER BY assessed_at DESC'
      );
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

      Object.entries(criteria).forEach(([key, value]) => {
        if (value !== undefined) {
          conditions.push(`${key} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
      });

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const query = `SELECT * FROM risk_assessments ${whereClause} ORDER BY assessed_at DESC`;

      return await this.db.query<IRiskAssessment>(query, values);
    } catch (error) {
      this.logger.error('Error finding risk assessments by criteria:', error);
      throw error;
    }
  }

  async create(assessmentData: CreateRiskAssessmentDTO): Promise<IRiskAssessment> {
    try {
      const query = `
        INSERT INTO risk_assessments (
          user_id, risk_score, risk_category, model_version, calculation_method,
          assessed_by, assessment_notes, recommendations, valid_until, factors_used
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
        ) RETURNING *
      `;

      const values = [
        assessmentData.userId,
        assessmentData.riskScore,
        assessmentData.riskCategory,
        assessmentData.modelVersion,
        assessmentData.calculationMethod,
        assessmentData.assessedBy,
        assessmentData.assessmentNotes,
        assessmentData.recommendations,
        assessmentData.validUntil,
        JSON.stringify(assessmentData.factorsUsed)
      ];

      const result = await this.db.query<IRiskAssessment>(query, values);
      this.logger.info(`Risk assessment created for user ${assessmentData.userId}`);
      
      return result[0];
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

      Object.entries(assessmentData).forEach(([key, value]) => {
        if (value !== undefined) {
          if (key === 'factorsUsed') {
            setClauses.push(`factors_used = $${paramIndex}`);
            values.push(JSON.stringify(value));
          } else {
            setClauses.push(`${key} = $${paramIndex}`);
            values.push(value);
          }
          paramIndex++;
        }
      });

      setClauses.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(id);

      const query = `
        UPDATE risk_assessments 
        SET ${setClauses.join(', ')} 
        WHERE id = $${paramIndex} 
        RETURNING *
      `;

      const result = await this.db.query<IRiskAssessment>(query, values);
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      this.logger.error(`Error updating risk assessment ${id}:`, error);
      throw error;
    }
  }

  async delete(id: number): Promise<boolean> {
    try {
      const result = await this.db.query(
        'DELETE FROM risk_assessments WHERE id = $1 RETURNING id',
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
        'SELECT 1 FROM risk_assessments WHERE id = $1',
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
      let query = 'SELECT COUNT(*) FROM risk_assessments';
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
      this.logger.error('Error counting risk assessments:', error);
      throw error;
    }
  }

  // ===== RISK-SPECIFIC QUERIES =====

  async getLatestAssessmentByUser(userId: number): Promise<IRiskAssessment | null> {
    try {
      const result = await this.db.query<IRiskAssessment>(
        `SELECT * FROM risk_assessments 
         WHERE user_id = $1 
         ORDER BY assessed_at DESC 
         LIMIT 1`,
        [userId]
      );
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      this.logger.error(`Error getting latest assessment for user ${userId}:`, error);
      throw error;
    }
  }

  async getRiskTrends(userId: number, months: number = 12): Promise<RiskTrends> {
    try {
      const result = await this.db.query<{
        assessed_at: Date;
        risk_score: number;
        risk_category: RiskCategory;
      }>(
        `SELECT assessed_at, risk_score, risk_category 
         FROM risk_assessments 
         WHERE user_id = $1 
           AND assessed_at >= CURRENT_DATE - INTERVAL '${months} months'
         ORDER BY assessed_at ASC`,
        [userId]
      );

      const assessments = result.map(row => ({
        date: row.assessed_at,
        riskScore: row.risk_score,
        riskCategory: row.risk_category
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
      return await this.db.query<IRiskAssessment>(
        `SELECT * FROM risk_assessments 
         WHERE valid_until < CURRENT_DATE 
         ORDER BY valid_until ASC`
      );
    } catch (error) {
      this.logger.error('Error getting expired assessments:', error);
      throw error;
    }
  }

  async getHighRiskAssessments(limit: number = 50): Promise<IRiskAssessment[]> {
    try {
      return await this.db.query<IRiskAssessment>(
        `SELECT ra.* FROM risk_assessments ra
         WHERE ra.risk_category IN ('high', 'very_high')
           AND ra.assessed_at = (
             SELECT MAX(assessed_at) 
             FROM risk_assessments ra2 
             WHERE ra2.user_id = ra.user_id
           )
         ORDER BY ra.risk_score DESC, ra.assessed_at DESC
         LIMIT $1`,
        [limit]
      );
    } catch (error) {
      this.logger.error('Error getting high risk assessments:', error);
      throw error;
    }
  }
}