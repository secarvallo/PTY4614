/**
 * Directory Service
 * Unified RBAC-based service for multi-role directory access
 */

import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { 
  DirectoryMode, 
  RoleId, 
  ROLE_IDS,
  getDirectoryConfig,
  getDirectoryTabs,
  getDefaultMode,
  isPatient,
  isDoctor,
  isAdmin
} from '../../core/rbac';

// ===== Interfaces =====
export interface DirectoryEntry {
  id: number;
  entityType: 'doctor' | 'patient' | 'unknown';
  userId: number;
  name: string;
  lastName: string;
  fullName: string;
  email?: string;
  isActive?: boolean;
  
  // Doctor-specific fields
  doctorId?: number;
  specialty?: string;
  institution?: string;
  patientCount?: number;
  
  // Patient-specific fields
  patientId?: number;
  gender?: string;
  dateOfBirth?: string;
  assignmentDate?: string;
  assignedDoctor?: {
    doctorId: number;
    fullName: string;
  };
  
  // Admin view fields
  roleId?: number;
  roleName?: string;
  createdAt?: string;
}

export interface DirectoryResponse {
  success: boolean;
  mode: DirectoryMode;
  data: DirectoryEntry[];
  total: number;
  message?: string;
}

export interface CurrentAssignmentResponse {
  success: boolean;
  data: {
    type: 'doctor' | 'summary';
    doctorId?: number;
    fullName?: string;
    specialty?: string;
    institution?: string;
    assignmentDate?: string;
    patientCount?: number;
  } | null;
  message?: string;
}

export interface AssignResponse {
  success: boolean;
  message: string;
  data?: {
    doctorId: number;
    fullName: string;
    specialty?: string;
    institution?: string;
  };
}

export interface DirectoryFilters {
  search?: string;
  specialty?: string;
  institution?: string;
  status?: 'active' | 'inactive';
}

export interface DirectoryStatistics {
  active_patients: number;
  active_doctors: number;
  inactive_users: number;
  active_assignments: number;
  unassigned_patients: number;
}

// ===== Service =====
@Injectable({
  providedIn: 'root'
})
export class DirectoryService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl || '/api'}/directory`;
  
  // State signals
  private _entries = signal<DirectoryEntry[]>([]);
  private _currentMode = signal<DirectoryMode>('doctors');
  private _currentAssignment = signal<CurrentAssignmentResponse['data']>(null);
  private _loading = signal<boolean>(false);
  private _error = signal<string | null>(null);
  private _statistics = signal<DirectoryStatistics | null>(null);
  private _specialties = signal<string[]>([]);
  private _institutions = signal<string[]>([]);
  
  // Public readonly signals
  readonly entries = this._entries.asReadonly();
  readonly currentMode = this._currentMode.asReadonly();
  readonly currentAssignment = this._currentAssignment.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly statistics = this._statistics.asReadonly();
  readonly specialties = this._specialties.asReadonly();
  readonly institutions = this._institutions.asReadonly();
  
  // Computed signals
  readonly entryCount = computed(() => this._entries().length);
  readonly hasCurrentAssignment = computed(() => this._currentAssignment() !== null);
  
  readonly doctors = computed(() => 
    this._entries().filter(e => e.entityType === 'doctor')
  );
  
  readonly patients = computed(() => 
    this._entries().filter(e => e.entityType === 'patient')
  );

  /**
   * Load directory entries based on role and mode
   */
  async loadDirectory(mode: DirectoryMode, filters?: DirectoryFilters): Promise<DirectoryEntry[]> {
    this._loading.set(true);
    this._error.set(null);
    
    try {
      let params = new HttpParams().set('mode', mode);
      
      if (filters?.search) {
        params = params.set('search', filters.search);
      }
      if (filters?.specialty) {
        params = params.set('specialty', filters.specialty);
      }
      if (filters?.institution) {
        params = params.set('institution', filters.institution);
      }
      if (filters?.status) {
        params = params.set('status', filters.status);
      }
      
      const response = await firstValueFrom(
        this.http.get<DirectoryResponse>(this.apiUrl, { params })
      );
      
      if (response.success) {
        this._entries.set(response.data);
        this._currentMode.set(response.mode);
        return response.data;
      } else {
        throw new Error('Failed to load directory');
      }
    } catch (error: any) {
      const message = error?.error?.error || error?.message || 'Error al cargar directorio';
      this._error.set(message);
      this._entries.set([]);
      return [];
    } finally {
      this._loading.set(false);
    }
  }
  
  /**
   * Load current assignment for the user
   */
  async loadCurrentAssignment(): Promise<CurrentAssignmentResponse['data']> {
    try {
      const response = await firstValueFrom(
        this.http.get<CurrentAssignmentResponse>(`${this.apiUrl}/current-assignment`)
      );
      
      if (response.success) {
        this._currentAssignment.set(response.data);
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Error loading current assignment:', error);
      this._currentAssignment.set(null);
      return null;
    }
  }
  
  /**
   * Assign doctor to patient
   */
  async assignDoctor(doctorId: number, patientId?: number): Promise<{ success: boolean; message: string }> {
    this._loading.set(true);
    this._error.set(null);
    
    try {
      const body: { doctorId: number; patientId?: number } = { doctorId };
      if (patientId) {
        body.patientId = patientId;
      }
      
      const response = await firstValueFrom(
        this.http.post<AssignResponse>(`${this.apiUrl}/assign`, body)
      );
      
      if (response.success) {
        // Refresh current assignment
        await this.loadCurrentAssignment();
        return {
          success: true,
          message: response.message
        };
      } else {
        throw new Error('Assignment failed');
      }
    } catch (error: any) {
      const message = error?.error?.error || error?.message || 'Error al asignar médico';
      this._error.set(message);
      return {
        success: false,
        message
      };
    } finally {
      this._loading.set(false);
    }
  }
  
  /**
   * Toggle user status (Admin only)
   */
  async toggleUserStatus(userId: number, isActive: boolean): Promise<{ success: boolean; message: string }> {
    try {
      const response = await firstValueFrom(
        this.http.put<{ success: boolean; message: string }>(
          `${this.apiUrl}/toggle-status/${userId}`,
          { isActive }
        )
      );
      
      if (response.success) {
        // Update local entry
        this._entries.update(entries => 
          entries.map(e => e.userId === userId ? { ...e, isActive } : e)
        );
      }
      
      return response;
    } catch (error: any) {
      return {
        success: false,
        message: error?.error?.error || 'Error al cambiar estado'
      };
    }
  }
  
  /**
   * Load statistics (Admin only)
   */
  async loadStatistics(): Promise<DirectoryStatistics | null> {
    try {
      const response = await firstValueFrom(
        this.http.get<{ success: boolean; data: DirectoryStatistics }>(`${this.apiUrl}/statistics`)
      );
      
      if (response.success) {
        this._statistics.set(response.data);
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Error loading statistics:', error);
      return null;
    }
  }
  
  /**
   * Load specialties for filtering (uses existing doctors endpoint)
   */
  async loadSpecialties(): Promise<string[]> {
    try {
      const response = await firstValueFrom(
        this.http.get<{ success: boolean; data: string[] }>(
          `${environment.apiUrl || '/api'}/doctors/specialties`
        )
      );
      
      if (response.success) {
        this._specialties.set(response.data);
        return response.data;
      }
      return [];
    } catch (error) {
      console.error('Error loading specialties:', error);
      return [];
    }
  }
  
  /**
   * Load institutions for filtering (uses existing doctors endpoint)
   */
  async loadInstitutions(): Promise<string[]> {
    try {
      const response = await firstValueFrom(
        this.http.get<{ success: boolean; data: string[] }>(
          `${environment.apiUrl || '/api'}/doctors/institutions`
        )
      );
      
      if (response.success) {
        this._institutions.set(response.data);
        return response.data;
      }
      return [];
    } catch (error) {
      console.error('Error loading institutions:', error);
      return [];
    }
  }
  
  /**
   * Initialize directory based on user role
   */
  async initializeDirectory(roleId: RoleId): Promise<void> {
    const defaultMode = getDefaultMode(roleId);
    
    await Promise.all([
      this.loadDirectory(defaultMode),
      this.loadCurrentAssignment(),
      this.loadSpecialties(),
      this.loadInstitutions(),
      isAdmin(roleId) ? this.loadStatistics() : Promise.resolve()
    ]);
  }
  
  /**
   * Change directory mode
   */
  async changeMode(mode: DirectoryMode, filters?: DirectoryFilters): Promise<void> {
    await this.loadDirectory(mode, filters);
  }
  
  /**
   * Refresh current mode
   */
  async refresh(filters?: DirectoryFilters): Promise<void> {
    await this.loadDirectory(this._currentMode(), filters);
  }
  
  /**
   * Reset state
   */
  reset(): void {
    this._entries.set([]);
    this._currentMode.set('doctors');
    this._currentAssignment.set(null);
    this._loading.set(false);
    this._error.set(null);
    this._statistics.set(null);
    this._specialties.set([]);
    this._institutions.set([]);
  }
  
  /**
   * Check if an entry is the current assigned doctor (for patients)
   */
  isCurrentDoctor(entry: DirectoryEntry): boolean {
    const assignment = this._currentAssignment();
    if (!assignment || assignment.type !== 'doctor') return false;
    return entry.doctorId === assignment.doctorId;
  }
}
