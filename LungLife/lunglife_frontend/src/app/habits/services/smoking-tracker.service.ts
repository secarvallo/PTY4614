/**
 * Smoking Tracker Service
 * Manages smoking habit tracking and statistics
 */
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

// Interfaces
export interface SmokingEntry {
  smoking_id?: number;
  patient_id: number;
  smoking_date: string; // YYYY-MM-DD
  smoking_status: 'NEVER' | 'FORMER_SMOKER' | 'CURRENT_SMOKER';
  cigarettes_per_day: number;
  start_date?: string;
  quit_date?: string;
  is_current_status?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface DailySmokingRecord {
  date: string;
  cigarettes: number;
}

export interface WeeklyStats {
  weekStart: string;
  weekEnd: string;
  dailyRecords: DailySmokingRecord[];
  totalCigarettes: number;
  averagePerDay: number;
  trend: 'up' | 'down' | 'stable';
  percentageChange: number;
}

export interface SmokingStats {
  smokeFreeDays: number;
  totalCigarettesAvoided: number;
  moneySaved: number;
  lungHealthImprovement: number;
  currentStreak: number;
  longestStreak: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SmokingTrackerService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/smoking`;

  /**
   * Registra el consumo de cigarrillos del día
   */
  logDailyConsumption(patientId: number, cigarettes: number, date?: string): Observable<ApiResponse<SmokingEntry>> {
    const smokingDate = date || new Date().toISOString().split('T')[0];
    
    return this.http.post<ApiResponse<SmokingEntry>>(`${this.apiUrl}/daily`, {
      patient_id: patientId,
      smoking_date: smokingDate,
      cigarettes_per_day: cigarettes,
      smoking_status: cigarettes > 0 ? 'CURRENT_SMOKER' : 'FORMER_SMOKER'
    }).pipe(
      catchError(error => {
        console.error('[SmokingTracker] Error logging consumption:', error);
        return of({ success: false, error: error.message });
      })
    );
  }

  /**
   * Obtiene el registro del día actual
   */
  getTodayRecord(patientId: number): Observable<ApiResponse<SmokingEntry | null>> {
    const today = new Date().toISOString().split('T')[0];
    return this.http.get<ApiResponse<SmokingEntry>>(`${this.apiUrl}/daily/${patientId}/${today}`).pipe(
      catchError(() => of({ success: true, data: null }))
    );
  }

  /**
   * Obtiene estadísticas semanales para el gráfico
   */
  getWeeklyStats(patientId: number, weeksBack: number = 1): Observable<ApiResponse<WeeklyStats>> {
    return this.http.get<ApiResponse<WeeklyStats>>(`${this.apiUrl}/weekly/${patientId}?weeks=${weeksBack}`).pipe(
      catchError(error => {
        console.error('[SmokingTracker] Error getting weekly stats:', error);
        // Retornar datos mock para desarrollo
        return of(this.getMockWeeklyStats());
      })
    );
  }

  /**
   * Obtiene el historial de los últimos N días
   */
  getHistory(patientId: number, days: number = 7): Observable<ApiResponse<DailySmokingRecord[]>> {
    return this.http.get<ApiResponse<DailySmokingRecord[]>>(`${this.apiUrl}/history/${patientId}?days=${days}`).pipe(
      catchError(error => {
        console.error('[SmokingTracker] Error getting history:', error);
        return of(this.getMockHistory(days));
      })
    );
  }

  /**
   * Obtiene estadísticas generales del paciente
   */
  getPatientStats(patientId: number): Observable<ApiResponse<SmokingStats>> {
    return this.http.get<ApiResponse<SmokingStats>>(`${this.apiUrl}/stats/${patientId}`).pipe(
      catchError(error => {
        console.error('[SmokingTracker] Error getting stats:', error);
        return of(this.getMockStats());
      })
    );
  }

  /**
   * Actualiza el registro de un día específico
   */
  updateDailyRecord(smokingId: number, cigarettes: number): Observable<ApiResponse<SmokingEntry>> {
    return this.http.put<ApiResponse<SmokingEntry>>(`${this.apiUrl}/daily/${smokingId}`, {
      cigarettes_per_day: cigarettes
    }).pipe(
      catchError(error => {
        console.error('[SmokingTracker] Error updating record:', error);
        return of({ success: false, error: error.message });
      })
    );
  }

  // ========== MOCK DATA FOR DEVELOPMENT ==========

  private getMockWeeklyStats(): ApiResponse<WeeklyStats> {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay()); // Inicio de semana (domingo)
    
    const dailyRecords: DailySmokingRecord[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      dailyRecords.push({
        date: date.toISOString().split('T')[0],
        cigarettes: Math.floor(Math.random() * 10) // 0-9 cigarrillos
      });
    }

    const total = dailyRecords.reduce((sum, r) => sum + r.cigarettes, 0);

    return {
      success: true,
      data: {
        weekStart: weekStart.toISOString().split('T')[0],
        weekEnd: today.toISOString().split('T')[0],
        dailyRecords,
        totalCigarettes: total,
        averagePerDay: Math.round(total / 7 * 10) / 10,
        trend: 'down',
        percentageChange: -15
      }
    };
  }

  private getMockHistory(days: number): ApiResponse<DailySmokingRecord[]> {
    const records: DailySmokingRecord[] = [];
    const today = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      records.push({
        date: date.toISOString().split('T')[0],
        cigarettes: Math.floor(Math.random() * 12)
      });
    }

    return { success: true, data: records };
  }

  private getMockStats(): ApiResponse<SmokingStats> {
    return {
      success: true,
      data: {
        smokeFreeDays: 128,
        totalCigarettesAvoided: 2560,
        moneySaved: 450,
        lungHealthImprovement: 85,
        currentStreak: 3,
        longestStreak: 14
      }
    };
  }
}
