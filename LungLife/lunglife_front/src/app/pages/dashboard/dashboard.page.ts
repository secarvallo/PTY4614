import {AfterViewInit, Component, ElementRef, inject, OnInit, QueryList, ViewChildren} from '@angular/core';

import {
  IonBadge,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonCol,
  IonContent,
  IonGrid,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonRefresher,
  IonRefresherContent,
  IonRow,
  IonTitle,
  IonToolbar
} from '@ionic/angular/standalone';
import {addIcons} from 'ionicons';
import {
  alertCircle,
  calendar,
  checkmarkCircle,
  chevronForward,
  logOut,
  person,
  rocket,
  settings,
  statsChart,
  time,
  trophy
} from 'ionicons/icons';

import {AuthService} from '../../services/auth.service';
import {LoadingService} from '../../services/loading.service';
import {ToastService} from '../../services/toast.service';
import {AnimationService} from '../../services/animation.service';
import {ConfirmationService} from '../../services/confirmation.service';
import {SkeletonComponent} from '../../components/skeleton/skeleton.component';
import {User} from '../../models/user.model';

interface DashboardStats {
  totalProjects: number;
  completedTasks: number;
  pendingTasks: number;
  upcomingDeadlines: number;
}

interface RecentActivity {
  id: number;
  type: 'project' | 'task' | 'system';
  title: string;
  description: string;
  timestamp: Date;
  status?: 'completed' | 'pending' | 'warning';
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: true,
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonGrid,
    IonRow,
    IonCol,
    IonButton,
    IonIcon,
    IonRefresher,
    IonRefresherContent,
    IonItem,
    IonLabel,
    IonBadge,
    IonButtons,
    SkeletonComponent
]
})
export class DashboardPage implements OnInit, AfterViewInit {
  @ViewChildren(IonCard, {read: ElementRef}) cards!: QueryList<ElementRef>;

  private authService = inject(AuthService);
  private loadingService = inject(LoadingService);
  private toastService = inject(ToastService);
  private animationService = inject(AnimationService);
  private confirmationService = inject(ConfirmationService);

  // Loading states with signals
  readonly dashboardLoading = this.loadingService.dashboardLoading$;

  currentUser: User | null = null;
  isRefreshing = false;

  // Estadísticas (datos de ejemplo)
  stats: DashboardStats = {
    totalProjects: 0,
    completedTasks: 0,
    pendingTasks: 0,
    upcomingDeadlines: 0
  };

  // Actividad reciente (datos de ejemplo)
  recentActivities: RecentActivity[] = [];

  constructor() {
    addIcons({
      person, statsChart, calendar, settings, logOut,
      rocket, trophy, time, checkmarkCircle, alertCircle,
      chevronForward
    });
  }

  ngOnInit() {
    this.loadDashboardData();
  }

  ngAfterViewInit() {
    // Animate cards on view init
    if (this.cards?.length) {
      setTimeout(() => {
        const cardElements = this.cards.map(card => card.nativeElement);
        this.animationService.staggerAnimation(cardElements, 'slideInLeft', 150).play();
      }, 100);
    }
  }

  /**
   * Carga los datos del dashboard con estados de loading mejorados
   */
  async loadDashboardData() {
    try {
      this.loadingService.startLoading('dashboard', 'Cargando dashboard...');

      // Simular carga progresiva con mejor feedback
      await new Promise(resolve => setTimeout(resolve, 500));
      this.loadingService.updateProgress('dashboard', 30, 'Cargando perfil...');
      this.currentUser = this.authService.getCurrentUser();

      await new Promise(resolve => setTimeout(resolve, 500));
      this.loadingService.updateProgress('dashboard', 60, 'Cargando estadísticas...');
      this.stats = {
        totalProjects: 12,
        completedTasks: 45,
        pendingTasks: 8,
        upcomingDeadlines: 3
      };

      await new Promise(resolve => setTimeout(resolve, 300));
      this.loadingService.updateProgress('dashboard', 90, 'Cargando actividades...');
      this.recentActivities = [
        {
          id: 1,
          type: 'project',
          title: 'Nuevo Proyecto',
          description: 'Proyecto "Marketing Digital" creado',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 horas atrás
          status: 'completed'
        },
        {
          id: 2,
          type: 'task',
          title: 'Tarea Completada',
          description: 'Diseño de logo finalizado',
          timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 horas atrás
          status: 'completed'
        },
        {
          id: 3,
          type: 'system',
          title: 'Recordatorio',
          description: 'Reunión de equipo en 30 minutos',
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 día atrás
          status: 'warning'
        },
        {
          id: 4,
          type: 'task',
          title: 'Tarea Pendiente',
          description: 'Reporte mensual pendiente de revisión',
          timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 días atrás
          status: 'pending'
        }
      ];

      await new Promise(resolve => setTimeout(resolve, 500));
      this.loadingService.stopLoading('dashboard');
      this.isRefreshing = false;

      // Show success message when not refreshing
      if (!this.isRefreshing) {
        await this.toastService.showSuccess('Dashboard cargado correctamente');
      }

    } catch (error) {
      this.loadingService.stopLoading('dashboard');
      await this.toastService.showError('Error al cargar el dashboard. Intenta nuevamente.');
    }
  }

  /**
   * Maneja el refresh con mejor feedback y animaciones
   */
  async handleRefresh(event: any) {
    this.isRefreshing = true;

    try {
      await this.loadDashboardData();
      await this.toastService.showInfo('Datos actualizados', 2000);
    } catch (error) {
      await this.toastService.showError('Error al actualizar los datos');
    } finally {
      setTimeout(() => {
        event.target.complete();
        this.isRefreshing = false;
      }, 1000);
    }
  }

  /**
   * Logout with confirmation - returns to Home page
   */
  async logout() {
    const confirmed = await this.confirmationService.confirmLogout();

    if (confirmed) {
      try {
        await this.authService.logout();
        await this.toastService.showSuccess('Sesión cerrada correctamente');
        // AuthService now handles redirect to /home
      } catch (error) {
        await this.toastService.showError('Error al cerrar sesión');
      }
    }
  }

  /**
   * Maneja el clic en una tarjeta de estadísticas con animación
   */
  async onStatCardClick(event: Event, statType: string) {
    const element = event.currentTarget as HTMLElement;

    // Animate the clicked card
    this.animationService.bounce({element}).play();

    // Show detailed info
    await this.toastService.showActionToast({
      message: `Ver detalles de ${statType}`,
      actionText: 'Ver más',
      actionHandler: () => this.navigateToDetails(statType),
      duration: 4000,
      position: 'bottom'
    });
  }

  /**
   * Navega a los detalles de una estadística
   */
  private navigateToDetails(statType: string) {
    // Implement navigation logic here
    console.log(`Navigating to ${statType} details`);
  }

  /**
   * Obtiene el icono según el tipo de actividad
   */
  getActivityIcon(type: string): string {
    switch (type) {
      case 'project':
        return 'rocket';
      case 'task':
        return 'checkmark-circle';
      case 'system':
        return 'alert-circle';
      default:
        return 'time';
    }
  }

  /**
   * Obtiene el color según el estado
   */
  getStatusColor(status?: string): string {
    switch (status) {
      case 'completed':
        return 'success';
      case 'pending':
        return 'warning';
      case 'warning':
        return 'danger';
      default:
        return 'medium';
    }
  }

  /**
   * Formatea la fecha relativa
   */
  getRelativeTime(timestamp: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Hace un momento';
    if (diffMins < 60) return `Hace ${diffMins} minuto${diffMins > 1 ? 's' : ''}`;
    if (diffHours < 24) return `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
    if (diffDays < 7) return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;

    return timestamp.toLocaleDateString('es-ES');
  }

  /**
   * TrackBy function for better performance
   */
  trackByActivityId(index: number, activity: RecentActivity): number {
    return activity.id;
  }
}
