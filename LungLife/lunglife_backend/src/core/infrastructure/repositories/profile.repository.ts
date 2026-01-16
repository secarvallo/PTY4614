/**
 * 🧑‍⚕️ Profile Repository Implementation
 * Handles user profiles, risk assessments, and health metrics
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

  async findById(id: number): Promise<IUserProfile | null> {
    try {
      const result = await this.db.query<IUserProfile>(
        'SELECT * FROM user_profiles WHERE id = $1',
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
        'SELECT * FROM user_profiles WHERE user_id = $1',
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
        'SELECT * FROM user_profiles ORDER BY updated_at DESC'
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

      Object.entries(criteria).forEach(([key, value]) => {
        if (value !== undefined) {
          conditions.push(`${key} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
      });

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const query = `SELECT * FROM user_profiles ${whereClause} ORDER BY updated_at DESC`;

      return await this.db.query<IUserProfile>(query, values);
    } catch (error) {
      this.logger.error('Error finding profiles by criteria:', error);
      throw error;
    }
  }

  async create(profileData: CreateUserProfileDTO): Promise<IUserProfile> {
    try {
      // Calculate pack years if smoking data is available
      let packYears: number | null = null;
      if (profileData.cigarettesPerDay && profileData.smokingStartAge) {
        const currentAge = profileData.dateOfBirth 
          ? new Date().getFullYear() - new Date(profileData.dateOfBirth).getFullYear()
          : null;
        const smokingYears = profileData.smokingQuitAge 
          ? profileData.smokingQuitAge - profileData.smokingStartAge
          : currentAge ? currentAge - profileData.smokingStartAge : null;
        
        if (smokingYears && smokingYears > 0) {
          packYears = (profileData.cigarettesPerDay / 20) * smokingYears;
        }
      }

      const query = `
        INSERT INTO user_profiles (
          user_id, date_of_birth, gender, height_cm, weight_kg,
          smoking_status, smoking_start_age, smoking_quit_age, cigarettes_per_day, pack_years,
          occupational_exposure, family_history_lung_cancer, previous_lung_disease, radiation_exposure,
          country, city, air_quality_index
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
        ) RETURNING *
      `;

      const values = [
        profileData.userId,
        profileData.dateOfBirth,
        profileData.gender,
        profileData.heightCm,
        profileData.weightKg,
        profileData.smokingStatus,
        profileData.smokingStartAge,
        profileData.smokingQuitAge,
        profileData.cigarettesPerDay,
        packYears,
        profileData.occupationalExposure,
        profileData.familyHistoryLungCancer,
        profileData.previousLungDisease,
        profileData.radiationExposure,
        profileData.country,
        profileData.city,
        profileData.airQualityIndex
      ];

      const result = await this.db.query<IUserProfile>(query, values);
      this.logger.info(`User profile created successfully for user ${profileData.userId}`);
      
      // Mark user profile as completed
      await this.db.query(
        'UPDATE users SET profile_completed = TRUE WHERE id = $1',
        [profileData.userId]
      );

      return result[0];
    } catch (error) {
      this.logger.error('Error creating user profile:', error);
      throw error;
    }
  }

  async update(id: number, profileData: UpdateUserProfileDTO): Promise<IUserProfile | null> {
    try {
      const setClauses: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      // Recalculate pack years if relevant fields are updated
      let packYears: number | undefined = undefined;
      if (profileData.cigarettesPerDay !== undefined || 
          profileData.smokingStartAge !== undefined || 
          profileData.smokingQuitAge !== undefined) {
        
        // Get current profile to merge data
        const currentProfile = await this.findById(id);
        if (currentProfile) {
          const cigarettesPerDay = profileData.cigarettesPerDay ?? currentProfile.cigarettesPerDay;
          const smokingStartAge = profileData.smokingStartAge ?? currentProfile.smokingStartAge;
          const smokingQuitAge = profileData.smokingQuitAge ?? currentProfile.smokingQuitAge;
          
          if (cigarettesPerDay && smokingStartAge) {
            const currentAge = currentProfile.dateOfBirth 
              ? new Date().getFullYear() - new Date(currentProfile.dateOfBirth).getFullYear()
              : null;
            const smokingYears = smokingQuitAge 
              ? smokingQuitAge - smokingStartAge
              : currentAge ? currentAge - smokingStartAge : null;
            
            if (smokingYears && smokingYears > 0) {
              packYears = (cigarettesPerDay / 20) * smokingYears;
            }
          }
        }
      }

      Object.entries(profileData).forEach(([key, value]) => {
        if (value !== undefined) {
          setClauses.push(`${key} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
      });

      if (packYears !== undefined) {
        setClauses.push(`pack_years = $${paramIndex}`);
        values.push(packYears);
        paramIndex++;
      }

      setClauses.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(id);

      const query = `
        UPDATE user_profiles 
        SET ${setClauses.join(', ')} 
        WHERE id = $${paramIndex} 
        RETURNING *
      `;

      const result = await this.db.query<IUserProfile>(query, values);
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      this.logger.error(`Error updating profile ${id}:`, error);
      throw error;
    }
  }

  async delete(id: number): Promise<boolean> {
    try {
      const result = await this.db.query(
        'DELETE FROM user_profiles WHERE id = $1 RETURNING id',
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
        'SELECT 1 FROM user_profiles WHERE id = $1',
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
      let query = 'SELECT COUNT(*) FROM user_profiles';
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
      this.logger.error('Error counting profiles:', error);
      throw error;
    }
  }

  // ===== PROFILE-SPECIFIC QUERIES =====

  async findProfilesWithHighRisk(): Promise<UserProfileSummary[]> {
    try {
      const query = `
        SELECT ups.* 
        FROM user_profile_summary ups
        WHERE ups.risk_category IN ('high', 'very_high')
        ORDER BY ups.risk_score DESC, ups.last_assessment DESC
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
        WHERE role = 'patient'
      `;
      
      const result = await this.db.query<any>(query);
      return {
        completed: parseInt(result[0].completed, 10),
        incomplete: parseInt(result[0].incomplete, 10),
        total: parseInt(result[0].total, 10)
      };
    } catch (error) {
      this.logger.error('Error getting profile completion stats:', error);
      throw error;
    }
  }

  async findIncompleteProfiles(limit: number = 50): Promise<UserProfileSummary[]> {
    try {
      const query = `
        SELECT ups.* 
        FROM user_profile_summary ups
        WHERE ups.profile_completed = false
        ORDER BY ups.id DESC
        LIMIT $1
      `;
      
      return await this.db.query<UserProfileSummary>(query, [limit]);
    } catch (error) {
      this.logger.error('Error finding incomplete profiles:', error);
      throw error;
    }
  }
}