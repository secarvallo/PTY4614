import {
  AfterViewInit,
  Component,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
  QueryList,
  signal,
  ViewChildren
} from '@angular/core';
import {CommonModule} from '@angular/common';
import {Router} from '@angular/router';
import {
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCol,
  IonContent,
  IonGrid,
  IonHeader,
  IonIcon,
  IonRow,
  IonSpinner,
  IonTitle,
  IonToolbar
} from '@ionic/angular/standalone';
import {addIcons} from 'ionicons';
import {analytics, arrowForward, heart, logIn, people, personAdd, shield} from 'ionicons/icons';

import {AuthService} from '../../services/auth.service';
import {LoadingService} from '../../services/loading.service';
import {ToastService} from '../../services/toast.service';
import {AnimationService} from '../../services/animation.service';
import {User} from '../../models/user.model';
import {Feature} from '../../models/feature.model';
import {FeatureCardComponent} from '../../components/feature-card/feature-card.component';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButton,
    IonButtons, IonCard, IonCardContent,
    IonIcon, IonGrid, IonRow, IonCol, IonSpinner,
    FeatureCardComponent
  ]
})
export class HomePage implements OnInit, AfterViewInit, OnDestroy {
  @ViewChildren(FeatureCardComponent, {read: ElementRef}) featureCards!: QueryList<ElementRef>;

  // Services
  private readonly authService = inject(AuthService);
  private readonly loadingService = inject(LoadingService);
  private readonly toastService = inject(ToastService);
  private readonly animationService = inject(AnimationService);
  private readonly router = inject(Router);

  // Signals for reactive state
  readonly isLoading = signal(true);
  readonly currentUser = signal<User | null>(null);
  readonly showFeatureSkeletons = signal(true);
  readonly autoRedirectSeconds = signal<number | null>(null);
  readonly autoRedirectActive = signal(false);
  private redirectIntervalId: any;
  private redirectTimeoutId: any;

  // App features data (typed)
  readonly appFeatures: Feature[] = [
    {
      id: 1,
      title: 'Detección Temprana',
      description: 'Análisis avanzado con IA para detectar signos tempranos de cáncer de pulmón',
      icon: 'analytics',
      color: 'primary'
    },
    {
      id: 2,
      title: 'Seguimiento Personalizado',
      description: 'Monitoreo continuo y planes de tratamiento personalizados',
      icon: 'heart',
      color: 'success'
    },
    {
      id: 3,
      title: 'Seguridad de Datos',
      description: 'Protección avanzada de tu información médica personal',
      icon: 'shield',
      color: 'tertiary'
    },
    {
      id: 4,
      title: 'Comunidad de Apoyo',
      description: 'Conecta con otros pacientes y profesionales de la salud',
      icon: 'people',
      color: 'warning'
    }
  ];

  constructor() {
    addIcons({
      heart, shield, analytics, people,
      logIn, personAdd, arrowForward
    });
  }

  ngOnInit() {
    this.initializeHomePage();
  }

  ngAfterViewInit() {
    // Animate feature cards with stagger effect
    setTimeout(() => {
      if (this.featureCards?.length) {
        const cardElements = this.featureCards.map(card => card.nativeElement);
        this.animationService.staggerAnimation(cardElements, 'fadeIn', 200).play();
      }
    }, 500);
  }

  ngOnDestroy() {
    this.clearAutoRedirectTimers();
  }

  private clearAutoRedirectTimers() {
    if (this.redirectIntervalId) clearInterval(this.redirectIntervalId);
    if (this.redirectTimeoutId) clearTimeout(this.redirectTimeoutId);
  }

  private startAutoRedirectCountdown(seconds = 6) {
    this.autoRedirectSeconds.set(seconds);
    this.autoRedirectActive.set(true);
    this.redirectIntervalId = setInterval(() => {
      const current = this.autoRedirectSeconds();
      if (current !== null) {
        if (current <= 1) {
          this.clearAutoRedirectTimers();
          this.navigateToDashboard();
        } else {
          this.autoRedirectSeconds.set(current - 1);
        }
      }
    }, 1000);
  }

  cancelAutoRedirect() {
    this.clearAutoRedirectTimers();
    this.autoRedirectSeconds.set(null);
    this.autoRedirectActive.set(false);
  }

  /**
   * Initialize home page with loading simulation
   */
  private async initializeHomePage() {
    this.loadingService.startLoading('global', 'Bienvenido a LungLife...');

    const user = this.authService.getCurrentUser();
    this.currentUser.set(user);

    // Simulated initial delay for UX
    await new Promise(resolve => setTimeout(resolve, 900));

    // Show skeletons briefly even if fast network
    setTimeout(() => this.showFeatureSkeletons.set(false), 450);

    this.isLoading.set(false);
    this.loadingService.stopLoading('global');

    // Welcome message based on user state
    if (user) {
      await this.toastService.showInfo(`¡Hola de nuevo, ${user.name}!`, 1800);
      // Auto redirect countdown (non intrusive)
      this.startAutoRedirectCountdown();
    } else {
      await this.toastService.showInfo('Bienvenido a LungLife - Tu salud pulmonar es nuestra prioridad', 2600);
    }
  }

  /**
   * Navigate to dashboard if logged in
   */
  async navigateToDashboard() {
    if (this.currentUser()) {
      await this.toastService.showInfo('Accediendo a tu panel...');
      await this.router.navigate(['/dashboard']);
    } else {
      await this.toastService.showWarning('Primero debes iniciar sesión');
      await this.navigateToLogin();
    }
  }

  /**
   * Navigate to login with animation
   */
  async navigateToLogin() {
    await this.toastService.showInfo('Redirigiendo al inicio de sesión...');
    await this.router.navigate(['/login']);
  }

  /**
   * Navigate to registration with animation
   */
  async navigateToRegister() {
    await this.toastService.showInfo('Redirigiendo al registro...');
    await this.router.navigate(['/register']);
  }

  /**
   * Handle feature card click with animation
   */
  async onFeatureCardClick(feature: Feature) {
    // Animate clicked feature card list with pulse if available
    // (The event param is now optional and removed from template usage)
    // We find the element by data attribute as fallback
    const cardRef = this.featureCards.find(ref => ref.nativeElement?.getAttribute('data-feature-id') === String(feature.id));
    const element = cardRef?.nativeElement as HTMLElement | undefined;

    if (element) {
      this.animationService.pulse({
        element,
        duration: 300,
        iterations: 1
      }).play();
    }

    await this.toastService.showActionToast({
      message: `¿Quieres saber más sobre ${feature.title}?`,
      actionText: 'Ver más',
      actionHandler: () => this.showFeatureDetails(feature),
      duration: 4000,
      position: 'bottom'
    });
  }

  /**
   * Show feature details (placeholder)
   */
  private showFeatureDetails(feature: Feature) {
    // Placeholder for modal/navigation
    console.log(`Showing details for: ${feature.title}`);
  }

  /**
   * Logout current user
   */
  async logout() {
    try {
      await this.authService.logout();
      this.currentUser.set(null);
      await this.toastService.showSuccess('Sesión cerrada correctamente');
    } catch (error) {
      await this.toastService.showError('Error al cerrar sesión');
    }
  }

  /**
   * Track by function for feature cards
   */
  trackByFeatureId(index: number, feature: Feature): number {
    return feature.id;
  }

  // Getters for template
  get isLoggedIn(): boolean {
    return !!this.currentUser();
  }
}
