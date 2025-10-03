import {Component, EventEmitter, Input, Output} from '@angular/core';
import {CommonModule} from '@angular/common';
import {Feature} from '../../models/feature.model';
import {IonCard, IonCardContent, IonIcon} from '@ionic/angular/standalone';

@Component({
  selector: 'app-feature-card',
  standalone: true,
  imports: [CommonModule, IonCard, IonCardContent, IonIcon],
  template: `
    <ion-card class="feature-card" button
              (click)="onClick()"
              [attr.aria-label]="feature?.ariaLabel || feature?.title"
              [attr.data-feature-id]="feature?.id">
      <ion-card-content *ngIf="feature; else skeletonTpl">
        <div class="feature-content">
          <ion-icon
            class="feature-icon"
            [name]="feature.icon"
            [color]="feature.color"></ion-icon>
          <div class="text-block">
            <h3>{{ feature.title }}</h3>
            <p>{{ feature.description }}</p>
          </div>
        </div>
      </ion-card-content>
    </ion-card>

    <ng-template #skeletonTpl>
      <ion-card-content class="feature-skeleton">
        <div class="icon-skel"></div>
        <div class="lines">
          <div class="line short"></div>
          <div class="line long"></div>
        </div>
      </ion-card-content>
    </ng-template>
  `,
  styles: [`
    .feature-card { transition: transform .25s ease, box-shadow .25s ease; }
    .feature-card:active { transform: scale(.97); }
    .feature-content { display: flex; gap: 1rem; align-items: flex-start; }
    .feature-icon { font-size: 2.2rem; }
    .text-block h3 { margin: 0 0 .25rem; font-size: 1.05rem; font-weight: 600; }
    .text-block p { margin: 0; font-size: .85rem; line-height: 1.2rem; color: var(--ion-color-medium); }
    .feature-skeleton { display: flex; gap: 1rem; align-items: center; }
    .icon-skel { width: 44px; height: 44px; border-radius: 12px; background: var(--ion-color-step-150, #e3e3e3); animation: pulse 1.2s infinite ease-in-out; }
    .lines { flex: 1; }
    .line { height: 10px; border-radius: 6px; background: var(--ion-color-step-150, #e3e3e3); margin-bottom: 8px; animation: pulse 1.2s infinite ease-in-out; }
    .line.short { width: 40%; }
    .line.long { width: 75%; }
    @keyframes pulse { 0%,100% { opacity: .5 } 50% { opacity: 1 } }
  `]
})
export class FeatureCardComponent {
  @Input() feature: Feature | null = null;
  @Output() featureClick = new EventEmitter<Feature>();

  onClick() {
    if (this.feature) {
      this.featureClick.emit(this.feature);
    }
  }
}

