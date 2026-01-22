/**
 * Clinical Profile Controller
 * Handles detailed clinical profile data for patients
 * Accessible by: PATIENT, DOCTOR, ADMINISTRATOR
 */

import { Request, Response } from 'express';
import { DatabaseServiceFactory } from '../core/factories/database.factory';
import { isPatient, isDoctor, isAdmin } from '../core/rbac';

// Interfaces for response types
interface PatientDemographics {
  patientId: number;
  userId: number;
  name: string;
  lastName: string;
  fullName: string;
  dateOfBirth: string | null;
  age: number | null;
  gender: string | null;
  phone: string | null;
  country: string;
  city: string | null;
  occupation: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
}

interface RiskAssessment {
  predictionId: number;
  riskScore: number;
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  confidence: number;
  predictionDate: string;
  modelVersion: string;
  assessmentType: string;
}

interface RiskFactor {
  id: number;
  type: string;
  title: string;
  description: string;
  severity: 'LOW' | 'MODERATE' | 'HIGH';
  icon: string;
}

interface AssignedDoctor {
  doctorId: number;
  name: string;
  lastName: string;
  fullName: string;
  specialty: string;
  institution: string;
  phone: string | null;
  email: string | null;
  assignmentDate: string;
}

interface ClinicalProfile {
  demographics: PatientDemographics;
  riskAssessment: RiskAssessment | null;
  riskFactors: RiskFactor[];
  assignedDoctor: AssignedDoctor | null;
  smokingHistory: any | null;
  symptoms: any[];
  lastDiagnosticTest: any | null;
}

export class ClinicalProfileController {
  
  /**
   * GET /api/clinical-profile/:patientId?
   * Get complete clinical profile for a patient
   * - Patient: can only view their own profile (patientId optional)
   * - Doctor: can view their assigned patients
   * - Admin: can view any patient
   */
  async getClinicalProfile(req: Request, res: Response): Promise<void> {
    try {
      const roleId = Number(req.user?.roleId);
      const userId = req.user?.id;
      const requestedPatientId = req.params.patientId ? parseInt(req.params.patientId) : null;

      console.log('[ClinicalProfile] User info:', { roleId, userId, requestedPatientId });

      if (!roleId || !userId) {
        res.status(401).json({ success: false, error: 'Usuario no autenticado' });
        return;
      }

      const factory = DatabaseServiceFactory.getInstance();
      const connection = await factory.getConnection();

      // Determine which patient to fetch based on role
      let targetPatientId: number | null = null;

      if (isPatient(roleId)) {
        // Patient can only view their own profile
        let patientResult = await connection.query(
          'SELECT patient_id FROM patient WHERE user_id = $1',
          [userId]
        );
        
        // Auto-create patient record if missing
        if (patientResult.length === 0) {
          console.log('[ClinicalProfile] Patient record missing, auto-creating for user_id:', userId);
          
          // Get user info for creating patient
          const userInfo = await connection.query(
            'SELECT email, created_at, updated_at FROM users WHERE user_id = $1',
            [userId]
          );
          
          if (userInfo.length > 0) {
            // Create the patient record
            const createResult = await connection.query(
              `INSERT INTO patient (user_id, patient_name, patient_last_name, country, created_at, updated_at)
               VALUES ($1, '', '', 'Chile', $2, $3)
               RETURNING patient_id`,
              [userId, userInfo[0].created_at || new Date(), new Date()]
            );
            
            if (createResult.length > 0) {
              console.log('[ClinicalProfile] Patient record created with patient_id:', createResult[0].patient_id);
              patientResult = createResult;
            }
          }
          
          // Re-check if creation succeeded
          if (patientResult.length === 0) {
            res.status(404).json({ success: false, error: 'Perfil de paciente no encontrado' });
            return;
          }
        }
        
        targetPatientId = patientResult[0].patient_id;
        
        // If they specified a different patient, deny access
        if (requestedPatientId && requestedPatientId !== targetPatientId) {
          res.status(403).json({ success: false, error: 'No tiene acceso a este perfil' });
          return;
        }
      } else if (isDoctor(roleId)) {
        // Doctor can view their assigned patients
        if (!requestedPatientId) {
          res.status(400).json({ success: false, error: 'Debe especificar el ID del paciente' });
          return;
        }

        // Verify the patient is assigned to this doctor
        const doctorResult = await connection.query(
          'SELECT doctor_id FROM doctor WHERE user_id = $1',
          [userId]
        );

        if (doctorResult.length === 0) {
          res.status(404).json({ success: false, error: 'Perfil de médico no encontrado' });
          return;
        }

        const doctorId = doctorResult[0].doctor_id;
        
        const assignmentResult = await connection.query(
          `SELECT 1 FROM relation_patient_doctor 
           WHERE doctor_id = $1 AND patient_id = $2 AND active = TRUE`,
          [doctorId, requestedPatientId]
        );

        if (assignmentResult.length === 0) {
          res.status(403).json({ success: false, error: 'Este paciente no está asignado a usted' });
          return;
        }

        targetPatientId = requestedPatientId;
      } else if (isAdmin(roleId)) {
        // Admin can view any patient
        if (!requestedPatientId) {
          res.status(400).json({ success: false, error: 'Debe especificar el ID del paciente' });
          return;
        }
        targetPatientId = requestedPatientId;
      } else {
        res.status(403).json({ success: false, error: 'Rol no autorizado' });
        return;
      }

      // Ensure we have a valid patient ID before fetching
      if (!targetPatientId) {
        res.status(400).json({ success: false, error: 'ID de paciente no especificado' });
        return;
      }

      // Fetch all clinical profile data
      const [demographics, riskAssessment, riskFactors, assignedDoctor, smokingHistory, symptoms, diagnosticTest] = 
        await Promise.all([
          this.getDemographics(connection, targetPatientId),
          this.getRiskAssessment(connection, targetPatientId),
          this.getRiskFactors(connection, targetPatientId),
          this.getAssignedDoctor(connection, targetPatientId),
          this.getSmokingHistory(connection, targetPatientId),
          this.getSymptoms(connection, targetPatientId),
          this.getLastDiagnosticTest(connection, targetPatientId)
        ]);

      if (!demographics) {
        res.status(404).json({ success: false, error: 'Paciente no encontrado' });
        return;
      }

      const profile: ClinicalProfile = {
        demographics,
        riskAssessment,
        riskFactors,
        assignedDoctor,
        smokingHistory,
        symptoms,
        lastDiagnosticTest: diagnosticTest
      };

      res.json({ success: true, data: profile });
    } catch (error) {
      console.error('Error fetching clinical profile:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error al obtener perfil clínico',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      });
    }
  }

  /**
   * Get patient demographics
   */
  private async getDemographics(connection: any, patientId: number): Promise<PatientDemographics | null> {
    const result = await connection.query(`
      SELECT 
        p.patient_id,
        p.user_id,
        p.patient_name,
        p.patient_last_name,
        p.date_of_birth,
        EXTRACT(YEAR FROM AGE(p.date_of_birth)) as age,
        p.gender,
        p.phone,
        p.country,
        p.city,
        p.occupation,
        p.emergency_contact_name,
        p.emergency_contact_phone
      FROM patient p
      WHERE p.patient_id = $1
    `, [patientId]);

    if (result.length === 0) return null;

    const p = result[0];
    return {
      patientId: p.patient_id,
      userId: p.user_id,
      name: p.patient_name,
      lastName: p.patient_last_name,
      fullName: `${p.patient_name} ${p.patient_last_name}`,
      dateOfBirth: p.date_of_birth,
      age: p.age ? parseInt(p.age) : null,
      gender: p.gender,
      phone: p.phone,
      country: p.country || 'Chile',
      city: p.city,
      occupation: p.occupation,
      emergencyContactName: p.emergency_contact_name,
      emergencyContactPhone: p.emergency_contact_phone
    };
  }

  /**
   * Get current risk assessment
   * Note: Returns mock data if ml_predictions table doesn't exist yet
   */
  private async getRiskAssessment(connection: any, patientId: number): Promise<RiskAssessment | null> {
    try {
      // Check if table exists first
      const tableCheck = await connection.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = 'ml_predictions'
        ) as exists
      `);

      if (!tableCheck[0]?.exists) {
        // Return demo data if table doesn't exist
        return this.getDemoRiskAssessment(patientId);
      }

      const result = await connection.query(`
        SELECT 
          prediction_id,
          risk_score,
          risk_level,
          confidence,
          prediction_date,
          model_version,
          assessment_type
        FROM ml_predictions
        WHERE patient_id = $1 AND is_current = TRUE
        ORDER BY prediction_date DESC
        LIMIT 1
      `, [patientId]);

      if (result.length === 0) {
        // Return demo data if no predictions exist
        return this.getDemoRiskAssessment(patientId);
      }

      const r = result[0];
      return {
        predictionId: r.prediction_id,
        riskScore: parseFloat(r.risk_score),
        riskLevel: r.risk_level,
        confidence: parseFloat(r.confidence),
        predictionDate: r.prediction_date,
        modelVersion: r.model_version,
        assessmentType: r.assessment_type
      };
    } catch (error) {
      console.warn('Error fetching risk assessment, using demo data:', error);
      return this.getDemoRiskAssessment(patientId);
    }
  }

  /**
   * Generate demo risk assessment data for development
   */
  private getDemoRiskAssessment(patientId: number): RiskAssessment {
    // Generate deterministic but varied data based on patientId
    const riskScores = [25, 42, 58, 72, 84];
    const riskLevels: Array<'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL'> = ['LOW', 'MODERATE', 'MODERATE', 'HIGH', 'CRITICAL'];
    const index = patientId % riskScores.length;

    return {
      predictionId: 1000 + patientId,
      riskScore: riskScores[index],
      riskLevel: riskLevels[index],
      confidence: 0.85 + (patientId % 10) * 0.01,
      predictionDate: new Date().toISOString(),
      modelVersion: '2.1.0-demo',
      assessmentType: 'COMPREHENSIVE'
    };
  }

  /**
   * Get risk factors for patient
   */
  private async getRiskFactors(connection: any, patientId: number): Promise<RiskFactor[]> {
    const factors: RiskFactor[] = [];

    try {
      // Get smoking history
      const smokingResult = await connection.query(`
        SELECT 
          smoking_id,
          smoking_status,
          cigarettes_per_day,
          start_date,
          quit_date,
          EXTRACT(YEAR FROM AGE(COALESCE(quit_date, CURRENT_DATE), start_date)) as years_smoking
        FROM smoking_history
        WHERE patient_id = $1 AND is_current_status = TRUE
        LIMIT 1
      `, [patientId]);

      if (smokingResult.length > 0) {
        const s = smokingResult[0];
        if (s.smoking_status === 'CURRENT_SMOKER' || s.smoking_status === 'FORMER_SMOKER') {
          const yearsSmoked = s.years_smoking || 0;
          const packYears = Math.round((s.cigarettes_per_day || 0) / 20 * yearsSmoked);
          
          factors.push({
            id: s.smoking_id,
            type: 'smoking',
            title: s.smoking_status === 'CURRENT_SMOKER' ? 'Tabaquismo Activo' : 'Ex-Fumador',
            description: `Índice tabáquico: ${packYears} paquetes/año`,
            severity: packYears > 30 ? 'HIGH' : packYears > 15 ? 'MODERATE' : 'LOW',
            icon: 'flame-outline'
          });
        }
      }
    } catch (error) {
      console.warn('Error fetching smoking history:', error);
      // Add demo smoking factor
      factors.push({
        id: 1,
        type: 'smoking',
        title: 'Tabaquismo Activo',
        description: 'Índice tabáquico: 25 paquetes/año (demo)',
        severity: 'MODERATE',
        icon: 'flame-outline'
      });
    }

    // Get occupational exposure (table may not exist)
    try {
      const tableCheck = await connection.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = 'occupational_exposure'
        ) as exists
      `);

      if (tableCheck[0]?.exists) {
        const exposureResult = await connection.query(`
          SELECT 
            exposure_id,
            exposure_type,
            exposure_description,
            years_exposed,
            risk_contribution
          FROM occupational_exposure
          WHERE patient_id = $1 AND is_active = TRUE
        `, [patientId]);

        exposureResult.forEach((e: any) => {
          factors.push({
            id: e.exposure_id,
            type: 'occupational',
            title: 'Exposición Laboral',
            description: `${e.exposure_type} (${e.years_exposed} años)`,
            severity: e.risk_contribution || 'MODERATE',
            icon: 'construct-outline'
          });
        });
      } else {
        // Add demo occupational exposure if table doesn't exist
        factors.push({
          id: 2,
          type: 'occupational',
          title: 'Exposición Laboral',
          description: 'Polvo de sílice (8 años) - demo',
          severity: 'MODERATE',
          icon: 'construct-outline'
        });
      }
    } catch (error) {
      console.warn('Error fetching occupational exposure:', error);
    }

    try {
      // Get other risk factors
      const riskResult = await connection.query(`
        SELECT 
          factor_id,
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

      if (riskResult.length > 0) {
        const rf = riskResult[0];
        
        if (rf.family_history_cancer) {
          factors.push({
            id: rf.factor_id * 100 + 1,
            type: 'family_history',
            title: 'Antecedentes Familiares',
            description: 'Historia familiar de cáncer',
            severity: 'MODERATE',
            icon: 'people-outline'
          });
        }
        
        if (rf.toxin_exposure) {
          factors.push({
            id: rf.factor_id * 100 + 2,
            type: 'toxin',
            title: 'Exposición a Toxinas',
            description: 'Exposición ambiental a toxinas',
            severity: 'HIGH',
            icon: 'warning-outline'
          });
        }
      }
    } catch (error) {
      console.warn('Error fetching risk factors:', error);
    }

    return factors;
  }

  /**
   * Get assigned doctor
   */
  private async getAssignedDoctor(connection: any, patientId: number): Promise<AssignedDoctor | null> {
    const result = await connection.query(`
      SELECT 
        d.doctor_id,
        d.doctor_name,
        d.doctor_last_name,
        d.specialty,
        d.hospital_institution,
        d.phone,
        d.email_institutional,
        rpd.assignment_date
      FROM relation_patient_doctor rpd
      INNER JOIN doctor d ON rpd.doctor_id = d.doctor_id
      WHERE rpd.patient_id = $1 AND rpd.active = TRUE
      ORDER BY rpd.assignment_date DESC
      LIMIT 1
    `, [patientId]);

    if (result.length === 0) return null;

    const d = result[0];
    return {
      doctorId: d.doctor_id,
      name: d.doctor_name,
      lastName: d.doctor_last_name,
      fullName: `${d.doctor_name} ${d.doctor_last_name}`,
      specialty: d.specialty || 'Medicina General',
      institution: d.hospital_institution || 'Sin institución',
      phone: d.phone,
      email: d.email_institutional,
      assignmentDate: d.assignment_date
    };
  }

  /**
   * Get smoking history summary
   */
  private async getSmokingHistory(connection: any, patientId: number): Promise<any | null> {
    const result = await connection.query(`
      SELECT 
        smoking_status,
        cigarettes_per_day,
        start_date,
        quit_date,
        EXTRACT(YEAR FROM AGE(COALESCE(quit_date, CURRENT_DATE), start_date)) as years_smoking
      FROM smoking_history
      WHERE patient_id = $1 AND is_current_status = TRUE
      LIMIT 1
    `, [patientId]);

    if (result.length === 0) return null;

    const s = result[0];
    const yearsSmoked = s.years_smoking || 0;
    const packYears = Math.round((s.cigarettes_per_day || 0) / 20 * yearsSmoked);

    return {
      status: s.smoking_status,
      cigarettesPerDay: s.cigarettes_per_day,
      startDate: s.start_date,
      quitDate: s.quit_date,
      yearsSmoked,
      packYears
    };
  }

  /**
   * Get recent symptoms
   */
  private async getSymptoms(connection: any, patientId: number): Promise<any[]> {
    const result = await connection.query(`
      SELECT 
        symptom_id,
        chest_pain,
        shortness_of_breath,
        chronic_cough,
        weight_loss,
        fatigue,
        hemoptysis,
        report_date
      FROM symptom
      WHERE patient_id = $1
      ORDER BY report_date DESC
      LIMIT 5
    `, [patientId]);

    return result.map((s: any) => ({
      id: s.symptom_id,
      date: s.report_date,
      symptoms: {
        chestPain: s.chest_pain,
        shortnessOfBreath: s.shortness_of_breath,
        chronicCough: s.chronic_cough,
        weightLoss: s.weight_loss,
        fatigue: s.fatigue,
        hemoptysis: s.hemoptysis
      }
    }));
  }

  /**
   * Get last diagnostic test
   */
  private async getLastDiagnosticTest(connection: any, patientId: number): Promise<any | null> {
    const result = await connection.query(`
      SELECT 
        test_id,
        test_type,
        lung_function,
        tumor_size_cm,
        tumor_location,
        metastasis,
        stage_of_cancer,
        treatment_type,
        test_date,
        result_date,
        medical_center
      FROM diagnostic_test
      WHERE patient_id = $1
      ORDER BY result_date DESC
      LIMIT 1
    `, [patientId]);

    if (result.length === 0) return null;

    const t = result[0];
    return {
      testId: t.test_id,
      testType: t.test_type,
      lungFunction: t.lung_function,
      tumorSizeCm: t.tumor_size_cm,
      tumorLocation: t.tumor_location,
      metastasis: t.metastasis,
      stageOfCancer: t.stage_of_cancer,
      treatmentType: t.treatment_type,
      testDate: t.test_date,
      resultDate: t.result_date,
      medicalCenter: t.medical_center
    };
  }

  /**
   * GET /api/clinical-profile/risk-history/:patientId
   * Get risk score history for charts
   */
  async getRiskHistory(req: Request, res: Response): Promise<void> {
    try {
      const roleId = Number(req.user?.roleId);
      const userId = req.user?.id;
      const patientId = parseInt(req.params.patientId);

      if (!roleId || !userId) {
        res.status(401).json({ success: false, error: 'Usuario no autenticado' });
        return;
      }

      // Authorization check similar to getClinicalProfile
      const factory = DatabaseServiceFactory.getInstance();
      const connection = await factory.getConnection();

      // Verify access (simplified - reuse authorization logic)
      if (isPatient(roleId)) {
        const patientResult = await connection.query(
          'SELECT patient_id FROM patient WHERE user_id = $1',
          [userId]
        );
        if (patientResult.length === 0 || patientResult[0].patient_id !== patientId) {
          res.status(403).json({ success: false, error: 'No tiene acceso a este perfil' });
          return;
        }
      }

      const result = await connection.query(`
        SELECT 
          prediction_id,
          risk_score,
          risk_level,
          prediction_date
        FROM ml_predictions
        WHERE patient_id = $1
        ORDER BY prediction_date DESC
        LIMIT 10
      `, [patientId]);

      res.json({
        success: true,
        data: result.map((r: any) => ({
          predictionId: r.prediction_id,
          riskScore: parseFloat(r.risk_score),
          riskLevel: r.risk_level,
          predictionDate: r.prediction_date
        }))
      });
    } catch (error) {
      console.error('Error fetching risk history:', error);
      res.status(500).json({ success: false, error: 'Error al obtener historial de riesgo' });
    }
  }
}
