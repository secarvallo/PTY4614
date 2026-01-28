/* cSpell:disable */
/**
 * User Profile Controller
 * Controlador simplificado para obtener perfil de usuario según rol
 * Compatible con BD v5.0 (estructura normalizada)
 */

import { Request, Response } from 'express';
import { DatabaseServiceFactory } from '../../infrastructure/factories/database.factory';
// Import middleware to ensure global interface extensions are applied
import '../middleware';

type UserRole = 'ADMINISTRATOR' | 'PATIENT' | 'DOCTOR';

export class UserProfileController {
  
  /**
   * GET /api/profile/me
   * Obtiene el perfil del usuario autenticado según su rol
   */
  async getMyProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const role = req.user?.role;

      console.log('[UserProfileController] getMyProfile:', { userId, role });

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Usuario no autenticado'
        });
        return;
      }

      const factory = DatabaseServiceFactory.getInstance();
      const connection = await factory.getConnection();

      // Obtener datos básicos del usuario
      const userQuery = `
        SELECT 
          u.user_id,
          u.email,
          u.email_verified,
          u.is_active,
          u.role_id,
          u.created_at,
          u.updated_at,
          r.role_name
        FROM users u
        JOIN roles r ON u.role_id = r.role_id
        WHERE u.user_id = $1
      `;
      const userResult = await (connection.query as any)(userQuery, [userId]);

      if (userResult.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Usuario no encontrado'
        });
        return;
      }

      const userData = userResult[0];
      let profileData: any = null;

      // Según el rol, obtener perfil específico
      if (userData.role_id === 1) { // PATIENT
        profileData = await this.getPatientProfile(connection, userId);
      } else if (userData.role_id === 2) { // DOCTOR
        profileData = await this.getDoctorProfile(connection, userId);
      } else if (userData.role_id === 3) { // ADMINISTRATOR
        profileData = await this.getAdminProfile(connection, userId);
      }

      res.status(200).json({
        success: true,
        data: {
          user: {
            id: userData.user_id,
            email: userData.email,
            emailVerified: userData.email_verified,
            isActive: userData.is_active,
            roleId: userData.role_id,
            role: userData.role_name,
            createdAt: userData.created_at,
            updatedAt: userData.updated_at
          },
          profile: profileData
        }
      });

    } catch (error) {
      console.error('[UserProfileController] Error:', error);
      res.status(500).json({
        success: false,
        error: 'Error al obtener perfil',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      });
    }
  }

  /**
   * Obtiene perfil de paciente
   */
  private async getPatientProfile(connection: any, userId: number): Promise<any> {
    const query = `
      SELECT 
        p.patient_id,
        p.patient_name as first_name,
        p.patient_last_name as last_name,
        p.date_of_birth,
        p.gender,
        p.height_cm,
        p.weight_kg,
        p.phone,
        p.country,
        p.city,
        p.area_residence,
        p.occupation,
        p.emergency_contact_name,
        p.emergency_contact_phone,
        p.registration_date,
        p.created_at,
        p.updated_at,
        -- Smoking history
        sh.smoking_status,
        sh.cigarettes_per_day,
        sh.start_date as smoking_start_date,
        sh.quit_date as smoking_quit_date,
        -- Assigned doctor
        d.doctor_id as assigned_doctor_id,
        d.doctor_name as assigned_doctor_name,
        d.doctor_last_name as assigned_doctor_last_name,
        d.specialty as assigned_doctor_specialty
      FROM patient p
      LEFT JOIN smoking_history sh ON p.patient_id = sh.patient_id AND sh.is_current_status = TRUE
      LEFT JOIN relation_patient_doctor rpd ON p.patient_id = rpd.patient_id AND rpd.active = TRUE
      LEFT JOIN doctor d ON rpd.doctor_id = d.doctor_id
      WHERE p.user_id = $1
    `;
    
    const result = await (connection.query as any)(query, [userId]);
    
    if (result.length === 0) {
      return null;
    }

    const profile = result[0];
    return {
      type: 'PATIENT',
      patientId: profile.patient_id,
      firstName: profile.first_name,
      lastName: profile.last_name,
      fullName: `${profile.first_name} ${profile.last_name}`,
      dateOfBirth: profile.date_of_birth,
      gender: profile.gender,
      heightCm: profile.height_cm,
      weightKg: profile.weight_kg,
      phone: profile.phone,
      country: profile.country,
      city: profile.city,
      areaResidence: profile.area_residence,
      occupation: profile.occupation,
      emergencyContact: {
        name: profile.emergency_contact_name,
        phone: profile.emergency_contact_phone
      },
      registrationDate: profile.registration_date,
      smokingHistory: profile.smoking_status ? {
        status: profile.smoking_status,
        cigarettesPerDay: profile.cigarettes_per_day,
        startDate: profile.smoking_start_date,
        quitDate: profile.smoking_quit_date
      } : null,
      assignedDoctor: profile.assigned_doctor_id ? {
        doctorId: profile.assigned_doctor_id,
        fullName: `${profile.assigned_doctor_name} ${profile.assigned_doctor_last_name}`,
        specialty: profile.assigned_doctor_specialty
      } : null,
      createdAt: profile.created_at,
      updatedAt: profile.updated_at
    };
  }

  /**
   * Obtiene perfil de médico
   */
  private async getDoctorProfile(connection: any, userId: number): Promise<any> {
    const query = `
      SELECT 
        d.doctor_id,
        d.doctor_name as first_name,
        d.doctor_last_name as last_name,
        d.date_of_birth,
        d.gender,
        d.specialty,
        d.medical_license,
        d.hospital_institution,
        d.phone,
        d.email_institutional,
        d.created_at,
        d.updated_at,
        -- Patient count
        (SELECT COUNT(*) FROM relation_patient_doctor rpd WHERE rpd.doctor_id = d.doctor_id AND rpd.active = TRUE) as patient_count
      FROM doctor d
      WHERE d.user_id = $1
    `;
    
    const result = await (connection.query as any)(query, [userId]);
    
    if (result.length === 0) {
      return null;
    }

    const profile = result[0];
    return {
      type: 'DOCTOR',
      doctorId: profile.doctor_id,
      firstName: profile.first_name,
      lastName: profile.last_name,
      fullName: `${profile.first_name} ${profile.last_name}`,
      dateOfBirth: profile.date_of_birth,
      gender: profile.gender,
      specialty: profile.specialty,
      medicalLicense: profile.medical_license,
      hospitalInstitution: profile.hospital_institution,
      phone: profile.phone,
      emailInstitutional: profile.email_institutional,
      patientCount: parseInt(profile.patient_count) || 0,
      createdAt: profile.created_at,
      updatedAt: profile.updated_at
    };
  }

  /**
   * Obtiene perfil de administrador
   */
  private async getAdminProfile(connection: any, _userId: number): Promise<any> {
    // Los administradores no tienen tabla de perfil específica
    // Retornamos estadísticas del sistema
    const statsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM users WHERE is_active = TRUE) as total_users,
        (SELECT COUNT(*) FROM patient) as total_patients,
        (SELECT COUNT(*) FROM doctor) as total_doctors,
        (SELECT COUNT(*) FROM relation_patient_doctor WHERE active = TRUE) as active_assignments
    `;
    
    const result = await (connection.query as any)(statsQuery, []);
    const stats = result[0] || {};

    return {
      type: 'ADMINISTRATOR',
      systemStats: {
        totalUsers: parseInt(stats.total_users) || 0,
        totalPatients: parseInt(stats.total_patients) || 0,
        totalDoctors: parseInt(stats.total_doctors) || 0,
        activeAssignments: parseInt(stats.active_assignments) || 0
      }
    };
  }

  /**
   * GET /api/profile/:id
   * Obtiene perfil de un usuario por ID (para admins o el mismo usuario)
   */
  async getProfileById(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const role = req.user?.role;
      const targetId = parseInt(req.params.id);

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Usuario no autenticado'
        });
        return;
      }

      // Solo permitir ver el propio perfil o si es admin
      if (targetId !== userId && (role as unknown as UserRole) !== 'ADMINISTRATOR') {
        res.status(403).json({
          success: false,
          error: 'No tiene permisos para ver este perfil'
        });
        return;
      }

      // Reutilizar lógica de getMyProfile cambiando el userId
      req.user = { ...req.user, id: targetId } as any;
      await this.getMyProfile(req, res);

    } catch (error) {
      console.error('[UserProfileController] Error:', error);
      res.status(500).json({
        success: false,
        error: 'Error al obtener perfil'
      });
    }
  }

  /**
   * PUT /api/profile/me
   * Actualiza el perfil del usuario autenticado
   */
  async updateMyProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const role = req.user?.role;
      const updateData = req.body;

      console.log('[UserProfileController] updateMyProfile:', { userId, role, updateData });

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Usuario no autenticado'
        });
        return;
      }

      const factory = DatabaseServiceFactory.getInstance();
      const connection = await factory.getConnection();

      let updateQuery: string;
      let updateValues: any[];

      if ((role as unknown as UserRole) === 'PATIENT') {
        updateQuery = `
          UPDATE patient SET
            patient_name = COALESCE($2, patient_name),
            patient_last_name = COALESCE($3, patient_last_name),
            date_of_birth = COALESCE($4, date_of_birth),
            gender = COALESCE($5, gender),
            height_cm = COALESCE($6, height_cm),
            weight_kg = COALESCE($7, weight_kg),
            phone = COALESCE($8, phone),
            city = COALESCE($9, city),
            occupation = COALESCE($10, occupation),
            emergency_contact_name = COALESCE($11, emergency_contact_name),
            emergency_contact_phone = COALESCE($12, emergency_contact_phone),
            updated_at = NOW()
          WHERE user_id = $1
          RETURNING patient_id
        `;
        updateValues = [
          userId,
          updateData.firstName || updateData.first_name,
          updateData.lastName || updateData.last_name,
          updateData.dateOfBirth || updateData.date_of_birth || updateData.birth_date,
          updateData.gender,
          updateData.heightCm || updateData.height_cm,
          updateData.weightKg || updateData.weight_kg,
          updateData.phone,
          updateData.city,
          updateData.occupation,
          updateData.emergencyContactName || updateData.emergency_contact_name,
          updateData.emergencyContactPhone || updateData.emergency_contact_phone
        ];
      } else if ((role as unknown as UserRole) === 'DOCTOR') {
        updateQuery = `
          UPDATE doctor SET
            doctor_name = COALESCE($2, doctor_name),
            doctor_last_name = COALESCE($3, doctor_last_name),
            date_of_birth = COALESCE($4, date_of_birth),
            gender = COALESCE($5, gender),
            specialty = COALESCE($6, specialty),
            hospital_institution = COALESCE($7, hospital_institution),
            phone = COALESCE($8, phone),
            email_institutional = COALESCE($9, email_institutional),
            updated_at = NOW()
          WHERE user_id = $1
          RETURNING doctor_id
        `;
        updateValues = [
          userId,
          updateData.firstName || updateData.first_name,
          updateData.lastName || updateData.last_name,
          updateData.dateOfBirth || updateData.date_of_birth,
          updateData.gender,
          updateData.specialty,
          updateData.hospitalInstitution || updateData.hospital_institution,
          updateData.phone,
          updateData.emailInstitutional || updateData.email_institutional
        ];
      } else {
        res.status(400).json({
          success: false,
          error: 'Rol no soporta actualización de perfil'
        });
        return;
      }

      const result = await (connection.query as any)(updateQuery, updateValues);

      if (result.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Perfil no encontrado'
        });
        return;
      }

      // Retornar perfil actualizado
      await this.getMyProfile(req, res);

    } catch (error) {
      console.error('[UserProfileController] Error updating profile:', error);
      res.status(500).json({
        success: false,
        error: 'Error al actualizar perfil',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      });
    }
  }
}

export const userProfileController = new UserProfileController();
