import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface PatientData {
  age: number;
  bmi: number;
  smoking: number;
  alcohol_consumption: number;
  physical_activity: number;
  family_history: number;
  previous_cancer_history: number;
  fatigue: number;
  weight_loss: number;
  shortness_of_breath: number;
}

export interface PredictionResult {
  prediction: number;
  risk_probability: {
    low_risk: number;
    high_risk: number;
  };
  risk_factors: string[];
  recommendation: string;
}

@Injectable({
  providedIn: 'root'
})
export class CancerPredictionService {
  private apiUrl = 'http://localhost:5000';

  constructor(private http: HttpClient) {}

  trainModel(): Observable<any> {
    return this.http.post(`${this.apiUrl}/train-model`, {});
  }

  predictCancer(patientData: PatientData): Observable<PredictionResult> {
    return this.http.post<PredictionResult>(`${this.apiUrl}/predict`, patientData);
  }

  getBusinessUnderstanding(): Observable<any> {
    return this.http.get(`${this.apiUrl}/business-understanding`);
  }
}