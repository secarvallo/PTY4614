import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { IonicModule, ToastController, LoadingController } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { addIcons } from 'ionicons';
import { checkmarkSharp, personOutline, personAddOutline, heartOutline, fitnessOutline, mailOutline } from 'ionicons/icons';
import { environment } from '../../../../../environments/environment';

export type UserRole = 'PATIENT' | 'DOCTOR';

interface RegistrationDetails {
  fullName: string;
  email: string;
  role: UserRole;
  location: string;
  registrationId: string;
  userId: number | null;
}

@Component({
  selector: 'app-register-success',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterLink],
  templateUrl: './register-success.page.html',
  styleUrls: [
    '../../../auth.styles.scss',
    './register-success.page.scss'
  ]
})
export class RegisterSuccessPage implements OnInit {
  
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);
  private toastController = inject(ToastController);
  private loadingController = inject(LoadingController);

  constructor() {
    addIcons({ checkmarkSharp, personOutline, personAddOutline, heartOutline, fitnessOutline, mailOutline });
  }
  
  userRole = signal<UserRole>('PATIENT');
  sendingEmail = signal(false);
  registrationDetails = signal<RegistrationDetails>({
    fullName: '',
    email: '',
    role: 'PATIENT',
    location: 'Chile',
    registrationId: '',
    userId: null
  });

  ngOnInit(): void {
    // Get registration data from query params (real data from database)
    this.route.queryParams.subscribe(params => {
      const role = (params['role'] as UserRole) || 'PATIENT';
      const name = params['name'] || 'Usuario';
      const lastName = params['lastName'] || '';
      const email = params['email'] || '';
      const userId = params['userId'] || '';
      
      this.userRole.set(role);
      
      // Use real user ID from database
      const prefix = role === 'DOCTOR' ? 'DOC' : 'PAC';
      const registrationId = userId ? `#${userId}-${prefix}` : `#000-${prefix}`;
      
      this.registrationDetails.set({
        fullName: role === 'DOCTOR' ? `Dr. ${name} ${lastName}`.trim() : `${name} ${lastName}`.trim(),
        email: email,
        role: role,
        location: 'Santiago, CL',
        registrationId: registrationId,
        userId: userId ? parseInt(userId, 10) : null
      });
    });
  }

  get isDoctor(): boolean {
    return this.userRole() === 'DOCTOR';
  }

  get roleTitle(): string {
    return this.isDoctor ? '¡Doctor Creado!' : '¡Paciente Creado!';
  }

  get roleSubtitle(): string {
    const roleType = this.isDoctor ? 'médico' : 'paciente';
    return `El ${roleType} ha sido registrado exitosamente en el sistema de gestión médica.`;
  }

  get roleLabel(): string {
    return this.isDoctor ? 'Médico General' : 'Paciente';
  }

  get roleIcon(): string {
    return this.isDoctor ? 'fitness-outline' : 'heart-outline';
  }

  goToLogin(): void {
    this.router.navigate(['/auth/login']);
  }

  createAnotherUser(): void {
    this.router.navigate(['/auth/role-selection']);
  }

  goBack(): void {
    this.router.navigate(['/auth/login']);
  }

  async sendCredentialsByEmail(): Promise<void> {
    const details = this.registrationDetails();
    
    if (!details.email) {
      const toast = await this.toastController.create({
        message: 'No se encontró el email del usuario',
        duration: 3000,
        position: 'top',
        color: 'warning'
      });
      await toast.present();
      return;
    }

    this.sendingEmail.set(true);

    try {
      const response = await this.http.post<{ success: boolean; message: string }>(
        `${environment.apiUrl}/auth/send-credentials`,
        {
          email: details.email,
          fullName: details.fullName,
          role: details.role,
          registrationId: details.registrationId,
          userId: details.userId
        }
      ).toPromise();

      const toast = await this.toastController.create({
        message: response?.success 
          ? 'Credenciales enviadas exitosamente al email' 
          : 'Error al enviar las credenciales',
        duration: 3000,
        position: 'top',
        color: response?.success ? 'success' : 'danger'
      });
      await toast.present();

    } catch (error: any) {
      console.error('Error sending credentials:', error);
      
      const toast = await this.toastController.create({
        message: error?.error?.message || 'Error al enviar las credenciales por email',
        duration: 3000,
        position: 'top',
        color: 'danger'
      });
      await toast.present();

    } finally {
      this.sendingEmail.set(false);
    }
  }
}
