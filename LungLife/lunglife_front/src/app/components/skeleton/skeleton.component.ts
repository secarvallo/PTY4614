import {Component, Input} from '@angular/core';

import {IonCard, IonCardContent, IonItem, IonLabel, IonSkeletonText} from '@ionic/angular/standalone';

@Component({
  selector: 'app-skeleton',
  templateUrl: './skeleton.component.html',
  styleUrls: ['./skeleton.component.scss'],
  standalone: true,
  imports: [IonSkeletonText, IonCard, IonCardContent, IonItem, IonLabel]
})
export class SkeletonComponent {
  @Input() type: 'dashboard' | 'profile' | 'form' | 'list' = 'dashboard';
  @Input() items: number[] = [1, 2, 3, 4, 5];
}
