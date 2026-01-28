import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, firstValueFrom, map } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface LifestyleData {
  alcoholConsumption?: string;
  alcoholUnitsPerWeek?: number;
  exerciseFrequency?: string;
  exerciseMinutesWeekly?: number;
  dietType?: string;
  sleepHours?: number;
  stressLevel?: string;
}

export interface SmokingData {
  smokingStatus: string;
  packYears?: number;
  cigarettesPerDay?: number;
  startDate?: string;
  quitDate?: string;
}

export interface LifestyleSmokingResponse {
  lifestyle: LifestyleData | null;
  smoking: SmokingData | null;
}

export interface SaveLifestyleRequest {
  lifestyle?: LifestyleData;
  smoking?: SmokingData;
}

@Injectable({
  providedIn: 'root'
})
export class LifestyleService {
  private apiUrl = environment.apiUrl || '/api';

  constructor(private http: HttpClient) { }

  /**
   * Get lifestyle and smoking data for a patient
   */
  getLifestyleData(patientUserId: number): Observable<LifestyleSmokingResponse> {
    return this.http.get<{ success: boolean; data: LifestyleSmokingResponse }>(
      `${this.apiUrl}/patients/${patientUserId}/lifestyle`
    ).pipe(map(response => response.data));
  }

  /**
   * Save lifestyle and smoking data for a patient
   */
  saveLifestyleData(patientUserId: number, data: SaveLifestyleRequest): Promise<void> {
    return firstValueFrom(
      this.http.post<{ success: boolean }>(
        `${this.apiUrl}/patients/${patientUserId}/lifestyle`,
        data
      ).pipe(map(() => undefined))
    );
  }

  /**
   * Helper to convert form values to API format
   */
  formatForApi(formValues: any): SaveLifestyleRequest {
    return {
      lifestyle: {
        alcoholConsumption: formValues.alcohol_consumption,
        exerciseFrequency: formValues.exercise_frequency,
        sleepHours: formValues.sleep_hours
      },
      smoking: {
        smokingStatus: formValues.smoking_status,
        packYears: formValues.smoking_pack_years || 0
      }
    };
  }

  /**
   * Helper to convert API response to form values
   */
  formatForForm(data: LifestyleSmokingResponse | null): any {
    // Handle null data gracefully
    if (!data) {
      return {
        smoking_status: 'NEVER',
        smoking_pack_years: 0,
        alcohol_consumption: 'NONE',
        exercise_frequency: 'RARELY',
        sleep_hours: 8
      };
    }

    // Map database values back to frontend values
    const alcoholMapping: { [key: string]: string } = {
      'NONE': 'NONE',
      'SOCIAL': 'OCCASIONAL',
      'REGULAR': 'MODERATE',
      'HEAVY': 'DAILY'
    };

    const exerciseMapping: { [key: string]: string } = {
      'SEDENTARY': 'RARELY',
      'LIGHT': 'WEEKLY',
      'MODERATE': 'FREQUENT',
      'INTENSE': 'DAILY'
    };

    const smokingMapping: { [key: string]: string } = {
      'NEVER': 'NEVER',
      'FORMER_SMOKER': 'FORMER',
      'CURRENT_SMOKER': 'CURRENT'
    };

    return {
      smoking_status: data.smoking ? smokingMapping[data.smoking.smokingStatus] || 'NEVER' : 'NEVER',
      smoking_pack_years: data.smoking?.packYears || 0,
      alcohol_consumption: data.lifestyle ? alcoholMapping[data.lifestyle.alcoholConsumption || 'NONE'] || 'NONE' : 'NONE',
      exercise_frequency: data.lifestyle ? exerciseMapping[data.lifestyle.exerciseFrequency || 'SEDENTARY'] || 'RARELY' : 'RARELY',
      sleep_hours: data.lifestyle?.sleepHours || 8
    };
  }
}
