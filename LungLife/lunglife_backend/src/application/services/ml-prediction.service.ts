/**
 * ML Prediction Service
 * Orchestrates ML predictions: fetches patient data, calls ML Service,
 * and saves predictions to the database.
 * 
 * @author LungLife Team
 * @version 1.0.0
 */

import { DatabaseServiceFactory } from '../../infrastructure/factories/database.factory';
import { mlServiceClient, MLPatientData, MLPredictionResult } from '../../infrastructure/clients/ml-service.client';

// ============================================
// Types & Interfaces
// ============================================

export interface PatientMLData {
  patientId: number;
  userId: number;
  demographics: {
    age: number;
    gender: 'MALE' | 'FEMALE' | 'OTHER';
    bmi: number | null;
    occupation: string | null;
    areaResidence: 'URBAN' | 'SUBURBAN' | 'RURAL' | null;
  };
  smokingHistory: {
    status: 'NEVER' | 'FORMER_SMOKER' | 'CURRENT_SMOKER';
    yearsSmoked: number;
    packYears: number;
  } | null;
  riskFactors: {
    familyHistoryCancer: boolean;
    toxinExposure: boolean;
    airQualityIndex: number | null;
    physicalActivityLevel: 'LOW' | 'MODERATE' | 'HIGH' | null;
    dietaryHabits: 'POOR' | 'AVERAGE' | 'GOOD' | null;
  } | null;
  symptoms: {
    chestPain: boolean;
    shortnessOfBreath: boolean;
    chronicCough: boolean;
    weightLoss: boolean;
    fatigue: boolean;
    hemoptysis: boolean;
  } | null;
  diagnosticTest: {
    lungFunction: number | null;
    tumorSizeCm: number | null;
  } | null;
  comorbidities: string[];
}

export interface PredictionResult {
  predictionId: number;
  patientId: number;
  riskScore: number;
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  confidence: number;
  modelVersion: string;
  topRiskFactors: Array<{
    name: string;
    contribution: number;
    direction: string;
  }>;
  recommendation: string;
  predictionDate: string;
}

// ============================================
// ML Prediction Service Class
// ============================================

export class MLPredictionService {
  
  /**
   * Check if ML Service is available
   */
  async isMLServiceAvailable(): Promise<boolean> {
    return mlServiceClient.isAvailable();
  }

  /**
   * Get ML Service health status
   */
  async getMLServiceHealth() {
    return mlServiceClient.healthCheck();
  }

  /**
   * Generate a new prediction for a patient
   * Fetches patient data, calls ML Service, and saves to DB
   */
  async generatePrediction(patientId: number, assessedByDoctorId?: number): Promise<PredictionResult> {
    const factory = DatabaseServiceFactory.getInstance();
    const connection = await factory.getConnection();

    try {
      // 1. Fetch patient data from database
      const patientData = await this.fetchPatientData(connection, patientId);
      
      if (!patientData) {
        throw new Error(`Paciente con ID ${patientId} no encontrado`);
      }

      // 2. Transform to ML Service format
      const mlInput = this.transformToMLInput(patientData);

      // 3. Call ML Service
      const mlResult = await mlServiceClient.predict(mlInput);

      // 4. Save prediction to database
      const savedPrediction = await this.savePrediction(
        connection, 
        patientId, 
        mlResult, 
        mlInput,
        assessedByDoctorId
      );

      console.log(`[MLPrediction] Generated prediction for patient ${patientId}:`, {
        riskScore: savedPrediction.riskScore,
        riskLevel: savedPrediction.riskLevel,
      });

      return savedPrediction;
    } catch (error) {
      console.error(`[MLPrediction] Error generating prediction for patient ${patientId}:`, error);
      throw error;
    }
  }

  /**
   * Fetch all necessary patient data for ML prediction
   */
  private async fetchPatientData(connection: any, patientId: number): Promise<PatientMLData | null> {
    // Get patient demographics
    const patientResult = await connection.query(`
      SELECT 
        p.patient_id,
        p.user_id,
        EXTRACT(YEAR FROM AGE(p.date_of_birth)) as age,
        p.gender,
        p.height_cm,
        p.weight_kg,
        p.occupation,
        p.area_residence
      FROM patient p
      WHERE p.patient_id = $1
    `, [patientId]);

    if (patientResult.length === 0) {
      return null;
    }

    const patient = patientResult[0];
    
    // Calculate BMI
    let bmi: number | null = null;
    if (patient.height_cm && patient.weight_kg) {
      const heightM = patient.height_cm / 100;
      bmi = parseFloat((patient.weight_kg / (heightM * heightM)).toFixed(1));
    }

    // Get smoking history
    const smokingResult = await connection.query(`
      SELECT 
        smoking_status,
        cigarettes_per_day,
        start_date,
        quit_date,
        CASE
          WHEN smoking_status = 'NEVER' THEN 0
          WHEN smoking_status = 'CURRENT_SMOKER' AND start_date IS NOT NULL THEN 
            EXTRACT(YEAR FROM AGE(CURRENT_DATE, start_date))
          WHEN smoking_status = 'FORMER_SMOKER' AND start_date IS NOT NULL THEN 
            EXTRACT(YEAR FROM AGE(COALESCE(quit_date, CURRENT_DATE), start_date))
          ELSE 0
        END AS years_smoked,
        CASE
          WHEN smoking_status = 'NEVER' THEN 0.0
          WHEN smoking_status = 'CURRENT_SMOKER' AND start_date IS NOT NULL THEN 
            (cigarettes_per_day / 20.0) * EXTRACT(YEAR FROM AGE(CURRENT_DATE, start_date))
          WHEN smoking_status = 'FORMER_SMOKER' AND start_date IS NOT NULL AND quit_date IS NOT NULL THEN 
            (cigarettes_per_day / 20.0) * EXTRACT(YEAR FROM AGE(quit_date, start_date))
          ELSE 0.0
        END AS pack_years
      FROM smoking_history
      WHERE patient_id = $1 AND is_current_status = TRUE
      LIMIT 1
    `, [patientId]);

    // Get risk factors
    const riskResult = await connection.query(`
      SELECT 
        family_history_cancer,
        toxin_exposure,
        air_quality_index,
        physical_activity_level,
        dietary_habits
      FROM risk_factors
      WHERE patient_id = $1
      ORDER BY evaluation_date DESC
      LIMIT 1
    `, [patientId]);

    // Get latest symptoms
    const symptomsResult = await connection.query(`
      SELECT 
        chest_pain,
        shortness_of_breath,
        chronic_cough,
        weight_loss,
        fatigue,
        hemoptysis
      FROM symptom
      WHERE patient_id = $1
      ORDER BY report_date DESC
      LIMIT 1
    `, [patientId]);

    // Get latest diagnostic test
    const diagnosticResult = await connection.query(`
      SELECT 
        lung_function,
        tumor_size_cm
      FROM diagnostic_test
      WHERE patient_id = $1
      ORDER BY test_date DESC
      LIMIT 1
    `, [patientId]);

    // Get comorbidities
    const comorbiditiesResult = await connection.query(`
      SELECT c.comorbidity_name
      FROM patient_comorbidities pc
      JOIN comorbidities c ON pc.comorbidity_id = c.comorbidity_id
      WHERE pc.patient_id = $1 AND pc.is_active = TRUE
    `, [patientId]);

    return {
      patientId: patient.patient_id,
      userId: patient.user_id,
      demographics: {
        age: patient.age ? parseInt(patient.age) : 45, // Default age if not set
        gender: patient.gender || 'MALE',
        bmi: bmi,
        occupation: patient.occupation,
        areaResidence: patient.area_residence,
      },
      smokingHistory: smokingResult.length > 0 ? {
        status: smokingResult[0].smoking_status,
        yearsSmoked: parseFloat(smokingResult[0].years_smoked) || 0,
        packYears: parseFloat(smokingResult[0].pack_years) || 0,
      } : null,
      riskFactors: riskResult.length > 0 ? {
        familyHistoryCancer: riskResult[0].family_history_cancer || false,
        toxinExposure: riskResult[0].toxin_exposure || false,
        airQualityIndex: riskResult[0].air_quality_index,
        physicalActivityLevel: riskResult[0].physical_activity_level,
        dietaryHabits: riskResult[0].dietary_habits,
      } : null,
      symptoms: symptomsResult.length > 0 ? {
        chestPain: symptomsResult[0].chest_pain || false,
        shortnessOfBreath: symptomsResult[0].shortness_of_breath || false,
        chronicCough: symptomsResult[0].chronic_cough || false,
        weightLoss: symptomsResult[0].weight_loss || false,
        fatigue: symptomsResult[0].fatigue || false,
        hemoptysis: symptomsResult[0].hemoptysis || false,
      } : null,
      diagnosticTest: diagnosticResult.length > 0 ? {
        lungFunction: diagnosticResult[0].lung_function,
        tumorSizeCm: diagnosticResult[0].tumor_size_cm,
      } : null,
      comorbidities: comorbiditiesResult.map((c: any) => c.comorbidity_name),
    };
  }

  /**
   * Transform patient data to ML Service input format
   */
  private transformToMLInput(data: PatientMLData): MLPatientData {
    // Map smoking status
    const smokingMap: Record<string, 'Never' | 'Former' | 'Current'> = {
      'NEVER': 'Never',
      'FORMER_SMOKER': 'Former',
      'CURRENT_SMOKER': 'Current',
    };

    // Map residential area
    const areaMap: Record<string, 'Urban' | 'Suburban' | 'Rural'> = {
      'URBAN': 'Urban',
      'SUBURBAN': 'Suburban',
      'RURAL': 'Rural',
    };

    // Map physical activity
    const activityMap: Record<string, 'Low' | 'Moderate' | 'High'> = {
      'LOW': 'Low',
      'MODERATE': 'Moderate',
      'HIGH': 'High',
    };

    // Map dietary habits
    const dietMap: Record<string, 'Poor' | 'Average' | 'Good'> = {
      'POOR': 'Poor',
      'AVERAGE': 'Average',
      'GOOD': 'Good',
    };

    return {
      age: data.demographics.age || 45,
      gender: data.demographics.gender === 'FEMALE' ? 'Female' : 'Male',
      yearsSmoked: data.smokingHistory?.yearsSmoked || 0,
      packYears: data.smokingHistory?.packYears || 0,
      smokingHistory: smokingMap[data.smokingHistory?.status || 'NEVER'] || 'Never',
      bmi: data.demographics.bmi || 25.0,
      lungFunctionTestResult: data.diagnosticTest?.lungFunction || 85.0,
      tumorSizeCm: data.diagnosticTest?.tumorSizeCm || 0.0,
      airQualityIndex: data.riskFactors?.airQualityIndex || 50,
      exposureToToxins: data.riskFactors?.toxinExposure || false,
      residentialArea: areaMap[data.demographics.areaResidence || 'URBAN'] || 'Urban',
      chestPainSymptoms: data.symptoms?.chestPain || false,
      shortnessOfBreath: data.symptoms?.shortnessOfBreath || false,
      chronicCough: data.symptoms?.chronicCough || false,
      weightLoss: data.symptoms?.weightLoss || false,
      familyHistoryCancer: data.riskFactors?.familyHistoryCancer || false,
      previousCancerDiagnosis: false, // Derived from medical history if needed
      comorbidities: data.comorbidities.join(', ') || 'NONE',
      physicalActivityLevel: activityMap[data.riskFactors?.physicalActivityLevel || 'MODERATE'] || 'Moderate',
      dietaryHabits: dietMap[data.riskFactors?.dietaryHabits || 'AVERAGE'] || 'Average',
      occupation: data.demographics.occupation || 'Unknown',
    };
  }

  /**
   * Save ML prediction result to database
   */
  private async savePrediction(
    connection: any,
    patientId: number,
    mlResult: MLPredictionResult,
    inputFeatures: MLPatientData,
    assessedByDoctorId?: number
  ): Promise<PredictionResult> {
    // Map risk level to DB format
    const riskLevelMap: Record<string, string> = {
      'LOW': 'LOW',
      'MODERATE': 'MODERATE',
      'HIGH': 'HIGH',
      'VERY_HIGH': 'CRITICAL',
    };

    // Convert probability to percentage (0-100)
    const riskScore = Math.round(mlResult.probability * 100);

    // Mark previous predictions as not current
    await connection.query(
      'UPDATE ml_predictions SET is_current = FALSE, updated_at = CURRENT_TIMESTAMP WHERE patient_id = $1 AND is_current = TRUE',
      [patientId]
    );

    // Insert new prediction
    const result = await connection.query(`
      INSERT INTO ml_predictions (
        patient_id, 
        risk_score, 
        risk_level, 
        confidence, 
        model_version,
        input_features, 
        assessment_type, 
        reviewed_by_doctor_id, 
        is_current,
        prediction_date
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, TRUE, CURRENT_TIMESTAMP
      ) RETURNING 
        prediction_id, 
        risk_score, 
        risk_level, 
        confidence, 
        model_version, 
        prediction_date
    `, [
      patientId,
      riskScore,
      riskLevelMap[mlResult.riskLevel] || 'MODERATE',
      Math.round(mlResult.confidence * 100),
      mlResult.modelVersion,
      JSON.stringify(inputFeatures),
      'AUTOMATED',
      assessedByDoctorId || null,
    ]);

    const saved = result[0];

    return {
      predictionId: saved.prediction_id,
      patientId: patientId,
      riskScore: parseFloat(saved.risk_score),
      riskLevel: saved.risk_level as 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL',
      confidence: parseFloat(saved.confidence),
      modelVersion: saved.model_version,
      topRiskFactors: mlResult.topRiskFactors.map(f => ({
        name: f.featureName,
        contribution: f.contribution,
        direction: f.direction,
      })),
      recommendation: mlResult.recommendation,
      predictionDate: saved.prediction_date,
    };
  }

  /**
   * Get the latest prediction for a patient
   */
  async getLatestPrediction(patientId: number): Promise<PredictionResult | null> {
    const factory = DatabaseServiceFactory.getInstance();
    const connection = await factory.getConnection();

    const result = await connection.query(`
      SELECT 
        prediction_id,
        patient_id,
        risk_score,
        risk_level,
        confidence,
        model_version,
        input_features,
        prediction_date
      FROM ml_predictions
      WHERE patient_id = $1 AND is_current = TRUE
      ORDER BY prediction_date DESC
      LIMIT 1
    `, [patientId]);

    if (result.length === 0) {
      return null;
    }

    const r = result[0];
    return {
      predictionId: r.prediction_id,
      patientId: r.patient_id,
      riskScore: parseFloat(r.risk_score),
      riskLevel: r.risk_level,
      confidence: parseFloat(r.confidence),
      modelVersion: r.model_version,
      topRiskFactors: [],
      recommendation: '',
      predictionDate: r.prediction_date,
    };
  }
}

// Export singleton instance
export const mlPredictionService = new MLPredictionService();
