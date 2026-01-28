/**
 * Doctor Controller
 * Handles doctor directory operations for patients to find and select doctors
 */

import { Request, Response } from 'express';
import { DatabaseServiceFactory } from '../../infrastructure/factories/database.factory';

export class DoctorController {
  
  /**
   * GET /api/doctors
   * Get list of all active doctors with optional search and filters
   * Query params: search, specialty, institution
   */
  async getDoctors(req: Request, res: Response): Promise<void> {
    try {
      const { search, specialty, institution } = req.query;
      
      const factory = DatabaseServiceFactory.getInstance();
      const connection = await factory.getConnection();
      
      let query = `
        SELECT 
          d.doctor_id,
          d.user_id,
          d.doctor_name,
          d.doctor_last_name,
          d.specialty,
          d.hospital_institution,
          d.email_institutional,
          u.email
        FROM doctor d
        INNER JOIN users u ON d.user_id = u.user_id
        WHERE u.is_active = TRUE
      `;
      
      const params: any[] = [];
      let paramIndex = 1;
      
      // Search filter (name or specialty)
      if (search && typeof search === 'string') {
        query += ` AND (
          LOWER(d.doctor_name) LIKE LOWER($${paramIndex})
          OR LOWER(d.doctor_last_name) LIKE LOWER($${paramIndex})
          OR LOWER(d.specialty) LIKE LOWER($${paramIndex})
        )`;
        params.push(`%${search}%`);
        paramIndex++;
      }
      
      // Specialty filter
      if (specialty && typeof specialty === 'string') {
        query += ` AND LOWER(d.specialty) = LOWER($${paramIndex})`;
        params.push(specialty);
        paramIndex++;
      }
      
      // Institution filter
      if (institution && typeof institution === 'string') {
        query += ` AND LOWER(d.hospital_institution) = LOWER($${paramIndex})`;
        params.push(institution);
        paramIndex++;
      }
      
      query += ` ORDER BY d.doctor_last_name, d.doctor_name`;
      
      const doctors = await connection.query(query, params);
      
      res.json({
        success: true,
        data: doctors.map((doc: any) => ({
          doctorId: doc.doctor_id,
          userId: doc.user_id,
          name: doc.doctor_name,
          lastName: doc.doctor_last_name,
          fullName: `${doc.doctor_name} ${doc.doctor_last_name}`,
          specialty: doc.specialty || 'Sin especialidad',
          institution: doc.hospital_institution || 'Sin institución',
          email: doc.email_institutional || doc.email
        })),
        total: doctors.length
      });
    } catch (error) {
      console.error('Error fetching doctors:', error);
      res.status(500).json({
        success: false,
        error: 'Error al obtener lista de médicos'
      });
    }
  }
  
  /**
   * GET /api/doctors/specialties
   * Get unique list of specialties
   */
  async getSpecialties(req: Request, res: Response): Promise<void> {
    try {
      const factory = DatabaseServiceFactory.getInstance();
      const connection = await factory.getConnection();
      
      const result = await connection.query(`
        SELECT DISTINCT specialty 
        FROM doctor 
        WHERE specialty IS NOT NULL AND specialty != ''
        ORDER BY specialty
      `);
      
      res.json({
        success: true,
        data: result.map((r: any) => r.specialty)
      });
    } catch (error) {
      console.error('Error fetching specialties:', error);
      res.status(500).json({
        success: false,
        error: 'Error al obtener especialidades'
      });
    }
  }
  
  /**
   * GET /api/doctors/institutions
   * Get unique list of institutions
   */
  async getInstitutions(req: Request, res: Response): Promise<void> {
    try {
      const factory = DatabaseServiceFactory.getInstance();
      const connection = await factory.getConnection();
      
      const result = await connection.query(`
        SELECT DISTINCT hospital_institution 
        FROM doctor 
        WHERE hospital_institution IS NOT NULL AND hospital_institution != ''
        ORDER BY hospital_institution
      `);
      
      res.json({
        success: true,
        data: result.map((r: any) => r.hospital_institution)
      });
    } catch (error) {
      console.error('Error fetching institutions:', error);
      res.status(500).json({
        success: false,
        error: 'Error al obtener instituciones'
      });
    }
  }
  
  /**
   * GET /api/patient/current-doctor
   * Get the current assigned doctor for the authenticated patient
   */
  async getCurrentDoctor(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Usuario no autenticado'
        });
        return;
      }
      
      const factory = DatabaseServiceFactory.getInstance();
      const connection = await factory.getConnection();
      
      // Get patient_id from user_id
      const patientResult = await connection.query(
        'SELECT patient_id FROM patient WHERE user_id = $1',
        [userId]
      );
      
      if (patientResult.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Perfil de paciente no encontrado'
        });
        return;
      }
      
      const patientId = patientResult[0].patient_id;
      
      // Get current active doctor assignment
      const doctorResult = await connection.query(`
        SELECT 
          d.doctor_id,
          d.user_id,
          d.doctor_name,
          d.doctor_last_name,
          d.specialty,
          d.hospital_institution,
          d.email_institutional,
          r.assignment_date,
          u.email
        FROM relation_patient_doctor r
        INNER JOIN doctor d ON r.doctor_id = d.doctor_id
        INNER JOIN users u ON d.user_id = u.user_id
        WHERE r.patient_id = $1 AND r.active = TRUE
        ORDER BY r.assignment_date DESC
        LIMIT 1
      `, [patientId]);
      
      if (doctorResult.length === 0) {
        res.json({
          success: true,
          data: null,
          message: 'No tiene médico asignado actualmente'
        });
        return;
      }
      
      const doc = doctorResult[0];
      res.json({
        success: true,
        data: {
          doctorId: doc.doctor_id,
          userId: doc.user_id,
          name: doc.doctor_name,
          lastName: doc.doctor_last_name,
          fullName: `${doc.doctor_name} ${doc.doctor_last_name}`,
          specialty: doc.specialty || 'Sin especialidad',
          institution: doc.hospital_institution || 'Sin institución',
          email: doc.email_institutional || doc.email,
          assignmentDate: doc.assignment_date
        }
      });
    } catch (error) {
      console.error('Error fetching current doctor:', error);
      res.status(500).json({
        success: false,
        error: 'Error al obtener médico asignado'
      });
    }
  }
  
  /**
   * POST /api/patient/assign-doctor
   * Assign a doctor to the authenticated patient
   * Body: { doctorId: number }
   */
  async assignDoctor(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { doctorId } = req.body;
      
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Usuario no autenticado'
        });
        return;
      }
      
      if (!doctorId) {
        res.status(400).json({
          success: false,
          error: 'ID de médico requerido'
        });
        return;
      }
      
      const factory = DatabaseServiceFactory.getInstance();
      const connection = await factory.getConnection();
      
      // Get patient_id from user_id
      const patientResult = await connection.query(
        'SELECT patient_id FROM patient WHERE user_id = $1',
        [userId]
      );
      
      if (patientResult.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Perfil de paciente no encontrado. Complete su perfil primero.'
        });
        return;
      }
      
      const patientId = patientResult[0].patient_id;
      
      // Verify doctor exists and is active
      const doctorExists = await connection.query(`
        SELECT d.doctor_id FROM doctor d
        INNER JOIN users u ON d.user_id = u.user_id
        WHERE d.doctor_id = $1 AND u.is_active = TRUE
      `, [doctorId]);
      
      if (doctorExists.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Médico no encontrado o no disponible'
        });
        return;
      }
      
      // Deactivate any existing active assignments
      await connection.query(`
        UPDATE relation_patient_doctor 
        SET active = FALSE, updated_at = NOW()
        WHERE patient_id = $1 AND active = TRUE
      `, [patientId]);
      
      // Check if there's already a relation with this doctor (reactivate it)
      const existingRelation = await connection.query(`
        SELECT relation_id FROM relation_patient_doctor
        WHERE patient_id = $1 AND doctor_id = $2
      `, [patientId, doctorId]);
      
      if (existingRelation.length > 0) {
        // Reactivate existing relation
        await connection.query(`
          UPDATE relation_patient_doctor 
          SET active = TRUE, assignment_date = CURRENT_DATE, updated_at = NOW()
          WHERE patient_id = $1 AND doctor_id = $2
        `, [patientId, doctorId]);
      } else {
        // Create new relation
        await connection.query(`
          INSERT INTO relation_patient_doctor (patient_id, doctor_id, assignment_date, active)
          VALUES ($1, $2, CURRENT_DATE, TRUE)
        `, [patientId, doctorId]);
      }
      
      // Get the assigned doctor details for response
      const doctorDetails = await connection.query(`
        SELECT 
          d.doctor_id,
          d.doctor_name,
          d.doctor_last_name,
          d.specialty,
          d.hospital_institution
        FROM doctor d
        WHERE d.doctor_id = $1
      `, [doctorId]);
      
      const doc = doctorDetails[0];
      
      res.json({
        success: true,
        message: 'Médico asignado exitosamente',
        data: {
          doctorId: doc.doctor_id,
          name: doc.doctor_name,
          lastName: doc.doctor_last_name,
          fullName: `${doc.doctor_name} ${doc.doctor_last_name}`,
          specialty: doc.specialty,
          institution: doc.hospital_institution
        }
      });
    } catch (error) {
      console.error('Error assigning doctor:', error);
      res.status(500).json({
        success: false,
        error: 'Error al asignar médico'
      });
    }
  }
}
