/**
 *  Profile Service - LungLife
 * Servicio simplificado para gestión de perfiles de usuario
 */

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { 
  UserProfile, 
  RiskAssessment, 
  HealthMetric, 
  CreateProfileRequest, 
  UpdateProfileRequest 
} from '../interfaces/profile.interface';
import { environment } from '../../../environments/environment';

// Interface para respuesta del backend con perfil según rol
export interface UserProfileResponse {
  success: boolean;
  data: {
    user: {
      id: number;
      email: string;
      emailVerified: boolean;
      isActive: boolean;
      roleId: number;
      role: string;
      createdAt: string;
      updatedAt: string;
    };
    profile: PatientProfile | DoctorProfile | AdminProfile | null;
  };
}

export interface PatientProfile {
  type: 'PATIENT';
  patientId: number;
  firstName: string;
  lastName: string;
  fullName: string;
  dateOfBirth: string;
  gender: string;
  heightCm: number;
  weightKg: number;
  phone: string;
  country: string;
  city: string;
  areaResidence: string;
  occupation: string;
  emergencyContact: {
    name: string;
    phone: string;
  };
  registrationDate: string;
  smokingHistory: {
    status: string;
    cigarettesPerDay: number;
    startDate: string;
    quitDate: string;
  } | null;
  assignedDoctor: {
    doctorId: number;
    fullName: string;
    specialty: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface DoctorProfile {
  type: 'DOCTOR';
  doctorId: number;
  firstName: string;
  lastName: string;
  fullName: string;
  dateOfBirth: string;
  gender: string;
  specialty: string;
  medicalLicense: string;
  hospitalInstitution: string;
  phone: string;
  emailInstitutional: string;
  patientCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminProfile {
  type: 'ADMINISTRATOR';
  systemStats: {
    totalUsers: number;
    totalPatients: number;
    totalDoctors: number;
    activeAssignments: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  private http = inject(HttpClient);
  // CORREGIDO: apiUrl ya incluye /api, no duplicar
  private profileApiUrl = `${environment.apiUrl}/profile`;
  private legacyApiUrl = `${environment.apiUrl}/profiles`;

  // ========== NUEVO ENDPOINT PARA PERFIL ACTUAL ==========
  
  /**
   * Obtiene el perfil del usuario autenticado según su rol
   * @returns Observable con datos del usuario y perfil específico del rol
   */
  getMyProfile(): Observable<UserProfileResponse> {
    return this.http.get<UserProfileResponse>(`${this.profileApiUrl}/me`);
  }

  /**
   * Actualiza el perfil del usuario autenticado
   * @param profileData Datos a actualizar
   */
  updateMyProfile(profileData: Partial<PatientProfile | DoctorProfile>): Observable<UserProfileResponse> {
    return this.http.put<UserProfileResponse>(`${this.profileApiUrl}/me`, profileData);
  }

  // ========== OPERACIONES DE PERFIL LEGACY ==========
  
  getAllProfiles(): Observable<UserProfile[]> {
    return this.http.get<UserProfile[]>(this.legacyApiUrl);
  }

  getProfileById(id: number): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.legacyApiUrl}/${id}`);
  }

  // Alias para compatibilidad
  getProfile(id: number): Observable<UserProfile> {
    return this.getProfileById(id);
  }

  getProfileByUserId(userId: number): Observable<UserProfile> {
    const params = new HttpParams().set('user_id', userId.toString());
    return this.http.get<UserProfile>(`${this.legacyApiUrl}/user`, { params });
  }

  createProfile(profileData: CreateProfileRequest): Observable<UserProfile> {
    return this.http.post<UserProfile>(this.legacyApiUrl, profileData);
  }

  updateProfile(id: number, profileData: UpdateProfileRequest): Observable<UserProfile> {
    return this.http.put<UserProfile>(`${this.legacyApiUrl}/${id}`, profileData);
  }

  deleteProfile(id: number): Observable<void> {
    return this.http.delete<void>(`${this.legacyApiUrl}/${id}`);
  }

  // ========== EVALUACIONES DE RIESGO ==========

  getRiskAssessments(userId: number): Observable<RiskAssessment[]> {
    const url = `${this.legacyApiUrl}/risk-assessments`;
    const params = new HttpParams().set('user_id', userId.toString());
    return this.http.get<RiskAssessment[]>(url, { params });
  }

  createRiskAssessment(assessment: Partial<RiskAssessment>): Observable<RiskAssessment> {
    const url = `${this.legacyApiUrl}/risk-assessments`;
    return this.http.post<RiskAssessment>(url, assessment);
  }

  // ========== MÉTRICAS DE SALUD ==========

  getHealthMetrics(userId: number): Observable<HealthMetric[]> {
    const url = `${this.legacyApiUrl}/health-metrics`;
    const params = new HttpParams().set('user_id', userId.toString());
    return this.http.get<HealthMetric[]>(url, { params });
  }

  createHealthMetric(metric: Partial<HealthMetric>): Observable<HealthMetric> {
    const url = `${this.legacyApiUrl}/health-metrics`;
    return this.http.post<HealthMetric>(url, metric);
  }
}