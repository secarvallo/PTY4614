import { Component, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
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
export class RoleSelectionPage implements OnInit {
  
  private route = inject(ActivatedRoute);
  
  selectedRole = signal<UserRole | null>(null);
  
  // Email del usuario que viene del registro
  private userEmail: string | null = null;
  
  // Indica si venimos del flujo de registro
  isPostRegistration = signal(false);
  
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

  ngOnInit(): void {
    // Verificar si venimos del registro (tiene email en queryParams)
    this.userEmail = this.route.snapshot.queryParams['email'] || null;
    this.isPostRegistration.set(!!this.userEmail);
  }

  selectRole(role: UserRole): void {
    this.selectedRole.set(role);
  }

  isSelected(role: UserRole): boolean {
    return this.selectedRole() === role;
  }

  /**
   * Continúa al siguiente paso según el flujo:
   * - Si viene del registro (tiene email): va a login
   * - Si es flujo normal: va a register con el rol
   */
  continueToNextStep(): void {
    const role = this.selectedRole();
    if (!role) return;

    if (this.isPostRegistration()) {
      // Flujo post-registro: ir a login con el email
      this.router.navigate(['/auth/login'], { 
        queryParams: { email: this.userEmail }
      });
    } else {
      // Flujo normal: ir a register con el rol
      this.router.navigate(['/auth/register'], { 
        queryParams: { role: role }
      });
    }
  }

  canContinue(): boolean {
    return this.selectedRole() !== null;
  }
}
