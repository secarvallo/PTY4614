import { Component, OnInit, inject, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { ProfileService } from '../../services/profile.service';
import { UserProfile } from '../../interfaces/profile.interface';
import { Observable } from 'rxjs';

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
    this.profile$ = this.profileService.getProfileByUserId(1);
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