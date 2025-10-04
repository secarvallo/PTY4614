import {Component, inject, OnDestroy, OnInit, signal} from '@angular/core';

import {Router} from '@angular/router';
import {IonButton, IonContent, IonSpinner} from '@ionic/angular/standalone';
import {addIcons} from 'ionicons';
import {analytics, arrowForward, heart, heartCircle, people, shield} from 'ionicons/icons';
import {CardComponent} from '../../components/feature-card/card.component';
import {Feature} from '../../models/feature.model';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    IonButton,
    IonSpinner,
    CardComponent
  ]
})
export class HomePage implements OnInit, OnDestroy {
  private readonly router = inject(Router);

  // Simple loading state
  private _isLoading = signal(true);
  private loadingTimeout?: number;

  // Getter for template access
  get isLoading() {
    return this._isLoading;
  }

  constructor() {
    addIcons({
      heartCircle,
      heart,
      shield,
      analytics,
      people,
      arrowForward
    });
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
   * Simula una carga simple de 2 segundos
   */
  private startLoadingSequence() {
    this.loadingTimeout = window.setTimeout(() => {
      this._isLoading.set(false);
    }, 2000);
  }

  /**
   * Navega directamente al login
   */
  navigateToLogin() {
    this.router.navigate(['/login'], {
      replaceUrl: true
    });
  }

  /**
   * Maneja los clics en las feature cards
   */
  onFeatureClick(feature: Feature) {
    // Lógica opcional para manejar clics en las features
    console.log('Feature clicked:', feature.title);
  }
}
