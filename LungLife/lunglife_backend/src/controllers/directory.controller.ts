/**
 * Directory Controller
 * Unified RBAC-based controller for multi-role directory access
 * Adapts response based on user role (Patient, Doctor, Administrator)
 */

import { Request, Response } from 'express';
import { DatabaseServiceFactory } from '../core/factories/database.factory';
import { ROLE_IDS, isPatient, isDoctor, isAdmin, hasPermission, PERMISSIONS } from '../core/rbac';

export class DirectoryController {
  
  /**
   * GET /api/directory
   * Main directory endpoint - returns data based on user role and mode
   * Query params: mode (doctors|patients|colleagues|all-users), search, specialty, institution
   */
  async getDirectory(req: Request, res: Response): Promise<void> {
    try {
      const roleId = req.user?.roleId;
      const userId = req.user?.id;
      const { mode, search, specialty, institution, status } = req.query;

      console.log('[DirectoryController] getDirectory called:', { roleId, userId, mode });

      if (!roleId || !userId) {
        res.status(401).json({
          success: false,
          error: 'Usuario no autenticado'
        });
        return;
      }

      // Validate mode based on role permissions
      const requestedMode = (mode as string) || this.getDefaultMode(roleId);
      
      if (!this.isValidModeForRole(roleId, requestedMode)) {
        res.status(403).json({
          success: false,
          error: `Modo '${requestedMode}' no permitido para su rol`
        });
        return;
      }

      // Route to appropriate handler based on mode
      switch (requestedMode) {
        case 'doctors':
          await this.getDoctors(req, res, search as string, specialty as string, institution as string);
          break;
        case 'patients':
          await this.getPatients(req, res, roleId, userId, search as string);
          break;
        case 'colleagues':
          await this.getColleagues(req, res, userId, search as string, specialty as string);
          break;
        case 'all-users':
          await this.getAllUsers(req, res, search as string, status as string);
          break;
        default:
          res.status(400).json({
            success: false,
            error: 'Modo de directorio no válido'
          });
      }
    } catch (error) {
      console.error('Error in directory controller:', error);
      console.error('Error stack:', (error as Error).stack);
      res.status(500).json({
        success: false,
        error: 'Error al obtener directorio',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      });
    }
  }

  /**
   * Get doctors list (for patients and admins)
   */
  private async getDoctors(
    req: Request, 
    res: Response, 
    search?: string, 
    specialty?: string, 
    institution?: string
  ): Promise<void> {
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
        u.email,
        u.is_active,
        (SELECT COUNT(*) FROM relation_patient_doctor rpd WHERE rpd.doctor_id = d.doctor_id AND rpd.active = TRUE) as patient_count
      FROM doctor d
      INNER JOIN users u ON d.user_id = u.user_id
      WHERE u.is_active = TRUE
    `;
    
    const params: any[] = [];
    let paramIndex = 1;
    
    if (search) {
      query += ` AND (
        LOWER(d.doctor_name) LIKE LOWER($${paramIndex})
        OR LOWER(d.doctor_last_name) LIKE LOWER($${paramIndex})
        OR LOWER(d.specialty) LIKE LOWER($${paramIndex})
      )`;
      params.push(`%${search}%`);
      paramIndex++;
    }
    
    if (specialty) {
      query += ` AND LOWER(d.specialty) = LOWER($${paramIndex})`;
      params.push(specialty);
      paramIndex++;
    }
    
    if (institution) {
      query += ` AND LOWER(d.hospital_institution) = LOWER($${paramIndex})`;
      params.push(institution);
      paramIndex++;
    }
    
    query += ` ORDER BY d.doctor_last_name, d.doctor_name`;
    
    const doctors = await connection.query(query, params);
    
    res.json({
      success: true,
      mode: 'doctors',
      data: doctors.map((doc: any) => ({
        id: doc.doctor_id,
        entityType: 'doctor',
        doctorId: doc.doctor_id,
        userId: doc.user_id,
        name: doc.doctor_name,
        lastName: doc.doctor_last_name,
        fullName: `${doc.doctor_name} ${doc.doctor_last_name}`,
        specialty: doc.specialty || 'Sin especialidad',
        institution: doc.hospital_institution || 'Sin institución',
        email: doc.email_institutional || doc.email,
        isActive: doc.is_active,
        patientCount: parseInt(doc.patient_count) || 0
      })),
      total: doctors.length
    });
  }

  /**
   * Get patients list (for doctors viewing their patients, or admins viewing all)
   */
  private async getPatients(
    req: Request, 
    res: Response, 
    roleId: number,
    userId: number,
    search?: string
  ): Promise<void> {
    const factory = DatabaseServiceFactory.getInstance();
    const connection = await factory.getConnection();
    
    let query: string;
    const params: any[] = [];
    let paramIndex = 1;

    if (isAdmin(roleId)) {
      // Admin sees all patients
      query = `
        SELECT 
          p.patient_id,
          p.user_id,
          p.patient_name,
          p.patient_last_name,
          p.gender,
          p.date_of_birth,
          u.email,
          u.is_active,
          d.doctor_id as assigned_doctor_id,
          d.doctor_name as assigned_doctor_name,
          d.doctor_last_name as assigned_doctor_lastname
        FROM patient p
        INNER JOIN users u ON p.user_id = u.user_id
        LEFT JOIN relation_patient_doctor rpd ON p.patient_id = rpd.patient_id AND rpd.active = TRUE
        LEFT JOIN doctor d ON rpd.doctor_id = d.doctor_id
        WHERE 1=1
      `;
    } else if (isDoctor(roleId)) {
      // Doctor sees only their assigned patients
      const doctorResult = await connection.query(
        'SELECT doctor_id FROM doctor WHERE user_id = $1',
        [userId]
      );
      
      if (doctorResult.length === 0) {
        res.json({
          success: true,
          mode: 'patients',
          data: [],
          total: 0,
          message: 'Perfil de médico no encontrado'
        });
        return;
      }
      
      const doctorId = doctorResult[0].doctor_id;
      
      query = `
        SELECT 
          p.patient_id,
          p.user_id,
          p.patient_name,
          p.patient_last_name,
          p.gender,
          p.date_of_birth,
          u.email,
          u.is_active,
          rpd.assignment_date
        FROM patient p
        INNER JOIN users u ON p.user_id = u.user_id
        INNER JOIN relation_patient_doctor rpd ON p.patient_id = rpd.patient_id
        WHERE rpd.doctor_id = $${paramIndex} AND rpd.active = TRUE
      `;
      params.push(doctorId);
      paramIndex++;
    } else {
      res.status(403).json({
        success: false,
        error: 'No tiene permisos para ver pacientes'
      });
      return;
    }

    if (search) {
      query += ` AND (
        LOWER(p.patient_name) LIKE LOWER($${paramIndex})
        OR LOWER(p.patient_last_name) LIKE LOWER($${paramIndex})
        OR LOWER(u.email) LIKE LOWER($${paramIndex})
      )`;
      params.push(`%${search}%`);
      paramIndex++;
    }
    
    query += ` ORDER BY p.patient_last_name, p.patient_name`;
    
    const patients = await connection.query(query, params);
    
    res.json({
      success: true,
      mode: 'patients',
      data: patients.map((p: any) => ({
        id: p.patient_id,
        entityType: 'patient',
        patientId: p.patient_id,
        userId: p.user_id,
        name: p.patient_name,
        lastName: p.patient_last_name,
        fullName: `${p.patient_name} ${p.patient_last_name}`,
        gender: p.gender,
        dateOfBirth: p.date_of_birth,
        email: p.email,
        isActive: p.is_active,
        assignmentDate: p.assignment_date,
        assignedDoctor: p.assigned_doctor_id ? {
          doctorId: p.assigned_doctor_id,
          fullName: `${p.assigned_doctor_name} ${p.assigned_doctor_lastname}`
        } : null
      })),
      total: patients.length
    });
  }

  /**
   * Get colleagues list (for doctors viewing other doctors)
   */
  private async getColleagues(
    req: Request,
    res: Response,
    currentUserId: number,
    search?: string,
    specialty?: string
  ): Promise<void> {
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
      WHERE u.is_active = TRUE AND d.user_id != $1
    `;
    
    const params: any[] = [currentUserId];
    let paramIndex = 2;
    
    if (search) {
      query += ` AND (
        LOWER(d.doctor_name) LIKE LOWER($${paramIndex})
        OR LOWER(d.doctor_last_name) LIKE LOWER($${paramIndex})
        OR LOWER(d.specialty) LIKE LOWER($${paramIndex})
      )`;
      params.push(`%${search}%`);
      paramIndex++;
    }
    
    if (specialty) {
      query += ` AND LOWER(d.specialty) = LOWER($${paramIndex})`;
      params.push(specialty);
      paramIndex++;
    }
    
    query += ` ORDER BY d.doctor_last_name, d.doctor_name`;
    
    const doctors = await connection.query(query, params);
    
    res.json({
      success: true,
      mode: 'colleagues',
      data: doctors.map((doc: any) => ({
        id: doc.doctor_id,
        entityType: 'doctor',
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
  }

  /**
   * Get all users list (for admins only)
   */
  private async getAllUsers(
    req: Request,
    res: Response,
    search?: string,
    status?: string
  ): Promise<void> {
    const factory = DatabaseServiceFactory.getInstance();
    const connection = await factory.getConnection();
    
    let query = `
      SELECT 
        u.user_id,
        u.email,
        u.is_active,
        u.created_at,
        r.role_id,
        r.role_name,
        COALESCE(d.doctor_id, p.patient_id) as entity_id,
        CASE 
          WHEN d.doctor_id IS NOT NULL THEN 'doctor'
          WHEN p.patient_id IS NOT NULL THEN 'patient'
          ELSE 'unknown'
        END as entity_type,
        COALESCE(
          d.doctor_name || ' ' || d.doctor_last_name,
          p.patient_name || ' ' || p.patient_last_name
        ) as full_name,
        d.specialty,
        d.hospital_institution
      FROM users u
      INNER JOIN roles r ON u.role_id = r.role_id
      LEFT JOIN doctor d ON u.user_id = d.user_id
      LEFT JOIN patient p ON u.user_id = p.user_id
      WHERE r.role_id IN (1, 2)
    `;
    
    const params: any[] = [];
    let paramIndex = 1;
    
    if (search) {
      query += ` AND (
        LOWER(u.email) LIKE LOWER($${paramIndex})
        OR LOWER(COALESCE(d.doctor_name, p.patient_name, '')) LIKE LOWER($${paramIndex})
        OR LOWER(COALESCE(d.doctor_last_name, p.patient_last_name, '')) LIKE LOWER($${paramIndex})
      )`;
      params.push(`%${search}%`);
      paramIndex++;
    }
    
    if (status === 'active') {
      query += ` AND u.is_active = TRUE`;
    } else if (status === 'inactive') {
      query += ` AND u.is_active = FALSE`;
    }
    
    query += ` ORDER BY r.role_id, full_name`;
    
    const users = await connection.query(query, params);
    
    res.json({
      success: true,
      mode: 'all-users',
      data: users.map((u: any) => ({
        id: u.entity_id || u.user_id,
        entityType: u.entity_type,
        userId: u.user_id,
        email: u.email,
        fullName: u.full_name || u.email,
        roleId: u.role_id,
        roleName: u.role_name,
        specialty: u.specialty,
        institution: u.hospital_institution,
        isActive: u.is_active,
        createdAt: u.created_at
      })),
      total: users.length
    });
  }

  /**
   * GET /api/directory/current-assignment
   * Get current assigned entity based on role
   * - Patient: returns their assigned doctor
   * - Doctor: returns summary of their patients
   */
  async getCurrentAssignment(req: Request, res: Response): Promise<void> {
    try {
      const roleId = req.user?.roleId;
      const userId = req.user?.id;

      if (!roleId || !userId) {
        res.status(401).json({
          success: false,
          error: 'Usuario no autenticado'
        });
        return;
      }

      const factory = DatabaseServiceFactory.getInstance();
      const connection = await factory.getConnection();

      if (isPatient(roleId)) {
        // Get patient's assigned doctor
        const patientResult = await connection.query(
          'SELECT patient_id FROM patient WHERE user_id = $1',
          [userId]
        );

        if (patientResult.length === 0) {
          res.json({
            success: true,
            data: null,
            message: 'Perfil de paciente no encontrado'
          });
          return;
        }

        const doctorResult = await connection.query(`
          SELECT 
            d.doctor_id,
            d.doctor_name,
            d.doctor_last_name,
            d.specialty,
            d.hospital_institution,
            rpd.assignment_date
          FROM relation_patient_doctor rpd
          INNER JOIN doctor d ON rpd.doctor_id = d.doctor_id
          WHERE rpd.patient_id = $1 AND rpd.active = TRUE
          LIMIT 1
        `, [patientResult[0].patient_id]);

        if (doctorResult.length === 0) {
          res.json({
            success: true,
            data: null,
            message: 'No tiene médico asignado'
          });
          return;
        }

        const doc = doctorResult[0];
        res.json({
          success: true,
          data: {
            type: 'doctor',
            doctorId: doc.doctor_id,
            fullName: `${doc.doctor_name} ${doc.doctor_last_name}`,
            specialty: doc.specialty,
            institution: doc.hospital_institution,
            assignmentDate: doc.assignment_date
          }
        });

      } else if (isDoctor(roleId)) {
        // Get doctor's patient count
        const doctorResult = await connection.query(
          'SELECT doctor_id FROM doctor WHERE user_id = $1',
          [userId]
        );

        if (doctorResult.length === 0) {
          res.json({
            success: true,
            data: null,
            message: 'Perfil de médico no encontrado'
          });
          return;
        }

        const countResult = await connection.query(`
          SELECT COUNT(*) as patient_count
          FROM relation_patient_doctor
          WHERE doctor_id = $1 AND active = TRUE
        `, [doctorResult[0].doctor_id]);

        res.json({
          success: true,
          data: {
            type: 'summary',
            patientCount: parseInt(countResult[0].patient_count) || 0
          }
        });

      } else {
        res.json({
          success: true,
          data: null
        });
      }
    } catch (error) {
      console.error('Error getting current assignment:', error);
      res.status(500).json({
        success: false,
        error: 'Error al obtener asignación actual'
      });
    }
  }

  /**
   * POST /api/directory/assign
   * Assign doctor to patient
   * - Patient: assigns themselves to a doctor
   * - Admin: can assign any patient to any doctor
   */
  async assignDoctor(req: Request, res: Response): Promise<void> {
    try {
      const roleId = req.user?.roleId;
      const userId = req.user?.id;
      const { doctorId, patientId } = req.body;

      if (!roleId || !userId) {
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

      let targetPatientId: number;

      if (isPatient(roleId)) {
        // Patient assigning themselves
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
        targetPatientId = patientResult[0].patient_id;

      } else if (isAdmin(roleId)) {
        // Admin assigning specific patient
        if (!patientId) {
          res.status(400).json({
            success: false,
            error: 'ID de paciente requerido para asignación administrativa'
          });
          return;
        }
        targetPatientId = patientId;
      } else {
        res.status(403).json({
          success: false,
          error: 'No tiene permisos para realizar asignaciones'
        });
        return;
      }

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

      // Deactivate existing assignments
      await connection.query(`
        UPDATE relation_patient_doctor 
        SET active = FALSE, updated_at = NOW()
        WHERE patient_id = $1 AND active = TRUE
      `, [targetPatientId]);

      // Check for existing relation
      const existingRelation = await connection.query(`
        SELECT relation_id FROM relation_patient_doctor
        WHERE patient_id = $1 AND doctor_id = $2
      `, [targetPatientId, doctorId]);

      if (existingRelation.length > 0) {
        await connection.query(`
          UPDATE relation_patient_doctor 
          SET active = TRUE, assignment_date = CURRENT_DATE, updated_at = NOW()
          WHERE patient_id = $1 AND doctor_id = $2
        `, [targetPatientId, doctorId]);
      } else {
        await connection.query(`
          INSERT INTO relation_patient_doctor (patient_id, doctor_id, assignment_date, active)
          VALUES ($1, $2, CURRENT_DATE, TRUE)
        `, [targetPatientId, doctorId]);
      }

      // Get assigned doctor details
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

  /**
   * PUT /api/directory/toggle-status/:userId
   * Toggle user active status (Admin only)
   */
  async toggleUserStatus(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { isActive } = req.body;

      if (!userId) {
        res.status(400).json({
          success: false,
          error: 'ID de usuario requerido'
        });
        return;
      }

      const factory = DatabaseServiceFactory.getInstance();
      const connection = await factory.getConnection();

      await connection.query(`
        UPDATE users SET is_active = $1, updated_at = NOW()
        WHERE user_id = $2
      `, [isActive, userId]);

      res.json({
        success: true,
        message: isActive ? 'Usuario activado' : 'Usuario desactivado'
      });
    } catch (error) {
      console.error('Error toggling user status:', error);
      res.status(500).json({
        success: false,
        error: 'Error al cambiar estado del usuario'
      });
    }
  }

  /**
   * GET /api/directory/statistics
   * Get directory statistics (Admin only)
   */
  async getStatistics(req: Request, res: Response): Promise<void> {
    try {
      const factory = DatabaseServiceFactory.getInstance();
      const connection = await factory.getConnection();

      const stats = await connection.query(`
        SELECT 
          (SELECT COUNT(*) FROM users WHERE role_id = 1 AND is_active = TRUE) as active_patients,
          (SELECT COUNT(*) FROM users WHERE role_id = 2 AND is_active = TRUE) as active_doctors,
          (SELECT COUNT(*) FROM users WHERE is_active = FALSE) as inactive_users,
          (SELECT COUNT(*) FROM relation_patient_doctor WHERE active = TRUE) as active_assignments,
          (SELECT COUNT(*) FROM patient WHERE user_id IN (SELECT user_id FROM users WHERE is_active = TRUE)
            AND patient_id NOT IN (SELECT patient_id FROM relation_patient_doctor WHERE active = TRUE)) as unassigned_patients
      `);

      res.json({
        success: true,
        data: stats[0]
      });
    } catch (error) {
      console.error('Error getting statistics:', error);
      res.status(500).json({
        success: false,
        error: 'Error al obtener estadísticas'
      });
    }
  }

  // ===== Helper Methods =====

  private getDefaultMode(roleId: number): string {
    switch (roleId) {
      case ROLE_IDS.PATIENT:
        return 'doctors';
      case ROLE_IDS.DOCTOR:
        return 'patients';
      case ROLE_IDS.ADMINISTRATOR:
        return 'all-users';
      default:
        return 'doctors';
    }
  }

  private isValidModeForRole(roleId: number, mode: string): boolean {
    const validModes: Record<number, string[]> = {
      [ROLE_IDS.PATIENT]: ['doctors'],
      [ROLE_IDS.DOCTOR]: ['patients', 'colleagues'],
      [ROLE_IDS.ADMINISTRATOR]: ['all-users', 'doctors', 'patients']
    };
    return validModes[roleId]?.includes(mode) ?? false;
  }
}
