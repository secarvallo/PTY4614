/**
 * Dashboard Page - User Dashboard
 * Displays user metrics and progress tracking
 */
import { Component, OnInit, inject, computed, signal } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { addIcons } from 'ionicons';
import {
  leafOutline,
  cashOutline,
  medicalOutline,
  fitnessOutline,
  addCircleOutline,
  barChartOutline,
  personOutline,
  medkitOutline,
  peopleOutline,
  pulseOutline,
  chevronForwardOutline,
  logOutOutline,
  alertCircleOutline,
  settingsOutline
} from 'ionicons/icons';
import { AuthFacadeService } from '../auth/core/services';
import { User } from '../auth/core/interfaces/auth.unified';
import { LogoutButtonComponent } from '../shared/components/logout-button/logout-button.component';
import { ProfileService, PatientProfile, DoctorProfile, AdminProfile } from '../profile/services/profile.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: [
    './dashboard.page.scss',
    '../theme/shared-layout.scss'
  ],
  standalone: true,
  imports: [IonicModule, CommonModule, RouterModule, LogoutButtonComponent],
})
export class DashboardPage implements OnInit {
  private authFacade = inject(AuthFacadeService);
  private profileService = inject(ProfileService);

  user: User | null = null;
  userProfile: PatientProfile | DoctorProfile | AdminProfile | null = null;
  userFullName = signal<string>('');

  // Role-based visibility
  isPatient = signal<boolean>(false);
  isDoctor = signal<boolean>(false);
  isAdmin = signal<boolean>(false);
  hasKnownRole = signal<boolean>(false); // True si tiene rol conocido (PATIENT, DOCTOR, ADMIN)

  // Example data properties
  smokeFreeDays = 128;
  moneySaved = 450;
  cigarettesAvoided = 2560;
  lungHealthPercentage = 85;

  constructor() {
    addIcons({
      leafOutline,
      cashOutline,
      medicalOutline,
      fitnessOutline,
      addCircleOutline,
      barChartOutline,
      personOutline,
      medkitOutline,
      peopleOutline,
      pulseOutline,
      chevronForwardOutline,
      logOutOutline,
      alertCircleOutline,
      settingsOutline
    });
  }

  ngOnInit() {
    console.log('[Dashboard] ngOnInit iniciado');
    
    this.authFacade.user$.subscribe(user => {
      console.log('[Dashboard] User recibido:', user);
      this.user = user;
      
      // Set role-based flags (roleId: 1=PATIENT, 2=DOCTOR, 3=ADMIN)
      // También verificar por role string para compatibilidad
      const roleId = user?.roleId;
      const roleName = user?.role?.toUpperCase();
      
      this.isPatient.set(roleId === 1 || roleName === 'PATIENT');
      this.isDoctor.set(roleId === 2 || roleName === 'DOCTOR');
      this.isAdmin.set(roleId === 3 || roleName === 'ADMINISTRATOR');
      this.hasKnownRole.set(this.isPatient() || this.isDoctor() || this.isAdmin());
      
      console.log('[Dashboard] Roles asignados:', { 
        email: user?.email, 
        roleId, 
        role: roleName,
        isPatient: this.isPatient(),
        isDoctor: this.isDoctor(),
        isAdmin: this.isAdmin()
      });

      // Primero intentar usar el nombre del objeto user si existe
      if (user?.firstName || user?.lastName) {
        const name = `${user.firstName || ''} ${user.lastName || ''}`.trim();
        console.log('[Dashboard] Usando nombre del objeto user:', name);
        this.userFullName.set(name);
      } else if (user?.email) {
        // Fallback temporal al email mientras carga el perfil
        const emailName = user.email.split('@')[0];
        console.log('[Dashboard] Usando nombre del email temporalmente:', emailName);
        this.userFullName.set(emailName);
      }

      // Cargar perfil del usuario para obtener el nombre completo actualizado
      if (user) {
        this.loadUserProfile();
      }
    });
  }

  /**
   * Carga el perfil del usuario y extrae el nombre completo
   */
  private loadUserProfile(): void {
    console.log('[Dashboard] Iniciando carga de perfil...');
    
    this.profileService.getMyProfile().subscribe({
      next: (response) => {
        console.log('[Dashboard] Respuesta completa del perfil:', response);
        
        if (response.success && response.data?.profile) {
          this.userProfile = response.data.profile;
          
          console.log('[Dashboard] Tipo de perfil:', response.data.profile.type);
          console.log('[Dashboard] Datos del perfil:', response.data.profile);
          
          // Extraer nombre según el tipo de perfil - todos tienen fullName excepto Admin
          let fullName = '';
          
          if (response.data.profile.type === 'PATIENT') {
            const profile = response.data.profile as PatientProfile;
            fullName = profile.fullName || `${profile.firstName || ''} ${profile.lastName || ''}`.trim();
            console.log('[Dashboard] Nombre de paciente extraído:', fullName);
          } else if (response.data.profile.type === 'DOCTOR') {
            const profile = response.data.profile as DoctorProfile;
            fullName = profile.fullName || '';
            console.log('[Dashboard] Nombre de médico extraído:', fullName);
          } else if (response.data.profile.type === 'ADMINISTRATOR') {
            // AdminProfile no tiene fullName, usar el email del usuario
            fullName = this.user?.email?.split('@')[0] || 'Administrador';
            console.log('[Dashboard] Admin - usando email:', fullName);
          }
          
          // Si no hay fullName, usar email como fallback
          if (!fullName || fullName.trim() === '') {
            fullName = this.user?.email?.split('@')[0] || 'Usuario';
            console.log('[Dashboard] Usando fallback por fullName vacío:', fullName);
          }
          
          this.userFullName.set(fullName);
          console.log('[Dashboard] Nombre final establecido:', this.userFullName());
        } else {
          console.warn('[Dashboard] No hay perfil en la respuesta, usando email');
          // Si no hay perfil, usar el email del usuario
          const fallbackName = this.user?.email?.split('@')[0] || 'Usuario';
          console.log('[Dashboard] Usando fallback:', fallbackName);
          this.userFullName.set(fallbackName);
        }
      },
      error: (error) => {
        console.error('[Dashboard] Error cargando perfil:', error);
        // Fallback al email si falla la carga del perfil
        const fallbackName = this.user?.email?.split('@')[0] || 'Usuario';
        console.log('[Dashboard] Error - usando fallback:', fallbackName);
        this.userFullName.set(fallbackName);
      }
    });
  }

  logHabit() {
    // Logic to log a new habit
    console.log('Log Habit button clicked');
  }

  viewProgress() {
    // Logic to navigate to a detailed progress page
    console.log('View Progress button clicked');
  }
}