import { Component, OnInit, inject, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { ProfileService } from '../../services/profile.service';
import { UserProfile } from './profile-dashboard.interface';
import { UserProfile as ServiceUserProfile } from '../../interfaces/profile.interface';
import { Observable, map } from 'rxjs';

@Component({
  selector: 'app-profile-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, IonicModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './profile-dashboard.component.html',
  styleUrls: [
    '../../../auth/auth.styles.scss',
    '../../../theme/shared-layout.scss',
    './profile-dashboard.component.scss'
  ]
})
export class ProfileDashboardComponent implements OnInit {
  private profileService = inject(ProfileService);
  profile$!: Observable<UserProfile>;

  ngOnInit() {
    // For now, we'll use a mock user ID
    // In a real app, this would come from the auth service
    this.profile$ = this.profileService.getProfileByUserId(1).pipe(
      map((serviceProfile: ServiceUserProfile) => this.transformToComponentProfile(serviceProfile))
    );
  }

  private transformToComponentProfile(serviceProfile: ServiceUserProfile): UserProfile {
    return {
      id: serviceProfile.id || 0,
      user_id: serviceProfile.user_id,
      first_name: serviceProfile.first_name,
      last_name: serviceProfile.last_name,
      birth_date: serviceProfile.birth_date,
      gender: serviceProfile.gender,
      phone: serviceProfile.phone,
      emergency_contact_name: serviceProfile.emergency_contact_name,
      emergency_contact_phone: serviceProfile.emergency_contact_phone,
      medical_history: serviceProfile.medical_history,
      allergies: serviceProfile.allergies,
      current_medications: serviceProfile.current_medications,
      lifestyle_factors: serviceProfile.lifestyle_factors,
      occupation: serviceProfile.occupation,
      preferred_language: serviceProfile.preferred_language,
      preferred_communication_method: serviceProfile.preferred_communication_method,
      consent_terms: serviceProfile.consent_terms,
      consent_data_sharing: serviceProfile.consent_data_sharing,
      consent_marketing: serviceProfile.consent_marketing,
      created_at: serviceProfile.created_at || '',
      updated_at: serviceProfile.updated_at || ''
    };
  }

  calculateAge(birthDate: string): number {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  }

  getGenderLabel(gender: string): string {
    const labels = {
      'MALE': 'Masculino',
      'FEMALE': 'Femenino',
      'OTHER': 'Otro'
    };
    return labels[gender as keyof typeof labels] || gender;
  }

  getGenderColor(gender: string): string {
    const colors = {
      'MALE': 'primary',
      'FEMALE': 'secondary',
      'OTHER': 'tertiary'
    };
    return colors[gender as keyof typeof colors] || 'medium';
  }

  getSmokingLabel(status: string): string {
    const labels = {
      'NEVER': 'Nunca fumó',
      'FORMER': 'Ex fumador',
      'CURRENT': 'Fumador actual'
    };
    return labels[status as keyof typeof labels] || status;
  }

  getSmokingColor(status: string): string {
    const colors = {
      'NEVER': 'success',
      'FORMER': 'warning',
      'CURRENT': 'danger'
    };
    return colors[status as keyof typeof colors] || 'medium';
  }

  getExerciseLabel(frequency: string): string {
    const labels = {
      'NONE': 'Sin ejercicio',
      'RARELY': 'Rara vez',
      'WEEKLY': 'Semanal',
      'REGULARLY': 'Regular',
      'DAILY': 'Diario'
    };
    return labels[frequency as keyof typeof labels] || frequency;
  }
}