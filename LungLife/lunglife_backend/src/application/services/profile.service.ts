/**
 * 🧑‍⚕️ Profile Service - Business Logic Layer
 * Handles user profile operations, risk calculations, and role-based access
 */

import { 
  IUserProfile,
  IRiskAssessment,
  IHealthMetric,
  UserRole,
  RiskCategory,
  SmokingStatus,
  CreateUserProfileDTO,
  UpdateUserProfileDTO,
  CreateRiskAssessmentDTO,
  CreateHealthMetricDTO,
  UserProfileSummary,
  RiskTrends,
  DashboardStats,
  ProfileError,
  AssessmentError
} from '../../domain/interfaces/profile.interface';
import { UserProfileRepository } from '../../infrastructure/repositories/profile.repository';
import { RiskAssessmentRepository } from '../../infrastructure/repositories/risk-assessment.repository';
import { Logger } from './logger.service';
import { IUnitOfWork } from '../../domain/interfaces/repository.interface';
import { IDatabaseConnection } from '../../domain/interfaces/database.interface';

export class ProfileService {
  private profileRepository: UserProfileRepository;
  private riskRepository: RiskAssessmentRepository;
  private logger: Logger;
  private unitOfWork: IUnitOfWork;
  private db: IDatabaseConnection;

  constructor(
    profileRepository: UserProfileRepository,
    riskRepository: RiskAssessmentRepository,
    logger: Logger,
    unitOfWork: IUnitOfWork,
    db: IDatabaseConnection
  ) {
    this.profileRepository = profileRepository;
    this.riskRepository = riskRepository;
    this.logger = logger;
    this.unitOfWork = unitOfWork;
    this.db = db;
  }

  // ===== PROFILE MANAGEMENT =====

  async createUserProfile(
    profileData: CreateUserProfileDTO, 
    currentUserId: number,
    currentUserRole: UserRole
  ): Promise<IUserProfile> {
    try {
      // Authorization check
      this.validateProfileAccess(profileData.userId, currentUserId, currentUserRole, 'create');

      // Validate profile data
      this.validateProfileData(profileData);

      await this.unitOfWork.start();

      const profile = await this.profileRepository.create(profileData);
      
      this.logger.info(`Profile created for user ${profileData.userId} by user ${currentUserId}`);

      // Automatically trigger initial risk assessment if enough data
      if (this.hasMinimumRiskFactors(profile)) {
        await this.calculateInitialRiskAssessment(profile.userId, currentUserId);
      }

      await this.unitOfWork.commit();
      return profile;

    } catch (error) {
      await this.unitOfWork.rollback();
      this.logger.error('Error creating user profile:', error);
      throw error;
    }
  }

  async updateUserProfile(
    profileId: number,
    profileData: UpdateUserProfileDTO,
    currentUserId: number,
    currentUserRole: UserRole
  ): Promise<IUserProfile> {
    try {
      const existingProfile = await this.profileRepository.findById(profileId);
      if (!existingProfile) {
        throw new Error('Profile not found') as ProfileError;
      }

      // Authorization check
      this.validateProfileAccess(existingProfile.userId, currentUserId, currentUserRole, 'update');

      await this.unitOfWork.start();

      const updatedProfile = await this.profileRepository.update(profileId, profileData);
      if (!updatedProfile) {
        throw new Error('Failed to update profile') as ProfileError;
      }

      this.logger.info(`Profile ${profileId} updated by user ${currentUserId}`);

      // Check if risk assessment needs updating
      if (this.requiresRiskReassessment(existingProfile, profileData)) {
        await this.calculateRiskAssessment(updatedProfile.userId, currentUserId, 'profile_update');
      }

      await this.unitOfWork.commit();
      return updatedProfile;

    } catch (error) {
      await this.unitOfWork.rollback();
      this.logger.error(`Error updating profile ${profileId}:`, error);
      throw error;
    }
  }

  async getUserProfile(userId: number, requestingUserId: number, requestingUserRole: UserRole): Promise<IUserProfile | null> {
    try {
      // Authorization check
      this.validateProfileAccess(userId, requestingUserId, requestingUserRole, 'read');

      return await this.profileRepository.findByUserId(userId);
    } catch (error) {
      this.logger.error(`Error getting profile for user ${userId}:`, error);
      throw error;
    }
  }

  async getProfileSummary(userId: number, requestingUserId: number, requestingUserRole: UserRole): Promise<UserProfileSummary | null> {
    try {
      // Authorization check
      this.validateProfileAccess(userId, requestingUserId, requestingUserRole, 'read');

      // Use the database view for efficient summary
      const result = await this.db.query<UserProfileSummary>(
        'SELECT * FROM user_profile_summary WHERE id = $1',
        [userId]
      );

      return result.length > 0 ? result[0] : null;
    } catch (error) {
      this.logger.error(`Error getting profile summary for user ${userId}:`, error);
      throw error;
    }
  }

  // ===== RISK ASSESSMENT =====

  async calculateRiskAssessment(
    userId: number,
    assessedBy: number,
    trigger: 'manual' | 'profile_update' | 'scheduled' = 'manual'
  ): Promise<IRiskAssessment> {
    try {
      const profile = await this.profileRepository.findByUserId(userId);
      if (!profile) {
        throw new Error('Profile not found for risk assessment') as AssessmentError;
      }

      // Calculate risk using appropriate model
      const riskCalculation = await this.calculateLungCancerRisk(profile);
      
      const assessmentData: CreateRiskAssessmentDTO = {
        userId,
        riskScore: riskCalculation.riskScore,
        riskCategory: riskCalculation.riskCategory,
        modelVersion: riskCalculation.modelVersion,
        calculationMethod: riskCalculation.method,
        assessedBy,
        assessmentNotes: `Risk assessment triggered by: ${trigger}`,
        recommendations: this.generateRecommendations(riskCalculation),
        validUntil: this.calculateNextAssessmentDate(riskCalculation.riskCategory),
        factorsUsed: riskCalculation.factors
      };

      const assessment = await this.riskRepository.create(assessmentData);
      
      this.logger.info(`Risk assessment calculated for user ${userId}: ${riskCalculation.riskCategory} (${riskCalculation.riskScore.toFixed(3)})`);

      return assessment;
    } catch (error) {
      this.logger.error(`Error calculating risk assessment for user ${userId}:`, error);
      throw error;
    }
  }

  private async calculateLungCancerRisk(profile: IUserProfile): Promise<{
    riskScore: number;
    riskCategory: RiskCategory;
    modelVersion: string;
    method: string;
    factors: Record<string, any>;
  }> {
    // Simplified PLCO (Prostate, Lung, Colorectal, and Ovarian) inspired model
    // In production, this would use validated medical models
    
    const factors: Record<string, any> = {};
    let riskScore = 0.001; // Base risk (0.1%)

    // Age factor (assuming calculated from date of birth)
    if (profile.dateOfBirth) {
      const age = new Date().getFullYear() - new Date(profile.dateOfBirth).getFullYear();
      factors.age = age;
      
      if (age >= 50 && age < 65) {
        riskScore *= 2.5;
      } else if (age >= 65 && age < 75) {
        riskScore *= 4.0;
      } else if (age >= 75) {
        riskScore *= 6.0;
      }
    }

    // Smoking history (most significant factor)
    if (profile.smokingStatus && profile.packYears) {
      factors.smokingStatus = profile.smokingStatus;
      factors.packYears = profile.packYears;
      
      if (profile.smokingStatus === SmokingStatus.CURRENT) {
        if (profile.packYears >= 30) {
          riskScore *= 15.0;
        } else if (profile.packYears >= 20) {
          riskScore *= 10.0;
        } else if (profile.packYears >= 10) {
          riskScore *= 5.0;
        }
      } else if (profile.smokingStatus === SmokingStatus.FORMER) {
        const quitYearsAgo = profile.smokingQuitAge ? 
          (new Date().getFullYear() - new Date(profile.dateOfBirth!).getFullYear()) - profile.smokingQuitAge : 0;
        
        factors.quitYearsAgo = quitYearsAgo;
        
        if (quitYearsAgo < 5) {
          riskScore *= 12.0;
        } else if (quitYearsAgo < 10) {
          riskScore *= 8.0;
        } else if (quitYearsAgo < 15) {
          riskScore *= 5.0;
        } else {
          riskScore *= 2.0;
        }
      }
    }

    // Family history
    if (profile.familyHistoryLungCancer) {
      factors.familyHistory = true;
      riskScore *= 1.8;
    }

    // Previous lung disease
    if (profile.previousLungDisease) {
      factors.previousLungDisease = true;
      riskScore *= 1.5;
    }

    // Occupational exposure
    if (profile.occupationalExposure && profile.occupationalExposure.length > 0) {
      factors.occupationalExposure = profile.occupationalExposure;
      // Weight based on type and number of exposures
      const highRiskExposures = ['asbestos', 'radon', 'chromium', 'nickel', 'arsenic'];
      const exposureRisk = profile.occupationalExposure.some(exp => 
        highRiskExposures.some(risk => exp.toLowerCase().includes(risk))
      );
      if (exposureRisk) {
        riskScore *= 2.0;
      } else {
        riskScore *= 1.3;
      }
    }

    // Radiation exposure
    if (profile.radiationExposure) {
      factors.radiationExposure = true;
      riskScore *= 1.4;
    }

    // Environmental factors (air quality)
    if (profile.airQualityIndex && profile.airQualityIndex > 150) {
      factors.airQualityIndex = profile.airQualityIndex;
      riskScore *= 1.2;
    }

    // Cap maximum risk at 95%
    riskScore = Math.min(riskScore, 0.95);

    // Determine risk category
    let riskCategory: RiskCategory;
    if (riskScore >= 0.15) {
      riskCategory = RiskCategory.VERY_HIGH;
    } else if (riskScore >= 0.08) {
      riskCategory = RiskCategory.HIGH;
    } else if (riskScore >= 0.03) {
      riskCategory = RiskCategory.MODERATE;
    } else {
      riskCategory = RiskCategory.LOW;
    }

    return {
      riskScore,
      riskCategory,
      modelVersion: '1.0.0',
      method: 'PLCO_INSPIRED',
      factors
    };
  }

  private generateRecommendations(riskCalculation: any): string {
    const recommendations: string[] = [];

    // Risk-based recommendations
    if (riskCalculation.riskCategory === RiskCategory.VERY_HIGH || riskCalculation.riskCategory === RiskCategory.HIGH) {
      recommendations.push('Consult with a pulmonologist for immediate evaluation');
      recommendations.push('Consider annual low-dose CT screening');
      recommendations.push('Implement smoking cessation if applicable');
    } else if (riskCalculation.riskCategory === RiskCategory.MODERATE) {
      recommendations.push('Discuss screening options with your healthcare provider');
      recommendations.push('Monitor symptoms and seek medical attention for respiratory changes');
    } else {
      recommendations.push('Maintain healthy lifestyle and regular check-ups');
    }

    // Specific factor-based recommendations
    if (riskCalculation.factors.smokingStatus === SmokingStatus.CURRENT) {
      recommendations.push('Smoking cessation is the most important step to reduce lung cancer risk');
      recommendations.push('Consider nicotine replacement therapy or smoking cessation programs');
    }

    if (riskCalculation.factors.occupationalExposure) {
      recommendations.push('Discuss occupational exposure history with your healthcare provider');
      recommendations.push('Follow workplace safety guidelines and use protective equipment');
    }

    return recommendations.join('; ');
  }

  private calculateNextAssessmentDate(riskCategory: RiskCategory): Date {
    const nextAssessment = new Date();
    
    switch (riskCategory) {
      case RiskCategory.VERY_HIGH:
        nextAssessment.setMonth(nextAssessment.getMonth() + 6); // 6 months
        break;
      case RiskCategory.HIGH:
        nextAssessment.setFullYear(nextAssessment.getFullYear() + 1); // 1 year
        break;
      case RiskCategory.MODERATE:
        nextAssessment.setFullYear(nextAssessment.getFullYear() + 2); // 2 years
        break;
      case RiskCategory.LOW:
        nextAssessment.setFullYear(nextAssessment.getFullYear() + 3); // 3 years
        break;
    }

    return nextAssessment;
  }

  // ===== VALIDATION & AUTHORIZATION =====

  private validateProfileAccess(
    targetUserId: number,
    currentUserId: number,
    currentUserRole: UserRole,
    operation: 'create' | 'read' | 'update' | 'delete'
  ): void {
    // Users can always manage their own profile
    if (targetUserId === currentUserId) {
      return;
    }

    // Health professionals can access patient profiles
    if (currentUserRole === UserRole.HEALTH_PROFESSIONAL && operation !== 'delete') {
      return;
    }

    // Admins can do everything
    if (currentUserRole === UserRole.ADMIN) {
      return;
    }

    // Researchers can only read anonymized data (handled elsewhere)
    if (currentUserRole === UserRole.RESEARCHER && operation === 'read') {
      return;
    }

    throw new Error('Insufficient permissions for profile access') as ProfileError;
  }

  private validateProfileData(profileData: CreateUserProfileDTO | UpdateUserProfileDTO): void {
    const errors: string[] = [];

    // Age validation
    if (profileData.dateOfBirth) {
      const age = new Date().getFullYear() - new Date(profileData.dateOfBirth).getFullYear();
      if (age < 18 || age > 120) {
        errors.push('Age must be between 18 and 120 years');
      }
    }

    // Physical measurements
    if (profileData.heightCm && (profileData.heightCm < 100 || profileData.heightCm > 250)) {
      errors.push('Height must be between 100 and 250 cm');
    }

    if (profileData.weightKg && (profileData.weightKg < 30 || profileData.weightKg > 300)) {
      errors.push('Weight must be between 30 and 300 kg');
    }

    // Smoking data consistency
    if (profileData.smokingStatus === SmokingStatus.NEVER) {
      if (profileData.smokingStartAge || profileData.smokingQuitAge || profileData.cigarettesPerDay) {
        errors.push('Non-smokers cannot have smoking history data');
      }
    }

    if (profileData.smokingStartAge && (profileData.smokingStartAge < 5 || profileData.smokingStartAge > 80)) {
      errors.push('Smoking start age must be between 5 and 80 years');
    }

    if (profileData.cigarettesPerDay && (profileData.cigarettesPerDay < 0 || profileData.cigarettesPerDay > 100)) {
      errors.push('Cigarettes per day must be between 0 and 100');
    }

    if (errors.length > 0) {
      const error = new Error(`Profile validation failed: ${errors.join(', ')}`) as ProfileError;
      error.code = 'INVALID_PROFILE_DATA';
      error.details = { validationErrors: errors };
      throw error;
    }
  }

  private hasMinimumRiskFactors(profile: IUserProfile): boolean {
    return !!(
      profile.dateOfBirth &&
      profile.smokingStatus &&
      (profile.smokingStatus === SmokingStatus.NEVER || profile.packYears)
    );
  }

  private requiresRiskReassessment(
    oldProfile: IUserProfile,
    updates: UpdateUserProfileDTO
  ): boolean {
    // Check if any risk-significant factors changed
    const significantFactors = [
      'smokingStatus',
      'cigarettesPerDay',
      'smokingStartAge',
      'smokingQuitAge',
      'familyHistoryLungCancer',
      'previousLungDisease',
      'occupationalExposure',
      'radiationExposure'
    ];

    return significantFactors.some(factor => 
      updates[factor as keyof UpdateUserProfileDTO] !== undefined &&
      updates[factor as keyof UpdateUserProfileDTO] !== oldProfile[factor as keyof IUserProfile]
    );
  }

  private async calculateInitialRiskAssessment(userId: number, assessedBy: number): Promise<void> {
    try {
      await this.calculateRiskAssessment(userId, assessedBy, 'profile_update');
    } catch (error) {
      // Log but don't fail profile creation if risk calculation fails
      this.logger.warn(`Failed to calculate initial risk assessment for user ${userId}:`, error);
    }
  }

  // ===== DASHBOARD & ANALYTICS =====

  async getDashboardStats(userRole: UserRole): Promise<DashboardStats> {
    try {
      if (userRole !== UserRole.ADMIN && userRole !== UserRole.HEALTH_PROFESSIONAL) {
        throw new Error('Insufficient permissions for dashboard stats');
      }

      // Execute multiple queries in parallel for efficiency
      const [totalPatients, riskDistribution, recentAssessments, avgRisk] = await Promise.all([
        this.profileRepository.count(),
        this.getRiskDistribution(),
        this.getRecentAssessmentsCount(),
        this.getAverageRiskScore()
      ]);

      const highRiskPatients = (riskDistribution[RiskCategory.HIGH] || 0) + 
                              (riskDistribution[RiskCategory.VERY_HIGH] || 0);

      return {
        totalPatients,
        highRiskPatients,
        assessmentsThisMonth: recentAssessments,
        avgRiskScore: avgRisk,
        riskDistribution
      };
    } catch (error) {
      this.logger.error('Error getting dashboard stats:', error);
      throw error;
    }
  }

  private async getRiskDistribution(): Promise<Record<RiskCategory, number>> {
    const result = await this.db.query<{ risk_category: string; count: string }>(
      `SELECT risk_category, COUNT(*) as count 
       FROM risk_assessments ra
       WHERE ra.assessed_at = (
         SELECT MAX(assessed_at) 
         FROM risk_assessments ra2 
         WHERE ra2.user_id = ra.user_id
       )
       GROUP BY risk_category`
    );

    const distribution: Record<RiskCategory, number> = {
      [RiskCategory.LOW]: 0,
      [RiskCategory.MODERATE]: 0,
      [RiskCategory.HIGH]: 0,
      [RiskCategory.VERY_HIGH]: 0
    };

    result.forEach((row: { risk_category: string; count: string }) => {
      distribution[row.risk_category as RiskCategory] = parseInt(row.count, 10);
    });

    return distribution;
  }

  private async getRecentAssessmentsCount(): Promise<number> {
    const result = await this.db.query<{ count: string }>(
      `SELECT COUNT(*) as count 
       FROM risk_assessments 
       WHERE assessed_at >= DATE_TRUNC('month', CURRENT_DATE)`
    );

    return parseInt(result[0].count, 10);
  }

  private async getAverageRiskScore(): Promise<number> {
    const result = await this.db.query<{ avg: string }>(
      `SELECT AVG(risk_score) as avg 
       FROM risk_assessments ra
       WHERE ra.assessed_at = (
         SELECT MAX(assessed_at) 
         FROM risk_assessments ra2 
         WHERE ra2.user_id = ra.user_id
       )`
    );

    return parseFloat(result[0].avg) || 0;
  }
}