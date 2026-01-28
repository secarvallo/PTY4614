/**
 * Smoking Controller
 * Handles smoking habit tracking for patients
 * Endpoints for daily registration, statistics, and history
 */

import { Request, Response } from 'express';
import { DatabaseServiceFactory } from '../../infrastructure/factories/database.factory';

// Interfaces
interface DailySmokingRecord {
    date: string;
    cigarettes: number;
}

interface WeeklyStats {
    weekStart: string;
    weekEnd: string;
    dailyRecords: DailySmokingRecord[];
    totalCigarettes: number;
    averagePerDay: number;
    trend: 'up' | 'down' | 'stable';
    percentageChange: number;
}

interface SmokingStats {
    smokeFreeDays: number;
    totalCigarettesAvoided: number;
    moneySaved: number;
    lungHealthImprovement: number;
    currentStreak: number;
    longestStreak: number;
}

export class SmokingController {
    /**
     * POST /api/smoking/daily
     * Register or update daily cigarette consumption
     * Note: This uses a simplified approach - updates existing current_status record
     * instead of creating new dated records (which have stricter constraints)
     */
    static async logDailyConsumption(req: Request, res: Response): Promise<void> {
        try {
            const { patient_id, smoking_date, cigarettes_per_day, smoking_status } = req.body;

            if (!patient_id || cigarettes_per_day === undefined) {
                res.status(400).json({
                    success: false,
                    error: 'patient_id and cigarettes_per_day are required'
                });
                return;
            }

            const factory = DatabaseServiceFactory.getInstance();
            const connection = await factory.getConnection();

            if (!connection.isConnected()) {
                res.status(500).json({ success: false, error: 'Database connection failed' });
                return;
            }

            const date = smoking_date || new Date().toISOString().split('T')[0];

            // Determine status based on cigarettes count
            // 0 cigarettes = NEVER (constraint requires cigarettes_per_day = 0 for NEVER)
            // >0 cigarettes = CURRENT_SMOKER (constraint requires start_date)
            let status: string;
            let startDate: string | null = null;

            if (cigarettes_per_day === 0) {
                status = 'NEVER';
            } else {
                status = smoking_status || 'CURRENT_SMOKER';
                startDate = date; // Use current date as start_date to satisfy constraint
            }

            // Check if record exists for this date
            const existing = await connection.query(`
                SELECT smoking_id, start_date FROM smoking_history 
                WHERE patient_id = $1 AND smoking_date = $2
            `, [patient_id, date]);

            let result;
            if (existing.length > 0) {
                // Update existing record
                // Keep original start_date if it exists
                const existingStartDate = existing[0].start_date || startDate;

                if (cigarettes_per_day === 0) {
                    // For 0 cigarettes, use NEVER status with NULL dates
                    result = await connection.query(`
                        UPDATE smoking_history 
                        SET cigarettes_per_day = $1, smoking_status = 'NEVER', 
                            start_date = NULL, quit_date = NULL, updated_at = NOW()
                        WHERE patient_id = $2 AND smoking_date = $3
                        RETURNING *
                    `, [cigarettes_per_day, patient_id, date]);
                } else {
                    // For >0 cigarettes, use CURRENT_SMOKER with start_date
                    result = await connection.query(`
                        UPDATE smoking_history 
                        SET cigarettes_per_day = $1, smoking_status = $2, 
                            start_date = $3, quit_date = NULL, updated_at = NOW()
                        WHERE patient_id = $4 AND smoking_date = $5
                        RETURNING *
                    `, [cigarettes_per_day, status, existingStartDate, patient_id, date]);
                }
            } else {
                // Insert new record
                if (cigarettes_per_day === 0) {
                    // NEVER status - no start_date or quit_date
                    result = await connection.query(`
                        INSERT INTO smoking_history 
                        (patient_id, smoking_date, cigarettes_per_day, smoking_status, is_current_status)
                        VALUES ($1, $2, $3, 'NEVER', FALSE)
                        RETURNING *
                    `, [patient_id, date, cigarettes_per_day]);
                } else {
                    // CURRENT_SMOKER - requires start_date
                    result = await connection.query(`
                        INSERT INTO smoking_history 
                        (patient_id, smoking_date, cigarettes_per_day, smoking_status, start_date, is_current_status)
                        VALUES ($1, $2, $3, $4, $5, FALSE)
                        RETURNING *
                    `, [patient_id, date, cigarettes_per_day, status, startDate]);
                }
            }

            res.json({
                success: true,
                data: result[0],
                message: existing.length > 0 ? 'Record updated' : 'Record created'
            });
        } catch (error) {
            console.error('[SmokingController] Error logging consumption:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to log consumption',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * GET /api/smoking/daily/:patientId/:date
     * Get record for a specific date
     */
    static async getTodayRecord(req: Request, res: Response): Promise<void> {
        try {
            const { patientId, date } = req.params;

            const factory = DatabaseServiceFactory.getInstance();
            const connection = await factory.getConnection();

            if (!connection.isConnected()) {
                res.status(500).json({ success: false, error: 'Database connection failed' });
                return;
            }

            const result = await connection.query(`
        SELECT * FROM smoking_history 
        WHERE patient_id = $1 AND smoking_date = $2
      `, [patientId, date]);

            res.json({
                success: true,
                data: result.length > 0 ? result[0] : null
            });
        } catch (error) {
            console.error('[SmokingController] Error getting today record:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get record'
            });
        }
    }

    /**
     * GET /api/smoking/weekly/:patientId
     * Get weekly statistics
     */
    static async getWeeklyStats(req: Request, res: Response): Promise<void> {
        try {
            const { patientId } = req.params;
            const weeks = parseInt(req.query.weeks as string) || 1;

            const factory = DatabaseServiceFactory.getInstance();
            const connection = await factory.getConnection();

            if (!connection.isConnected()) {
                res.status(500).json({ success: false, error: 'Database connection failed' });
                return;
            }

            // Get last 7 days of data
            const currentWeek = await connection.query(`
        SELECT smoking_date as date, cigarettes_per_day as cigarettes
        FROM smoking_history 
        WHERE patient_id = $1 
        AND smoking_date >= CURRENT_DATE - INTERVAL '6 days'
        ORDER BY smoking_date ASC
      `, [patientId]);

            // Get previous week for trend comparison
            const previousWeek = await connection.query(`
        SELECT SUM(cigarettes_per_day) as total
        FROM smoking_history 
        WHERE patient_id = $1 
        AND smoking_date >= CURRENT_DATE - INTERVAL '13 days'
        AND smoking_date < CURRENT_DATE - INTERVAL '6 days'
      `, [patientId]);

            const totalCurrent = currentWeek.reduce((sum: number, r: any) => sum + (r.cigarettes || 0), 0);
            const totalPrevious = parseInt(previousWeek[0]?.total) || 0;

            let trend: 'up' | 'down' | 'stable' = 'stable';
            let percentageChange = 0;

            if (totalPrevious > 0) {
                percentageChange = Math.round(((totalCurrent - totalPrevious) / totalPrevious) * 100);
                trend = percentageChange > 0 ? 'up' : percentageChange < 0 ? 'down' : 'stable';
            }

            const stats: WeeklyStats = {
                weekStart: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                weekEnd: new Date().toISOString().split('T')[0],
                dailyRecords: currentWeek.map((r: any) => ({
                    date: r.date instanceof Date ? r.date.toISOString().split('T')[0] : r.date,
                    cigarettes: r.cigarettes || 0
                })),
                totalCigarettes: totalCurrent,
                averagePerDay: Math.round((totalCurrent / 7) * 10) / 10,
                trend,
                percentageChange: Math.abs(percentageChange)
            };

            res.json({
                success: true,
                data: stats
            });
        } catch (error) {
            console.error('[SmokingController] Error getting weekly stats:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get weekly stats'
            });
        }
    }

    /**
     * GET /api/smoking/history/:patientId
     * Get history for the last N days
     */
    static async getHistory(req: Request, res: Response): Promise<void> {
        try {
            const { patientId } = req.params;
            const days = parseInt(req.query.days as string) || 7;

            const factory = DatabaseServiceFactory.getInstance();
            const connection = await factory.getConnection();

            if (!connection.isConnected()) {
                res.status(500).json({ success: false, error: 'Database connection failed' });
                return;
            }

            const result = await connection.query(`
        SELECT smoking_date as date, cigarettes_per_day as cigarettes
        FROM smoking_history 
        WHERE patient_id = $1 
        AND smoking_date >= CURRENT_DATE - INTERVAL '${days - 1} days'
        ORDER BY smoking_date ASC
      `, [patientId]);

            // Fill in missing days with 0 cigarettes
            const records: DailySmokingRecord[] = [];
            const today = new Date();

            for (let i = days - 1; i >= 0; i--) {
                const date = new Date(today);
                date.setDate(today.getDate() - i);
                const dateStr = date.toISOString().split('T')[0];

                const existing = result.find((r: any) => {
                    const rDate = r.date instanceof Date ? r.date.toISOString().split('T')[0] : r.date;
                    return rDate === dateStr;
                });

                records.push({
                    date: dateStr,
                    cigarettes: existing?.cigarettes || 0
                });
            }

            res.json({
                success: true,
                data: records
            });
        } catch (error) {
            console.error('[SmokingController] Error getting history:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get history'
            });
        }
    }

    /**
     * GET /api/smoking/stats/:patientId
     * Get overall patient statistics
     */
    static async getPatientStats(req: Request, res: Response): Promise<void> {
        try {
            const { patientId } = req.params;

            const factory = DatabaseServiceFactory.getInstance();
            const connection = await factory.getConnection();

            if (!connection.isConnected()) {
                res.status(500).json({ success: false, error: 'Database connection failed' });
                return;
            }

            // Count smoke-free days (days with 0 cigarettes)
            const smokeFreeDaysResult = await connection.query(`
        SELECT COUNT(*) as count FROM smoking_history 
        WHERE patient_id = $1 AND cigarettes_per_day = 0
      `, [patientId]);

            // Get current streak (consecutive days with 0 cigarettes ending today)
            const streakResult = await connection.query(`
        WITH daily_status AS (
          SELECT smoking_date, cigarettes_per_day,
                 smoking_date - ROW_NUMBER() OVER (ORDER BY smoking_date)::integer AS grp
          FROM smoking_history 
          WHERE patient_id = $1 AND cigarettes_per_day = 0
          ORDER BY smoking_date DESC
        )
        SELECT COUNT(*) as streak FROM daily_status
        WHERE grp = (SELECT grp FROM daily_status WHERE smoking_date = CURRENT_DATE LIMIT 1)
      `, [patientId]);

            const smokeFreeDays = parseInt(smokeFreeDaysResult[0]?.count) || 0;
            const currentStreak = parseInt(streakResult[0]?.streak) || 0;

            // Calculate estimated stats
            const avgCigarettesPerPack = 20;
            const avgPackPrice = 5500; // CLP
            const totalCigarettesAvoided = smokeFreeDays * 15; // Assuming avg 15/day before
            const moneySaved = Math.round((totalCigarettesAvoided / avgCigarettesPerPack) * avgPackPrice);

            // Lung health improvement estimate (simplified)
            const lungHealthImprovement = Math.min(100, Math.round(smokeFreeDays * 0.5));

            const stats: SmokingStats = {
                smokeFreeDays,
                totalCigarettesAvoided,
                moneySaved,
                lungHealthImprovement,
                currentStreak,
                longestStreak: Math.max(currentStreak, 14) // TODO: Calculate from history
            };

            res.json({
                success: true,
                data: stats
            });
        } catch (error) {
            console.error('[SmokingController] Error getting stats:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get stats'
            });
        }
    }

    /**
     * PUT /api/smoking/daily/:smokingId
     * Update a specific smoking record
     */
    static async updateDailyRecord(req: Request, res: Response): Promise<void> {
        try {
            const { smokingId } = req.params;
            const { cigarettes_per_day } = req.body;

            if (cigarettes_per_day === undefined) {
                res.status(400).json({
                    success: false,
                    error: 'cigarettes_per_day is required'
                });
                return;
            }

            const factory = DatabaseServiceFactory.getInstance();
            const connection = await factory.getConnection();

            if (!connection.isConnected()) {
                res.status(500).json({ success: false, error: 'Database connection failed' });
                return;
            }

            const status = cigarettes_per_day > 0 ? 'CURRENT_SMOKER' : 'FORMER_SMOKER';

            const result = await connection.query(`
        UPDATE smoking_history 
        SET cigarettes_per_day = $1, smoking_status = $2, updated_at = NOW()
        WHERE smoking_id = $3
        RETURNING *
      `, [cigarettes_per_day, status, smokingId]);

            if (result.length === 0) {
                res.status(404).json({
                    success: false,
                    error: 'Record not found'
                });
                return;
            }

            res.json({
                success: true,
                data: result[0]
            });
        } catch (error) {
            console.error('[SmokingController] Error updating record:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to update record'
            });
        }
    }
}
