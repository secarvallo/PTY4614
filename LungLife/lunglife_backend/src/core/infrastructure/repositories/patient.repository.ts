/**
 * 🧑‍⚕️ Patient Repository Implementation
 * Handles patient data according to BD v5.0 schema
 * Uses: patient table
 */

import { IDatabaseConnection } from '../../interfaces/database.interface';
import { IRepository } from '../../interfaces/repository.interface';
import { Logger } from '../../services/logger.service';

// Patient entity matching BD v5.0 schema
export interface IPatient {
    patient_id: number;
    user_id: number;
    patient_name: string;
    patient_last_name: string;
    date_of_birth: Date | null;
    gender: 'MALE' | 'FEMALE' | 'OTHER' | null;
    height_cm: number | null;
    weight_kg: number | null;
    phone: string | null;
    country: string;
    city: string | null;
    area_residence: 'URBAN' | 'RURAL' | 'SUBURBAN' | null;
    occupation: string | null;
    emergency_contact_name: string | null;
    emergency_contact_phone: string | null;
    registration_date: Date;
    created_at: Date;
    updated_at: Date;
}

export interface CreatePatientDTO {
    user_id: number;
    patient_name: string;
    patient_last_name: string;
    date_of_birth?: Date;
    gender?: 'MALE' | 'FEMALE' | 'OTHER';
    height_cm?: number;
    weight_kg?: number;
    phone?: string;
    country?: string;
    city?: string;
    area_residence?: 'URBAN' | 'RURAL' | 'SUBURBAN';
    occupation?: string;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
}

export interface UpdatePatientDTO {
    patient_name?: string;
    patient_last_name?: string;
    date_of_birth?: Date;
    gender?: 'MALE' | 'FEMALE' | 'OTHER';
    height_cm?: number;
    weight_kg?: number;
    phone?: string;
    country?: string;
    city?: string;
    area_residence?: 'URBAN' | 'RURAL' | 'SUBURBAN';
    occupation?: string;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
}

export class PatientRepository implements IRepository<IPatient> {
    private db: IDatabaseConnection;
    private logger: Logger;

    constructor(db: IDatabaseConnection, logger: Logger) {
        this.db = db;
        this.logger = logger;
    }

    // ===== CRUD OPERATIONS =====

    async findById(patientId: number): Promise<IPatient | null> {
        try {
            const result = await this.db.query<IPatient>(
                'SELECT * FROM patient WHERE patient_id = $1',
                [patientId]
            );
            return result.length > 0 ? result[0] : null;
        } catch (error) {
            this.logger.error(`Error finding patient by id ${patientId}:`, error);
            throw error;
        }
    }

    async findByUserId(userId: number): Promise<IPatient | null> {
        try {
            const result = await this.db.query<IPatient>(
                'SELECT * FROM patient WHERE user_id = $1',
                [userId]
            );
            return result.length > 0 ? result[0] : null;
        } catch (error) {
            this.logger.error(`Error finding patient for user ${userId}:`, error);
            throw error;
        }
    }

    async findAll(): Promise<IPatient[]> {
        try {
            return await this.db.query<IPatient>(
                'SELECT * FROM patient ORDER BY updated_at DESC'
            );
        } catch (error) {
            this.logger.error('Error finding all patients:', error);
            throw error;
        }
    }

    async findBy(criteria: Partial<IPatient>): Promise<IPatient[]> {
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
            const query = `SELECT * FROM patient ${whereClause} ORDER BY updated_at DESC`;

            return await this.db.query<IPatient>(query, values);
        } catch (error) {
            this.logger.error('Error finding patients by criteria:', error);
            throw error;
        }
    }

    async create(patientData: CreatePatientDTO): Promise<IPatient> {
        try {
            const query = `
                INSERT INTO patient (
                    user_id, patient_name, patient_last_name, date_of_birth, gender,
                    height_cm, weight_kg, phone, country, city,
                    area_residence, occupation, emergency_contact_name, emergency_contact_phone
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
                ) RETURNING *
            `;

            const values = [
                patientData.user_id,
                patientData.patient_name,
                patientData.patient_last_name,
                patientData.date_of_birth || null,
                patientData.gender || null,
                patientData.height_cm || null,
                patientData.weight_kg || null,
                patientData.phone || null,
                patientData.country || 'Chile',
                patientData.city || null,
                patientData.area_residence || null,
                patientData.occupation || null,
                patientData.emergency_contact_name || null,
                patientData.emergency_contact_phone || null
            ];

            const result = await this.db.query<IPatient>(query, values);
            this.logger.info(`Patient created successfully for user ${patientData.user_id}`);

            // Mark user profile as completed
            await this.db.query(
                'UPDATE users SET profile_completed = TRUE WHERE user_id = $1',
                [patientData.user_id]
            );

            return result[0];
        } catch (error) {
            this.logger.error('Error creating patient:', error);
            throw error;
        }
    }

    async update(patientId: number, patientData: UpdatePatientDTO): Promise<IPatient | null> {
        try {
            const setClauses: string[] = [];
            const values: any[] = [];
            let paramIndex = 1;

            Object.entries(patientData).forEach(([key, value]) => {
                if (value !== undefined) {
                    setClauses.push(`${key} = $${paramIndex}`);
                    values.push(value);
                    paramIndex++;
                }
            });

            if (setClauses.length === 0) {
                return await this.findById(patientId);
            }

            setClauses.push(`updated_at = CURRENT_TIMESTAMP`);
            values.push(patientId);

            const query = `
                UPDATE patient 
                SET ${setClauses.join(', ')} 
                WHERE patient_id = $${paramIndex} 
                RETURNING *
            `;

            const result = await this.db.query<IPatient>(query, values);
            
            if (result.length > 0) {
                this.logger.info(`Patient ${patientId} updated successfully`);
                return result[0];
            }
            
            return null;
        } catch (error) {
            this.logger.error(`Error updating patient ${patientId}:`, error);
            throw error;
        }
    }

    async delete(patientId: number): Promise<boolean> {
        try {
            const result = await this.db.query(
                'DELETE FROM patient WHERE patient_id = $1 RETURNING patient_id',
                [patientId]
            );
            
            const deleted = result.length > 0;
            if (deleted) {
                this.logger.info(`Patient ${patientId} deleted successfully`);
            }
            
            return deleted;
        } catch (error) {
            this.logger.error(`Error deleting patient ${patientId}:`, error);
            throw error;
        }
    }

    async exists(patientId: number): Promise<boolean> {
        try {
            const result = await this.db.query(
                'SELECT 1 FROM patient WHERE patient_id = $1',
                [patientId]
            );
            return result.length > 0;
        } catch (error) {
            this.logger.error(`Error checking patient existence ${patientId}:`, error);
            throw error;
        }
    }

    async count(criteria?: Partial<IPatient>): Promise<number> {
        try {
            let query = 'SELECT COUNT(*) as count FROM patient';
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
            this.logger.error('Error counting patients:', error);
            throw error;
        }
    }

    // ===== PATIENT-SPECIFIC QUERIES =====

    async findPatientWithLatestRisk(patientId: number): Promise<any> {
        try {
            const query = `
                SELECT p.*, 
                       mp.risk_score, 
                       mp.risk_level, 
                       mp.confidence,
                       mp.prediction_date
                FROM patient p
                LEFT JOIN ml_predictions mp ON p.patient_id = mp.patient_id AND mp.is_current = TRUE
                WHERE p.patient_id = $1
            `;
            
            const result = await this.db.query(query, [patientId]);
            return result.length > 0 ? result[0] : null;
        } catch (error) {
            this.logger.error(`Error finding patient with risk for ${patientId}:`, error);
            throw error;
        }
    }

    async findPatientsWithHighRisk(): Promise<IPatient[]> {
        try {
            const query = `
                SELECT p.* 
                FROM patient p
                INNER JOIN ml_predictions mp ON p.patient_id = mp.patient_id
                WHERE mp.is_current = TRUE 
                  AND mp.risk_level IN ('HIGH', 'VERY_HIGH')
                ORDER BY mp.risk_score DESC
            `;
            
            return await this.db.query<IPatient>(query);
        } catch (error) {
            this.logger.error('Error finding high-risk patients:', error);
            throw error;
        }
    }

    async getPatientCompletionStats(): Promise<{ completed: number; incomplete: number; total: number }> {
        try {
            const query = `
                SELECT 
                    COUNT(*) FILTER (WHERE profile_completed = true) as completed,
                    COUNT(*) FILTER (WHERE profile_completed = false) as incomplete,
                    COUNT(*) as total
                FROM users u
                INNER JOIN patient p ON u.user_id = p.user_id
                WHERE u.role = 'PATIENT'
            `;
            
            const result = await this.db.query<any>(query);
            return {
                completed: parseInt(result[0].completed || '0', 10),
                incomplete: parseInt(result[0].incomplete || '0', 10),
                total: parseInt(result[0].total || '0', 10)
            };
        } catch (error) {
            this.logger.error('Error getting patient completion stats:', error);
            throw error;
        }
    }

    async findByDoctorId(doctorId: number): Promise<IPatient[]> {
        try {
            const query = `
                SELECT p.* 
                FROM patient p
                INNER JOIN relation_patient_doctor rpd ON p.patient_id = rpd.patient_id
                WHERE rpd.doctor_id = $1 AND rpd.active = TRUE
                ORDER BY p.patient_last_name, p.patient_name
            `;
            
            return await this.db.query<IPatient>(query, [doctorId]);
        } catch (error) {
            this.logger.error(`Error finding patients for doctor ${doctorId}:`, error);
            throw error;
        }
    }

    async searchPatients(searchTerm: string, limit: number = 20): Promise<IPatient[]> {
        try {
            const query = `
                SELECT * FROM patient
                WHERE patient_name ILIKE $1 
                   OR patient_last_name ILIKE $1
                   OR CONCAT(patient_name, ' ', patient_last_name) ILIKE $1
                ORDER BY patient_last_name, patient_name
                LIMIT $2
            `;
            
            return await this.db.query<IPatient>(query, [`%${searchTerm}%`, limit]);
        } catch (error) {
            this.logger.error(`Error searching patients:`, error);
            throw error;
        }
    }
}
