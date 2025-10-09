import {Component, EventEmitter, HostBinding, Input, Output} from '@angular/core';
import {IonCard, IonCardContent, IonIcon} from '@ionic/angular/standalone';
import {Feature} from '../../models/feature.model';


@Component({
  selector: 'app-feature-card',
  standalone: true,
  imports: [IonCard, IonCardContent, IonIcon],
  templateUrl: './card.component.html',
  styleUrls: ['./card.component.scss'],
})
export class CardComponent {
  // Accept null or undefined so templates can pass null for skeleton states
  @Input() feature: Feature | null | undefined = undefined;
  // Keep existing output for backward compatibility
  @Output() featureSelected = new EventEmitter<Feature>();
  // Add output alias used by some templates
  @Output() featureClick = new EventEmitter<Feature>();

  @HostBinding('attr.data-feature-id')
  get dataFeatureId(): string | null {
    return this.feature ? String(this.feature.id) : null;
  }

  onCardClick() {
    if (this.feature) {
      this.featureSelected.emit(this.feature);
      this.featureClick.emit(this.feature);
    }
  }
}
