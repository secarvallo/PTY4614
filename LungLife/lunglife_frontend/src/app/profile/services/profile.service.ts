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

@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api/profiles`;

  // ========== OPERACIONES DE PERFIL ==========
  
  getAllProfiles(): Observable<UserProfile[]> {
    return this.http.get<UserProfile[]>(this.apiUrl);
  }

  getProfileById(id: number): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.apiUrl}/${id}`);
  }

  getProfileByUserId(userId: number): Observable<UserProfile> {
    const params = new HttpParams().set('user_id', userId.toString());
    return this.http.get<UserProfile>(`${this.apiUrl}/user`, { params });
  }

  createProfile(profileData: CreateProfileRequest): Observable<UserProfile> {
    return this.http.post<UserProfile>(this.apiUrl, profileData);
  }

  updateProfile(id: number, profileData: UpdateProfileRequest): Observable<UserProfile> {
    return this.http.put<UserProfile>(`${this.apiUrl}/${id}`, profileData);
  }

  deleteProfile(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  // ========== EVALUACIONES DE RIESGO ==========

  getRiskAssessments(userId: number): Observable<RiskAssessment[]> {
    const url = `${this.apiUrl}/risk-assessments`;
    const params = new HttpParams().set('user_id', userId.toString());
    return this.http.get<RiskAssessment[]>(url, { params });
  }

  createRiskAssessment(assessment: Partial<RiskAssessment>): Observable<RiskAssessment> {
    const url = `${this.apiUrl}/risk-assessments`;
    return this.http.post<RiskAssessment>(url, assessment);
  }

  // ========== MÉTRICAS DE SALUD ==========

  getHealthMetrics(userId: number): Observable<HealthMetric[]> {
    const url = `${this.apiUrl}/health-metrics`;
    const params = new HttpParams().set('user_id', userId.toString());
    return this.http.get<HealthMetric[]>(url, { params });
  }

  createHealthMetric(metric: Partial<HealthMetric>): Observable<HealthMetric> {
    const url = `${this.apiUrl}/health-metrics`;
    return this.http.post<HealthMetric>(url, metric);
  }
}