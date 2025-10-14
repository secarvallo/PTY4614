import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { addIcons } from 'ionicons';
import { analytics, arrowForward, heart, heartCircle, people, shield } from 'ionicons/icons';

// Define a simple interface for the feature data
interface Feature {
  id: number;
  title: string;
  description: string;
  icon: string;
  color: string;
}

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule],
})
export class HomePage implements OnInit, OnDestroy {
  private readonly router = inject(Router);

  // Simple loading state signal
  isLoading = signal(true);
  private loadingTimeout?: number;

  // Feature data is now managed within the component
  features: Feature[] = [
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
      color: 'tertiary'
    },
    {
      id: 3,
      title: 'Seguridad de Datos',
      description: 'Protección avanzada de tu información médica personal',
      icon: 'shield',
      color: 'warning'
    },
    {
      id: 4,
      title: 'Comunidad de Apoyo',
      description: 'Conecta con otros pacientes y profesionales de la salud',
      icon: 'people',
      color: 'dark'
    }
  ];

  constructor() {
    // Register the icons used on this page
    addIcons({ heartCircle, heart, shield, analytics, people, arrowForward });
  }

  ngOnInit() {
    this.startLoadingSequence();
  }

  ngOnDestroy() {
    if (this.loadingTimeout) {
      clearTimeout(this.loadingTimeout);
    }
  }

  /**
   * Simulates an 11-second loading sequence for gradual partial initialization
   */
  private startLoadingSequence() {
    this.loadingTimeout = window.setTimeout(() => {
      this.isLoading.set(false);
    }, 11000);
  }

  /**
   * Navigates to the login page
   */
  navigateToLogin(): void {
    this.router.navigate(['/auth/login']);
  }

  /**
   * Handles click events on feature cards
   * @param feature The feature that was clicked
   */
  onFeatureClick(feature: Feature): void {
    console.log(`Feature clicked: ${feature.title}`);
    // Here you can add navigation logic, e.g., this.router.navigate(['/features', feature.id]);
  }
}
