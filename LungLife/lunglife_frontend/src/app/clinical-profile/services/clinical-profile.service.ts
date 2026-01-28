/**
 * Clinical Profile Service
 * Service for fetching detailed clinical profile data
 */

import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

// ===== Interfaces =====
export interface PatientDemographics {
  patientId: number;
  userId: number;
  name: string;
  lastName: string;
  fullName: string;
  dateOfBirth: string | null;
  age: number | null;
  gender: 'MALE' | 'FEMALE' | 'OTHER' | null;
  phone: string | null;
  country: string;
  city: string | null;
  occupation: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
}

export interface RiskAssessment {
  predictionId: number;
  riskScore: number;
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  confidence: number;
  predictionDate: string;
  modelVersion: string;
  assessmentType: string;
}

export interface RiskFactor {
  id: number;
  type: string;
  title: string;
  description: string;
  severity: 'LOW' | 'MODERATE' | 'HIGH';
  icon: string;
}

export interface AssignedDoctor {
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

export interface SmokingHistory {
  status: 'NEVER' | 'FORMER_SMOKER' | 'CURRENT_SMOKER';
  cigarettesPerDay: number;
  startDate: string | null;
  quitDate: string | null;
  yearsSmoked: number;
  packYears: number;
}

export interface SymptomReport {
  id: number;
  date: string;
  symptoms: {
    chestPain: boolean;
    shortnessOfBreath: boolean;
    chronicCough: boolean;
    weightLoss: boolean;
    fatigue: boolean;
    hemoptysis: boolean;
  };
}

export interface DiagnosticTest {
  testId: number;
  testType: string;
  lungFunction: number | null;
  tumorSizeCm: number | null;
  tumorLocation: string | null;
  metastasis: boolean;
  stageOfCancer: string | null;
  treatmentType: string | null;
  testDate: string | null;
  resultDate: string;
  medicalCenter: string | null;
}

export interface ClinicalProfile {
  demographics: PatientDemographics;
  riskAssessment: RiskAssessment | null;
  riskFactors: RiskFactor[];
  assignedDoctor: AssignedDoctor | null;
  smokingHistory: SmokingHistory | null;
  symptoms: SymptomReport[];
  lastDiagnosticTest: DiagnosticTest | null;
}

export interface RiskHistoryEntry {
  predictionId: number;
  riskScore: number;
  riskLevel: string;
  predictionDate: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

// ===== Service =====
@Injectable({
  providedIn: 'root'
})
export class ClinicalProfileService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl || '/api'}/clinical-profile`;

  // State signals
  private _profile = signal<ClinicalProfile | null>(null);
  private _riskHistory = signal<RiskHistoryEntry[]>([]);
  private _loading = signal<boolean>(false);
  private _error = signal<string | null>(null);

  // Public readonly signals
  readonly profile = this._profile.asReadonly();
  readonly riskHistory = this._riskHistory.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  // Computed signals for easy access
  readonly demographics = computed(() => this._profile()?.demographics ?? null);
  readonly riskAssessment = computed(() => this._profile()?.riskAssessment ?? null);
  readonly riskFactors = computed(() => this._profile()?.riskFactors ?? []);
  readonly assignedDoctor = computed(() => this._profile()?.assignedDoctor ?? null);
  readonly smokingHistory = computed(() => this._profile()?.smokingHistory ?? null);
  readonly symptoms = computed(() => this._profile()?.symptoms ?? []);
  readonly lastDiagnosticTest = computed(() => this._profile()?.lastDiagnosticTest ?? null);

  // Risk level helpers
  readonly riskLevel = computed(() => this._profile()?.riskAssessment?.riskLevel ?? null);
  readonly riskScore = computed(() => this._profile()?.riskAssessment?.riskScore ?? 0);

  readonly hasAssignedDoctor = computed(() => this._profile()?.assignedDoctor !== null);
  readonly hasRiskAssessment = computed(() => this._profile()?.riskAssessment !== null);

  /**
   * Load clinical profile for the current user (patient) or specific patient
   */
  async loadProfile(patientId?: number): Promise<ClinicalProfile | null> {
    this._loading.set(true);
    this._error.set(null);

    try {
      const url = patientId ? `${this.apiUrl}/${patientId}` : this.apiUrl;
      const response = await firstValueFrom(
        this.http.get<ApiResponse<ClinicalProfile>>(url)
      );

      if (response.success && response.data) {
        this._profile.set(response.data);
        return response.data;
      } else {
        throw new Error(response.error || 'Error al cargar perfil');
      }
    } catch (err: any) {
      console.error('Error loading clinical profile:', err);
      
      // Handle specific error cases
      let errorMessage = 'Error al cargar perfil clínico';
      
      if (err.status === 401) {
        errorMessage = 'Sesión expirada. Por favor, inicie sesión nuevamente.';
      } else if (err.status === 403) {
        errorMessage = 'No tiene permiso para ver este perfil.';
      } else if (err.status === 404) {
        errorMessage = 'Perfil no encontrado.';
      } else if (err.error?.error) {
        errorMessage = err.error.error;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      this._error.set(errorMessage);
      return null;
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Load risk history for charts
   */
  async loadRiskHistory(patientId: number): Promise<RiskHistoryEntry[]> {
    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponse<RiskHistoryEntry[]>>(`${this.apiUrl}/risk-history/${patientId}`)
      );

      if (response.success && response.data) {
        this._riskHistory.set(response.data);
        return response.data;
      }
      return [];
    } catch (err) {
      console.error('Error loading risk history:', err);
      return [];
    }
  }

  /**
   * Generate new ML prediction for a patient
   * Calls the ML Service through the backend
   */
  async generatePrediction(patientId: number): Promise<RiskAssessment | null> {
    try {
      this._loading.set(true);
      this._error.set(null);

      const mlApiUrl = `${environment.apiUrl || '/api'}/ml/predict/${patientId}`;
      const response = await firstValueFrom(
        this.http.post<ApiResponse<any>>(mlApiUrl, {})
      );

      if (response.success && response.data) {
        // Transform ML response to RiskAssessment format
        const prediction: RiskAssessment = {
          predictionId: response.data.predictionId,
          riskScore: response.data.riskScore,
          riskLevel: response.data.riskLevel,
          confidence: response.data.confidence / 100, // Convert back to 0-1
          predictionDate: response.data.predictionDate,
          modelVersion: response.data.modelVersion,
          assessmentType: 'ML_GENERATED'
        };

        // Update the profile with new prediction
        const currentProfile = this._profile();
        if (currentProfile) {
          this._profile.set({
            ...currentProfile,
            riskAssessment: prediction
          });
        }

        return prediction;
      }
      
      throw new Error(response.error || 'Error al generar predicción');
    } catch (err: any) {
      console.error('Error generating ML prediction:', err);
      
      let errorMessage = 'Error al generar predicción de riesgo';
      
      if (err.status === 503) {
        errorMessage = 'Servicio ML no disponible. Por favor intente más tarde.';
      } else if (err.error?.error) {
        errorMessage = err.error.error;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      this._error.set(errorMessage);
      return null;
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Check ML Service availability
   */
  async checkMLServiceHealth(): Promise<{ available: boolean; status: string }> {
    try {
      const mlApiUrl = `${environment.apiUrl || '/api'}/ml/health`;
      const response = await firstValueFrom(
        this.http.get<ApiResponse<any>>(mlApiUrl)
      );

      if (response.success && response.data) {
        return {
          available: response.data.mlService === 'healthy',
          status: response.data.mlService
        };
      }
      return { available: false, status: 'unknown' };
    } catch {
      return { available: false, status: 'unreachable' };
    }
  }

  /**
   * Get risk level color for styling
   */
  getRiskLevelColor(level: string | null): string {
    switch (level) {
      case 'LOW': return '#4CAF50';      // Green
      case 'MODERATE': return '#FFC107'; // Yellow/Amber
      case 'HIGH': return '#FF9800';     // Orange
      case 'CRITICAL': return '#F44336'; // Red
      default: return '#9E9E9E';         // Gray
    }
  }

  /**
   * Get risk level label in Spanish
   */
  getRiskLevelLabel(level: string | null): string {
    switch (level) {
      case 'LOW': return 'Bajo';
      case 'MODERATE': return 'Moderado';
      case 'HIGH': return 'Alto';
      case 'CRITICAL': return 'Crítico';
      default: return 'Sin evaluar';
    }
  }

  /**
   * Get risk level badge class
   */
  getRiskLevelClass(level: string | null): string {
    switch (level) {
      case 'LOW': return 'risk-low';
      case 'MODERATE': return 'risk-moderate';
      case 'HIGH': return 'risk-high';
      case 'CRITICAL': return 'risk-critical';
      default: return 'risk-unknown';
    }
  }

  /**
   * Format gender for display
   */
  formatGender(gender: string | null): string {
    switch (gender) {
      case 'MALE': return 'Masculino';
      case 'FEMALE': return 'Femenino';
      case 'OTHER': return 'Otro';
      default: return 'No especificado';
    }
  }

  /**
   * Get severity color for risk factors
   */
  getSeverityColor(severity: string): string {
    switch (severity) {
      case 'LOW': return '#4CAF50';
      case 'MODERATE': return '#FFC107';
      case 'HIGH': return '#F44336';
      default: return '#9E9E9E';
    }
  }

  /**
   * Reset state
   */
  reset(): void {
    this._profile.set(null);
    this._riskHistory.set([]);
    this._loading.set(false);
    this._error.set(null);
  }
}
