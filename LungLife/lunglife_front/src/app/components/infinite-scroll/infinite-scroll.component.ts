import {Component, EventEmitter, Input, Output, signal} from '@angular/core';
import {CommonModule} from '@angular/common';
import {
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonItem,
  IonLabel,
  IonSkeletonText
} from '@ionic/angular/standalone';

export interface InfiniteScrollConfig {
  threshold?: string;
  disabled?: boolean;
  position?: 'bottom' | 'top';
  loadingSpinner?: string;
  loadingText?: string;
}

@Component({
  selector: 'app-infinite-scroll',
  templateUrl: './infinite-scroll.component.html',
  styleUrls: ['./infinite-scroll.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    IonItem,
    IonLabel,
    IonSkeletonText
  ]
})
export class InfiniteScrollComponent {
  @Input() config: InfiniteScrollConfig = {};
  @Input() hasMoreData = true;
  @Output() loadMore = new EventEmitter<void>();

  private loadingMore = signal(false);
  readonly isLoadingMore = this.loadingMore.asReadonly();

  // Skeleton items for loading state
  skeletonItems = [1, 2, 3];

  onLoadMore(event: any) {
    if (this.hasMoreData && !this.loadingMore()) {
      this.loadingMore.set(true);
      this.loadMore.emit();

      // Complete the infinite scroll after a delay
      setTimeout(() => {
        this.loadingMore.set(false);
        event.target.complete();
      }, 1000);
    } else {
      event.target.complete();
    }
  }
}
