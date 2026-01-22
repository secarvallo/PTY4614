import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface MedicalHistoryEntry {
  id?: number;
  entryType: 'CONDITION' | 'ALLERGY' | 'MEDICATION';
  entryName: string;
  details?: string;
  status?: 'ACTIVE' | 'RESOLVED' | 'INACTIVE';
  startDate?: string;
  endDate?: string;
  createdAt?: string;
}

export interface MedicalHistoryData {
  medicalHistory: MedicalHistoryEntry[];
  allergies: MedicalHistoryEntry[];
  currentMedications: MedicalHistoryEntry[];
}

export interface MedicalHistoryBatchRequest {
  medicalHistory: { condition?: string; entryName?: string }[];
  allergies: { allergen?: string; entryName?: string }[];
  currentMedications: { name?: string; entryName?: string }[];
}

@Injectable({
  providedIn: 'root'
})
export class MedicalHistoryService {
  private apiUrl = environment.apiUrl || '/api';

  constructor(private http: HttpClient) {}

  /**
   * Get all medical history for a patient
   */
  getMedicalHistory(patientUserId: number): Observable<MedicalHistoryData> {
    return this.http.get<{ success: boolean; data: MedicalHistoryData }>(
      `${this.apiUrl}/patients/${patientUserId}/medical-history`
    ).pipe(map(response => response.data));
  }

  /**
   * Add a single medical history entry
   */
  addEntry(patientUserId: number, entry: Partial<MedicalHistoryEntry>): Promise<{ id: number }> {
    return firstValueFrom(
      this.http.post<{ success: boolean; data: { id: number } }>(
        `${this.apiUrl}/patients/${patientUserId}/medical-history`,
        entry
      ).pipe(map(response => response.data))
    );
  }

  /**
   * Update a medical history entry
   */
  updateEntry(entryId: number, entry: Partial<MedicalHistoryEntry>): Promise<void> {
    return firstValueFrom(
      this.http.put<{ success: boolean }>(
        `${this.apiUrl}/medical-history/${entryId}`,
        entry
      ).pipe(map(() => undefined))
    );
  }

  /**
   * Delete a medical history entry
   */
  deleteEntry(entryId: number): Promise<void> {
    return firstValueFrom(
      this.http.delete<{ success: boolean }>(
        `${this.apiUrl}/medical-history/${entryId}`
      ).pipe(map(() => undefined))
    );
  }

  /**
   * Batch save all medical history (replaces existing)
   * Used by the profile form to save all entries at once
   */
  saveBatch(patientUserId: number, data: MedicalHistoryBatchRequest): Promise<void> {
    return firstValueFrom(
      this.http.post<{ success: boolean }>(
        `${this.apiUrl}/patients/${patientUserId}/medical-history/batch`,
        data
      ).pipe(map(() => undefined))
    );
  }

  /**
   * Add a condition to patient's medical history
   */
  addCondition(patientUserId: number, condition: string, details?: string): Promise<{ id: number }> {
    return this.addEntry(patientUserId, {
      entryType: 'CONDITION',
      entryName: condition,
      details,
      status: 'ACTIVE'
    });
  }

  /**
   * Add an allergy to patient's medical history
   */
  addAllergy(patientUserId: number, allergen: string, details?: string): Promise<{ id: number }> {
    return this.addEntry(patientUserId, {
      entryType: 'ALLERGY',
      entryName: allergen,
      details,
      status: 'ACTIVE'
    });
  }

  /**
   * Add a medication to patient's medical history
   */
  addMedication(patientUserId: number, medication: string, details?: string): Promise<{ id: number }> {
    return this.addEntry(patientUserId, {
      entryType: 'MEDICATION',
      entryName: medication,
      details,
      status: 'ACTIVE'
    });
  }
}
