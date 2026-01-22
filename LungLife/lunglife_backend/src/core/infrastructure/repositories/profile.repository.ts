/**
 * 🧑‍⚕️ Profile Repository Implementation
 * Handles user profiles, risk assessments, and health metrics
 * Updated to work with BD v5.0 schema:
 * - patient table for demographics
 * - smoking_history for smoking data
 * - ml_predictions for risk assessments
 * - risk_factors for additional risk factors
 */

import { IDatabaseConnection } from '../../interfaces/database.interface';
import { IRepository } from '../../interfaces/repository.interface';
import { 
  IUserProfile, 
  IRiskAssessment, 
  IHealthMetric,
  CreateUserProfileDTO,
  UpdateUserProfileDTO,
  CreateRiskAssessmentDTO,
  CreateHealthMetricDTO,
  UserProfileQueryOptions,
  RiskAssessmentQueryOptions,
  HealthMetricsQueryOptions,
  UserProfileSummary,
  RiskTrends,
  DashboardStats,
  SmokingStatus,
  RiskCategory
} from '../../interfaces/profile.interface';
import { Logger } from '../../services/logger.service';

export class UserProfileRepository implements IRepository<IUserProfile> {
  private db: IDatabaseConnection;
  private logger: Logger;

  constructor(db: IDatabaseConnection, logger: Logger) {
    this.db = db;
    this.logger = logger;
  }

  // ===== CRUD OPERATIONS =====
  // Uses combined queries from patient + smoking_history tables

  async findById(id: number): Promise<IUserProfile | null> {
    try {
      // Query combines patient data with current smoking history
      const result = await this.db.query<IUserProfile>(
        `SELECT 
          p.patient_id as id,
          p.user_id as "userId",
          p.date_of_birth as "dateOfBirth",
          p.gender,
          p.height_cm as "heightCm",
          p.weight_kg as "weightKg",
          p.country,
          p.city,
          sh.smoking_status as "smokingStatus",
          EXTRACT(YEAR FROM AGE(sh.start_date, p.date_of_birth))::integer as "smokingStartAge",
          EXTRACT(YEAR FROM AGE(sh.quit_date, p.date_of_birth))::integer as "smokingQuitAge",
          sh.cigarettes_per_day as "cigarettesPerDay",
          rf.family_history as "familyHistoryLungCancer",
          rf.occupational_exposure as "occupationalExposure",
          rf.previous_lung_disease as "previousLungDisease",
          rf.radiation_exposure as "radiationExposure",
          p.created_at as "createdAt",
          p.updated_at as "updatedAt"
        FROM patient p
        LEFT JOIN smoking_history sh ON p.patient_id = sh.patient_id AND sh.is_current_status = TRUE
        LEFT JOIN risk_factors rf ON p.patient_id = rf.patient_id
        WHERE p.patient_id = $1`,
        [id]
      );
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      this.logger.error(`Error finding profile by id ${id}:`, error);
      throw error;
    }
  }

  async findByUserId(userId: number): Promise<IUserProfile | null> {
    try {
      const result = await this.db.query<IUserProfile>(
        `SELECT 
          p.patient_id as id,
          p.user_id as "userId",
          p.date_of_birth as "dateOfBirth",
          p.gender,
          p.height_cm as "heightCm",
          p.weight_kg as "weightKg",
          p.country,
          p.city,
          sh.smoking_status as "smokingStatus",
          EXTRACT(YEAR FROM AGE(sh.start_date, p.date_of_birth))::integer as "smokingStartAge",
          EXTRACT(YEAR FROM AGE(sh.quit_date, p.date_of_birth))::integer as "smokingQuitAge",
          sh.cigarettes_per_day as "cigarettesPerDay",
          rf.family_history as "familyHistoryLungCancer",
          rf.occupational_exposure as "occupationalExposure",
          rf.previous_lung_disease as "previousLungDisease",
          rf.radiation_exposure as "radiationExposure",
          p.created_at as "createdAt",
          p.updated_at as "updatedAt"
        FROM patient p
        LEFT JOIN smoking_history sh ON p.patient_id = sh.patient_id AND sh.is_current_status = TRUE
        LEFT JOIN risk_factors rf ON p.patient_id = rf.patient_id
        WHERE p.user_id = $1`,
        [userId]
      );
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      this.logger.error(`Error finding profile for user ${userId}:`, error);
      throw error;
    }
  }

  async findAll(): Promise<IUserProfile[]> {
    try {
      return await this.db.query<IUserProfile>(
        `SELECT 
          p.patient_id as id,
          p.user_id as "userId",
          p.date_of_birth as "dateOfBirth",
          p.gender,
          p.height_cm as "heightCm",
          p.weight_kg as "weightKg",
          p.country,
          p.city,
          sh.smoking_status as "smokingStatus",
          sh.cigarettes_per_day as "cigarettesPerDay",
          p.created_at as "createdAt",
          p.updated_at as "updatedAt"
        FROM patient p
        LEFT JOIN smoking_history sh ON p.patient_id = sh.patient_id AND sh.is_current_status = TRUE
        ORDER BY p.updated_at DESC`
      );
    } catch (error) {
      this.logger.error('Error finding all profiles:', error);
      throw error;
    }
  }

  async findBy(criteria: Partial<IUserProfile>): Promise<IUserProfile[]> {
    try {
      const conditions: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      // Map IUserProfile fields to actual DB columns
      const fieldMapping: Record<string, string> = {
        userId: 'p.user_id',
        gender: 'p.gender',
        country: 'p.country',
        city: 'p.city',
        smokingStatus: 'sh.smoking_status'
      };

      Object.entries(criteria).forEach(([key, value]) => {
        if (value !== undefined && fieldMapping[key]) {
          conditions.push(`${fieldMapping[key]} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
      });

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const query = `
        SELECT 
          p.patient_id as id,
          p.user_id as "userId",
          p.date_of_birth as "dateOfBirth",
          p.gender,
          p.height_cm as "heightCm",
          p.weight_kg as "weightKg",
          p.country,
          p.city,
          sh.smoking_status as "smokingStatus",
          sh.cigarettes_per_day as "cigarettesPerDay",
          p.created_at as "createdAt",
          p.updated_at as "updatedAt"
        FROM patient p
        LEFT JOIN smoking_history sh ON p.patient_id = sh.patient_id AND sh.is_current_status = TRUE
        ${whereClause}
        ORDER BY p.updated_at DESC
      `;

      return await this.db.query<IUserProfile>(query, values);
    } catch (error) {
      this.logger.error('Error finding profiles by criteria:', error);
      throw error;
    }
  }

  async create(profileData: CreateUserProfileDTO): Promise<IUserProfile> {
    try {
      // Step 1: Get user info (name/lastname from users table if available)
      const userResult = await this.db.query<{ email: string }>(
        'SELECT email FROM users WHERE user_id = $1',
        [profileData.userId]
      );
      
      const email = userResult.length > 0 ? userResult[0].email : '';
      const nameParts = email.split('@')[0].split('.');
      const firstName = nameParts[0] || 'Usuario';
      const lastName = nameParts[1] || '';

      // Step 2: Insert into patient table
      const patientResult = await this.db.query<{ patient_id: number }>(
        `INSERT INTO patient (
          user_id, patient_name, patient_last_name, date_of_birth, gender,
          height_cm, weight_kg, country, city
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING patient_id`,
        [
          profileData.userId,
          firstName,
          lastName,
          profileData.dateOfBirth || null,
          profileData.gender?.toUpperCase() || null,
          profileData.heightCm || null,
          profileData.weightKg || null,
          profileData.country || 'Chile',
          profileData.city || null
        ]
      );

      const patientId = patientResult[0].patient_id;

      // Step 3: Insert smoking history if provided
      if (profileData.smokingStatus) {
        const smokingStatusMap: Record<string, string> = {
          'never': 'NEVER',
          'former': 'FORMER_SMOKER',
          'current': 'CURRENT_SMOKER'
        };
        
        const dbSmokingStatus = smokingStatusMap[profileData.smokingStatus] || 'NEVER';
        
        // Calculate dates based on ages
        let startDate = null;
        let quitDate = null;
        
        if (profileData.smokingStartAge && profileData.dateOfBirth) {
          const dob = new Date(profileData.dateOfBirth);
          startDate = new Date(dob.getFullYear() + profileData.smokingStartAge, dob.getMonth(), dob.getDate());
        }
        
        if (profileData.smokingQuitAge && profileData.dateOfBirth) {
          const dob = new Date(profileData.dateOfBirth);
          quitDate = new Date(dob.getFullYear() + profileData.smokingQuitAge, dob.getMonth(), dob.getDate());
        }

        await this.db.query(
          `INSERT INTO smoking_history (
            patient_id, smoking_status, cigarettes_per_day, start_date, quit_date, is_current_status
          ) VALUES ($1, $2, $3, $4, $5, TRUE)`,
          [
            patientId,
            dbSmokingStatus,
            profileData.cigarettesPerDay || 0,
            startDate,
            quitDate
          ]
        );
      }

      // Step 4: Insert risk factors if provided
      if (profileData.familyHistoryLungCancer !== undefined || 
          profileData.occupationalExposure !== undefined ||
          profileData.previousLungDisease !== undefined ||
          profileData.radiationExposure !== undefined) {
        await this.db.query(
          `INSERT INTO risk_factors (
            patient_id, family_history, occupational_exposure, previous_lung_disease, radiation_exposure
          ) VALUES ($1, $2, $3, $4, $5)`,
          [
            patientId,
            profileData.familyHistoryLungCancer || false,
            profileData.occupationalExposure ? JSON.stringify(profileData.occupationalExposure) : null,
            profileData.previousLungDisease || false,
            profileData.radiationExposure || false
          ]
        );
      }

      // Step 5: Mark user profile as completed
      await this.db.query(
        'UPDATE users SET profile_completed = TRUE WHERE user_id = $1',
        [profileData.userId]
      );

      this.logger.info(`User profile created successfully for user ${profileData.userId}`);

      // Return the created profile
      return await this.findById(patientId) as IUserProfile;
    } catch (error) {
      this.logger.error('Error creating user profile:', error);
      throw error;
    }
  }

  async update(id: number, profileData: UpdateUserProfileDTO): Promise<IUserProfile | null> {
    try {
      // Update patient table fields
      const patientFields: string[] = [];
      const patientValues: any[] = [];
      let paramIndex = 1;

      const patientFieldMapping: Record<string, string> = {
        dateOfBirth: 'date_of_birth',
        gender: 'gender',
        heightCm: 'height_cm',
        weightKg: 'weight_kg',
        country: 'country',
        city: 'city'
      };

      Object.entries(profileData).forEach(([key, value]) => {
        if (value !== undefined && patientFieldMapping[key]) {
          patientFields.push(`${patientFieldMapping[key]} = $${paramIndex}`);
          if (key === 'gender') {
            patientValues.push(value?.toString().toUpperCase());
          } else {
            patientValues.push(value);
          }
          paramIndex++;
        }
      });

      if (patientFields.length > 0) {
        patientFields.push(`updated_at = CURRENT_TIMESTAMP`);
        patientValues.push(id);
        
        await this.db.query(
          `UPDATE patient SET ${patientFields.join(', ')} WHERE patient_id = $${paramIndex}`,
          patientValues
        );
      }

      // Update smoking history if needed
      if (profileData.smokingStatus !== undefined || 
          profileData.cigarettesPerDay !== undefined ||
          profileData.smokingStartAge !== undefined ||
          profileData.smokingQuitAge !== undefined) {
        
        // Mark old status as not current
        await this.db.query(
          'UPDATE smoking_history SET is_current_status = FALSE WHERE patient_id = $1',
          [id]
        );

        // Get patient DOB for date calculations
        const patient = await this.db.query<{ date_of_birth: Date }>(
          'SELECT date_of_birth FROM patient WHERE patient_id = $1',
          [id]
        );
        const dob = patient[0]?.date_of_birth;

        const smokingStatusMap: Record<string, string> = {
          'never': 'NEVER',
          'former': 'FORMER_SMOKER',
          'current': 'CURRENT_SMOKER'
        };

        let startDate = null;
        let quitDate = null;
        
        if (profileData.smokingStartAge && dob) {
          startDate = new Date(new Date(dob).getFullYear() + profileData.smokingStartAge, 0, 1);
        }
        
        if (profileData.smokingQuitAge && dob) {
          quitDate = new Date(new Date(dob).getFullYear() + profileData.smokingQuitAge, 0, 1);
        }

        await this.db.query(
          `INSERT INTO smoking_history (
            patient_id, smoking_status, cigarettes_per_day, start_date, quit_date, is_current_status
          ) VALUES ($1, $2, $3, $4, $5, TRUE)`,
          [
            id,
            smokingStatusMap[profileData.smokingStatus || 'never'] || 'NEVER',
            profileData.cigarettesPerDay || 0,
            startDate,
            quitDate
          ]
        );
      }

      this.logger.info(`Profile ${id} updated successfully`);
      return await this.findById(id);
    } catch (error) {
      this.logger.error(`Error updating profile ${id}:`, error);
      throw error;
    }
  }

  async delete(id: number): Promise<boolean> {
    try {
      // Due to ON DELETE CASCADE, deleting patient will cascade to related tables
      const result = await this.db.query(
        'DELETE FROM patient WHERE patient_id = $1 RETURNING patient_id',
        [id]
      );
      return result.length > 0;
    } catch (error) {
      this.logger.error(`Error deleting profile ${id}:`, error);
      throw error;
    }
  }

  async exists(id: number): Promise<boolean> {
    try {
      const result = await this.db.query(
        'SELECT 1 FROM patient WHERE patient_id = $1',
        [id]
      );
      return result.length > 0;
    } catch (error) {
      this.logger.error(`Error checking profile existence ${id}:`, error);
      throw error;
    }
  }

  async count(criteria?: Partial<IUserProfile>): Promise<number> {
    try {
      let query = 'SELECT COUNT(*) as count FROM patient';
      const values: any[] = [];
      
      if (criteria && Object.keys(criteria).length > 0) {
        const conditions: string[] = [];
        let paramIndex = 1;

        const fieldMapping: Record<string, string> = {
          userId: 'user_id',
          gender: 'gender',
          country: 'country'
        };

        Object.entries(criteria).forEach(([key, value]) => {
          if (value !== undefined && fieldMapping[key]) {
            conditions.push(`${fieldMapping[key]} = $${paramIndex}`);
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
      this.logger.error('Error counting profiles:', error);
      throw error;
    }
  }

  // ===== PROFILE-SPECIFIC QUERIES =====

  async findProfilesWithHighRisk(): Promise<UserProfileSummary[]> {
    try {
      const query = `
        SELECT 
          p.patient_id as id,
          p.user_id as "userId",
          CONCAT(p.patient_name, ' ', p.patient_last_name) as "fullName",
          mp.risk_score as "riskScore",
          mp.risk_level as "riskCategory",
          mp.prediction_date as "lastAssessment"
        FROM patient p
        INNER JOIN ml_predictions mp ON p.patient_id = mp.patient_id
        WHERE mp.is_current = TRUE 
          AND mp.risk_level IN ('HIGH', 'CRITICAL')
        ORDER BY mp.risk_score DESC
      `;
      
      return await this.db.query<UserProfileSummary>(query);
    } catch (error) {
      this.logger.error('Error finding high-risk profiles:', error);
      throw error;
    }
  }

  async getProfileCompletionStats(): Promise<{ completed: number; incomplete: number; total: number }> {
    try {
      const query = `
        SELECT 
          COUNT(*) FILTER (WHERE profile_completed = true) as completed,
          COUNT(*) FILTER (WHERE profile_completed = false) as incomplete,
          COUNT(*) as total
        FROM users
        WHERE role = 'PATIENT'
      `;
      
      const result = await this.db.query<any>(query);
      return {
        completed: parseInt(result[0].completed || '0', 10),
        incomplete: parseInt(result[0].incomplete || '0', 10),
        total: parseInt(result[0].total || '0', 10)
      };
    } catch (error) {
      this.logger.error('Error getting profile completion stats:', error);
      throw error;
    }
  }

  async findIncompleteProfiles(limit: number = 50): Promise<UserProfileSummary[]> {
    try {
      const query = `
        SELECT 
          p.patient_id as id,
          p.user_id as "userId",
          CONCAT(p.patient_name, ' ', p.patient_last_name) as "fullName",
          u.profile_completed as "profileCompleted",
          p.created_at as "createdAt"
        FROM patient p
        INNER JOIN users u ON p.user_id = u.user_id
        WHERE u.profile_completed = FALSE
        ORDER BY p.created_at DESC
        LIMIT $1
      `;
      
      return await this.db.query<UserProfileSummary>(query, [limit]);
    } catch (error) {
      this.logger.error('Error finding incomplete profiles:', error);
      throw error;
    }
  }
}