import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { personOutline, fitnessOutline, chevronForwardOutline } from 'ionicons/icons';

export type UserRole = 'PATIENT' | 'DOCTOR';

interface RoleOption {
  id: UserRole;
  title: string;
  description: string;
  icon: string;
}

@Component({
  selector: 'app-role-selection',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterLink],
  templateUrl: './role-selection.page.html',
  styleUrls: [
    '../../../auth.styles.scss',
    './role-selection.page.scss'
  ]
})
export class RoleSelectionPage {
  
  selectedRole = signal<UserRole | null>(null);
  
  roles: RoleOption[] = [
    {
      id: 'PATIENT',
      title: 'Soy Paciente',
      description: 'Quiero realizar un seguimiento de mi salud pulmonar.',
      icon: 'person-outline'
    },
    {
      id: 'DOCTOR',
      title: 'Soy Médico',
      description: 'Quiero gestionar y monitorear a mis pacientes.',
      icon: 'fitness-outline'
    }
  ];

  constructor(private router: Router) {
    // Register icons for role selection
    addIcons({ personOutline, fitnessOutline, chevronForwardOutline });
  }

  selectRole(role: UserRole): void {
    this.selectedRole.set(role);
  }

  isSelected(role: UserRole): boolean {
    return this.selectedRole() === role;
  }

  continueToRegister(): void {
    const role = this.selectedRole();
    if (role) {
      // Navigate to register with role as query parameter
      this.router.navigate(['/auth/register'], { 
        queryParams: { role: role }
      });
    }
  }

  canContinue(): boolean {
    return this.selectedRole() !== null;
  }
}
