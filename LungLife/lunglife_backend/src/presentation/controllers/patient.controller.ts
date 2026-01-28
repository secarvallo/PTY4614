/**
 * Patient Controller
 * Handles patient-specific endpoints for medical history and lifestyle
 */

import { Request, Response } from 'express';
import { DatabaseServiceFactory } from '../../infrastructure/factories/database.factory';

export class PatientController {
    /**
     * GET /api/patients/:patientId/medical-history
     * Get patient medical history entries
     */
    static async getMedicalHistory(req: Request, res: Response): Promise<void> {
        try {
            const { patientId } = req.params;

            const factory = DatabaseServiceFactory.getInstance();
            const connection = await factory.getConnection();

            if (!connection.isConnected()) {
                res.status(500).json({ success: false, error: 'Database connection failed' });
                return;
            }

            const result = await connection.query(`
                SELECT 
                    history_id,
                    patient_id,
                    doctor_id,
                    entry_type,
                    entry_name,
                    details,
                    status,
                    start_date,
                    end_date,
                    created_at,
                    updated_at
                FROM medical_history
                WHERE patient_id = $1
                ORDER BY created_at DESC
            `, [patientId]);

            // Transform to camelCase for frontend
            const formatEntry = (r: any) => ({
                id: r.history_id,
                patientId: r.patient_id,
                doctorId: r.doctor_id,
                entryType: r.entry_type,
                entryName: r.entry_name,
                details: r.details,
                status: r.status,
                startDate: r.start_date,
                endDate: r.end_date,
                createdAt: r.created_at,
                updatedAt: r.updated_at
            });

            const conditions = result.filter((r: any) => r.entry_type === 'CONDITION').map(formatEntry);
            const allergies = result.filter((r: any) => r.entry_type === 'ALLERGY').map(formatEntry);
            const medications = result.filter((r: any) => r.entry_type === 'MEDICATION').map(formatEntry);

            res.json({
                success: true,
                data: {
                    medicalHistory: conditions,
                    allergies: allergies,
                    currentMedications: medications
                }
            });
        } catch (error) {
            console.error('[PatientController] Error getting medical history:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get medical history'
            });
        }
    }

    /**
     * POST /api/patients/:patientId/medical-history
     * Add a new medical history entry
     */
    static async addMedicalHistory(req: Request, res: Response): Promise<void> {
        try {
            const { patientId } = req.params;
            const { entry_type, entry_name, details, status, start_date, end_date, doctor_id } = req.body;

            const factory = DatabaseServiceFactory.getInstance();
            const connection = await factory.getConnection();

            if (!connection.isConnected()) {
                res.status(500).json({ success: false, error: 'Database connection failed' });
                return;
            }

            const result = await connection.query(`
                INSERT INTO medical_history 
                (patient_id, doctor_id, entry_type, entry_name, details, status, start_date, end_date)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING *
            `, [patientId, doctor_id || null, entry_type, entry_name, details || null, status || 'ACTIVE', start_date || null, end_date || null]);

            res.status(201).json({
                success: true,
                data: result[0]
            });
        } catch (error) {
            console.error('[PatientController] Error adding medical history:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to add medical history'
            });
        }
    }

    /**
     * GET /api/patients/:patientId/lifestyle
     * Get patient lifestyle habits and smoking data
     */
    static async getLifestyle(req: Request, res: Response): Promise<void> {
        try {
            const { patientId } = req.params;

            const factory = DatabaseServiceFactory.getInstance();
            const connection = await factory.getConnection();

            if (!connection.isConnected()) {
                res.status(500).json({ success: false, error: 'Database connection failed' });
                return;
            }

            // Get current lifestyle habits
            const lifestyleResult = await connection.query(`
                SELECT 
                    habit_id,
                    patient_id,
                    alcohol_consumption,
                    alcohol_units_per_week,
                    physical_activity_frequency,
                    physical_activity_minutes_weekly,
                    diet_type,
                    sleep_duration_hours,
                    stress_level,
                    is_current,
                    effective_date,
                    created_at,
                    updated_at
                FROM lifestyle_habits
                WHERE patient_id = $1 AND is_current = TRUE
                ORDER BY created_at DESC
                LIMIT 1
            `, [patientId]);

            // Get current smoking status
            const smokingResult = await connection.query(`
                SELECT 
                    smoking_id,
                    patient_id,
                    smoking_status,
                    cigarettes_per_day,
                    start_date,
                    quit_date,
                    is_current_status,
                    created_at
                FROM smoking_history
                WHERE patient_id = $1 AND is_current_status = TRUE
                ORDER BY created_at DESC
                LIMIT 1
            `, [patientId]);

            // Format response to match frontend expectation
            const lifestyle = lifestyleResult.length > 0 ? {
                alcoholConsumption: lifestyleResult[0].alcohol_consumption,
                alcoholUnitsPerWeek: lifestyleResult[0].alcohol_units_per_week,
                exerciseFrequency: lifestyleResult[0].physical_activity_frequency,
                exerciseMinutesWeekly: lifestyleResult[0].physical_activity_minutes_weekly,
                dietType: lifestyleResult[0].diet_type,
                sleepHours: lifestyleResult[0].sleep_duration_hours,
                stressLevel: lifestyleResult[0].stress_level
            } : null;

            const smoking = smokingResult.length > 0 ? {
                smokingStatus: smokingResult[0].smoking_status,
                cigarettesPerDay: smokingResult[0].cigarettes_per_day,
                startDate: smokingResult[0].start_date,
                quitDate: smokingResult[0].quit_date
            } : null;

            res.json({
                success: true,
                data: {
                    lifestyle,
                    smoking
                }
            });
        } catch (error) {
            console.error('[PatientController] Error getting lifestyle:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get lifestyle'
            });
        }
    }

    /**
     * POST /api/patients/:patientId/lifestyle
     * Update patient lifestyle habits (creates new entry)
     */
    static async updateLifestyle(req: Request, res: Response): Promise<void> {
        try {
            const { patientId } = req.params;
            const {
                alcohol_consumption,
                alcohol_units_per_week,
                physical_activity_frequency,
                physical_activity_minutes_weekly,
                diet_type,
                sleep_duration_hours,
                stress_level
            } = req.body;

            const factory = DatabaseServiceFactory.getInstance();
            const connection = await factory.getConnection();

            if (!connection.isConnected()) {
                res.status(500).json({ success: false, error: 'Database connection failed' });
                return;
            }

            // Set previous records as not current
            await connection.query(`
                UPDATE lifestyle_habits
                SET is_current = FALSE, updated_at = NOW()
                WHERE patient_id = $1 AND is_current = TRUE
            `, [patientId]);

            // Insert new lifestyle record
            const result = await connection.query(`
                INSERT INTO lifestyle_habits 
                (patient_id, alcohol_consumption, alcohol_units_per_week, 
                 physical_activity_frequency, physical_activity_minutes_weekly,
                 diet_type, sleep_duration_hours, stress_level, is_current)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)
                RETURNING *
            `, [
                patientId,
                alcohol_consumption || null,
                alcohol_units_per_week || null,
                physical_activity_frequency || null,
                physical_activity_minutes_weekly || null,
                diet_type || null,
                sleep_duration_hours || null,
                stress_level || null
            ]);

            res.status(201).json({
                success: true,
                data: result[0]
            });
        } catch (error) {
            console.error('[PatientController] Error updating lifestyle:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to update lifestyle'
            });
        }
    }
}
