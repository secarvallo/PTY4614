/**
 * Detailed Profile Page
 * Comprehensive clinical profile view for patients
 * Accessible by: PATIENT, DOCTOR, ADMINISTRATOR
 */
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { IonicModule, AlertController, ToastController, ModalController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { addIcons } from 'ionicons';
import { 
  arrowBackOutline,
  personOutline,
  calendarOutline,
  locationOutline,
  callOutline,
  mailOutline,
  medkitOutline,
  warningOutline,
  flameOutline,
  constructOutline,
  peopleOutline,
  downloadOutline,
  chatbubbleOutline,
  pulseOutline,
  analyticsOutline,
  ellipsisHorizontalOutline,
  shieldCheckmarkOutline,
  alertCircleOutline,
  alertCircle,
  refreshOutline,
  chevronForwardOutline,
  timeOutline,
  checkmarkCircleOutline,
  hourglassOutline,
  personAddOutline
} from 'ionicons/icons';
import { ClinicalProfileService, ClinicalProfile, RiskFactor } from '../../services/clinical-profile.service';
import { AuthFacadeService } from '../../../auth/core/services';
import { LogoutButtonComponent } from '../../../shared/components/logout-button/logout-button.component';
import { isPatient, isDoctor, isAdmin, RoleId } from '../../../core/rbac';

@Component({
  selector: 'app-detailed-profile',
  templateUrl: './detailed-profile.page.html',
  styleUrls: [
    './detailed-profile.page.scss',
    '../../../theme/shared-layout.scss'
  ],
  standalone: true,
  imports: [IonicModule, CommonModule, RouterModule, LogoutButtonComponent],
})
export class DetailedProfilePage implements OnInit {
  private clinicalProfileService = inject(ClinicalProfileService);
  private authFacade = inject(AuthFacadeService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private alertController = inject(AlertController);
  private toastController = inject(ToastController);

  // User role
  readonly roleId = signal<number>(1);
  readonly patientIdFromRoute = signal<number | null>(null);
  readonly generatingPrediction = signal<boolean>(false);

  // Expose service signals
  readonly profile = this.clinicalProfileService.profile;
  readonly demographics = this.clinicalProfileService.demographics;
  readonly riskAssessment = this.clinicalProfileService.riskAssessment;
  readonly riskFactors = this.clinicalProfileService.riskFactors;
  readonly assignedDoctor = this.clinicalProfileService.assignedDoctor;
  readonly smokingHistory = this.clinicalProfileService.smokingHistory;
  readonly loading = this.clinicalProfileService.loading;
  readonly error = this.clinicalProfileService.error;
  readonly hasAssignedDoctor = this.clinicalProfileService.hasAssignedDoctor;
  readonly hasRiskAssessment = this.clinicalProfileService.hasRiskAssessment;

  // Computed
  readonly isPatientRole = computed(() => isPatient(this.roleId() as RoleId));
  readonly isDoctorRole = computed(() => isDoctor(this.roleId() as RoleId));
  readonly isAdminRole = computed(() => isAdmin(this.roleId() as RoleId));

  readonly riskScore = computed(() => this.riskAssessment()?.riskScore ?? 0);
  readonly riskLevel = computed(() => this.riskAssessment()?.riskLevel ?? null);
  
  readonly riskLevelLabel = computed(() => 
    this.clinicalProfileService.getRiskLevelLabel(this.riskLevel())
  );
  
  readonly riskLevelClass = computed(() => 
    this.clinicalProfileService.getRiskLevelClass(this.riskLevel())
  );

  readonly riskLevelColor = computed(() => 
    this.clinicalProfileService.getRiskLevelColor(this.riskLevel())
  );

  readonly patientAge = computed(() => {
    const demo = this.demographics();
    return demo?.age ?? null;
  });

  readonly lastUpdated = computed(() => {
    const assessment = this.riskAssessment();
    if (!assessment) return null;
    
    const date = new Date(assessment.predictionDate);
    const today = new Date();
    const diffDays = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} días`;
    return date.toLocaleDateString('es-CL');
  });

  // Back route based on role
  readonly backRoute = computed(() => {
    if (this.isDoctorRole()) return '/directory';
    return '/dashboard';
  });

  readonly backLabel = computed(() => {
    if (this.isDoctorRole()) return 'Pacientes';
    return 'Dashboard';
  });

  constructor() {
    addIcons({
      arrowBackOutline,
      personOutline,
      calendarOutline,
      locationOutline,
      callOutline,
      mailOutline,
      medkitOutline,
      warningOutline,
      flameOutline,
      constructOutline,
      peopleOutline,
      downloadOutline,
      chatbubbleOutline,
      pulseOutline,
      analyticsOutline,
      ellipsisHorizontalOutline,
      shieldCheckmarkOutline,
      alertCircleOutline,
      alertCircle,
      refreshOutline,
      chevronForwardOutline,
      timeOutline,
      checkmarkCircleOutline,
      hourglassOutline,
      personAddOutline
    });
  }

  async ngOnInit() {
    // Get user role
    const user = this.authFacade.getCurrentUser();
    
    // Verify user is authenticated
    if (!user || !user.id) {
      console.warn('User not authenticated, redirecting to login');
      await this.router.navigate(['/auth/login']);
      return;
    }
    
    if (user?.roleId) {
      this.roleId.set(user.roleId);
    }

    // Get patient ID from route if provided (for doctors/admins viewing a patient)
    const patientIdParam = this.route.snapshot.paramMap.get('patientId');
    if (patientIdParam) {
      this.patientIdFromRoute.set(parseInt(patientIdParam));
    }

    // Load the profile
    await this.loadProfile();
  }

  async loadProfile(): Promise<void> {
    const patientId = this.patientIdFromRoute();
    await this.clinicalProfileService.loadProfile(patientId ?? undefined);
  }

  async refresh(): Promise<void> {
    await this.loadProfile();
    const toast = await this.toastController.create({
      message: 'Perfil actualizado',
      duration: 2000,
      position: 'bottom',
      color: 'success'
    });
    await toast.present();
  }

  // ===== Risk Factor Helpers =====
  
  getRiskFactorIcon(factor: RiskFactor): string {
    const iconMap: Record<string, string> = {
      'smoking': 'flame-outline',
      'occupational': 'construct-outline',
      'family_history': 'people-outline',
      'toxin': 'warning-outline'
    };
    return iconMap[factor.type] || factor.icon || 'alert-circle-outline';
  }

  getRiskFactorClass(factor: RiskFactor): string {
    return `severity-${factor.severity.toLowerCase()}`;
  }

  getSeverityIndicator(severity: string): string {
    switch (severity) {
      case 'HIGH': return '!';
      case 'MODERATE': return '⚠';
      case 'LOW': return '○';
      default: return '';
    }
  }

  // Calculate SVG circle progress (circumference = 2 * PI * r = 2 * 3.14159 * 42 ≈ 264)
  getCircleProgress(): string {
    const circumference = 264;
    const progress = this.riskScore();
    const dashArray = (progress / 100) * circumference;
    return `${dashArray} ${circumference}`;
  }

  // ===== Actions =====

  async contactDoctor(): Promise<void> {
    const doctor = this.assignedDoctor();
    if (!doctor) {
      const toast = await this.toastController.create({
        message: 'No tiene médico asignado',
        duration: 2000,
        color: 'warning'
      });
      await toast.present();
      return;
    }

    const alert = await this.alertController.create({
      header: 'Contactar Médico',
      subHeader: `Dr. ${doctor.fullName}`,
      message: `Especialidad: ${doctor.specialty}\n\n¿Cómo desea contactar al médico?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { 
          text: 'Llamar',
          handler: () => {
            if (doctor.phone) {
              window.location.href = `tel:${doctor.phone}`;
            }
          }
        },
        { 
          text: 'Email',
          handler: () => {
            if (doctor.email) {
              window.location.href = `mailto:${doctor.email}`;
            }
          }
        }
      ]
    });
    await alert.present();
  }

  async downloadReport(): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Descargar Informe',
      message: 'Esta función generará un informe PDF con su perfil clínico actual.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { 
          text: 'Descargar',
          handler: async () => {
            // TODO: Implement PDF generation
            const toast = await this.toastController.create({
              message: 'Generando informe... (Próximamente)',
              duration: 2000,
              color: 'primary'
            });
            await toast.present();
          }
        }
      ]
    });
    await alert.present();
  }

  goBack(): void {
    this.router.navigate([this.backRoute()]);
  }

  async showOptions(): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Opciones',
      buttons: [
        { 
          text: 'Actualizar datos',
          handler: () => this.refresh()
        },
        { 
          text: 'Historial de riesgo',
          handler: () => {
            // TODO: Navigate to risk history
          }
        },
        { text: 'Cerrar', role: 'cancel' }
      ]
    });
    await alert.present();
  }

  /**
   * Generate ML prediction for the current patient
   */
  async generatePrediction(): Promise<void> {
    // Get patient ID from demographics
    const patientId = this.demographics()?.patientId;
    
    if (!patientId) {
      const toast = await this.toastController.create({
        message: 'No se encontró el ID del paciente',
        duration: 3000,
        color: 'danger'
      });
      await toast.present();
      return;
    }

    this.generatingPrediction.set(true);

    try {
      const result = await this.clinicalProfileService.generatePrediction(patientId);

      if (result) {
        const toast = await this.toastController.create({
          message: `Riesgo calculado: ${result.riskScore.toFixed(0)}% - ${this.clinicalProfileService.getRiskLevelLabel(result.riskLevel)}`,
          duration: 4000,
          color: 'success',
          icon: 'checkmark-circle-outline'
        });
        await toast.present();
      } else {
        // Error was set in service
        const errorMsg = this.error() || 'Error al generar predicción';
        const toast = await this.toastController.create({
          message: errorMsg,
          duration: 4000,
          color: 'danger',
          icon: 'alert-circle-outline'
        });
        await toast.present();
      }
    } catch (err: any) {
      console.error('Error generating prediction:', err);
      const toast = await this.toastController.create({
        message: err.message || 'Error al conectar con el servicio ML',
        duration: 4000,
        color: 'danger'
      });
      await toast.present();
    } finally {
      this.generatingPrediction.set(false);
    }
  }

  // Format RUT (Chilean ID) - placeholder for now
  formatRut(patientId: number): string {
    // In a real app, this would fetch the RUT from patient data
    return '12.345.678-9';
  }
}
