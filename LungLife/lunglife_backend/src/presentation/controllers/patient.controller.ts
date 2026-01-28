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

            res.json({
                success: true,
                data: {
                    conditions: result.filter((r: any) => r.entry_type === 'CONDITION'),
                    allergies: result.filter((r: any) => r.entry_type === 'ALLERGY'),
                    medications: result.filter((r: any) => r.entry_type === 'MEDICATION'),
                    all: result
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
     * Get patient lifestyle habits
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
            const result = await connection.query(`
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

            res.json({
                success: true,
                data: result.length > 0 ? result[0] : null
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
