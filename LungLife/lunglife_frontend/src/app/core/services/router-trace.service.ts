import { Injectable, inject } from '@angular/core';
import { Router, Event, NavigationStart, NavigationEnd, NavigationCancel, NavigationError, RoutesRecognized, GuardsCheckStart, GuardsCheckEnd, ResolveStart, ResolveEnd } from '@angular/router';
import { LoggerService } from './logger.service';
import { filter } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class RouterTraceService {
  private router = inject(Router);
  private logger = inject(LoggerService).createChild('RouterTrace');
  private enabled = true; // se podría hacer configurable

  constructor() {
    if (!this.enabled) return;
    this.router.events
      .pipe(filter((e: Event) => !!e))
      .subscribe((event) => this.handle(event));
  }

  private handle(event: Event) {
    if (event instanceof NavigationStart) {
      this.logger.debug('NavigationStart', { id: event.id, url: event.url, navigationTrigger: (event as any).navigationTrigger });
    } else if (event instanceof RoutesRecognized) {
      this.logger.debug('RoutesRecognized', { url: event.url, state: event.state?.root?.firstChild?.routeConfig?.path });
    } else if (event instanceof GuardsCheckStart) {
      this.logger.debug('GuardsCheckStart', { url: event.url });
    } else if (event instanceof GuardsCheckEnd) {
      this.logger.debug('GuardsCheckEnd', { url: event.url, shouldActivate: event.shouldActivate });
    } else if (event instanceof ResolveStart) {
      this.logger.debug('ResolveStart', { url: event.url });
    } else if (event instanceof ResolveEnd) {
      this.logger.debug('ResolveEnd', { url: event.url });
    } else if (event instanceof NavigationEnd) {
      this.logger.info('NavigationEnd', { id: event.id, url: event.urlAfterRedirects });
    } else if (event instanceof NavigationCancel) {
      this.logger.warn('NavigationCancel', { id: event.id, url: event.url, reason: (event as any).reason });
    } else if (event instanceof NavigationError) {
      this.logger.error('NavigationError', { id: event.id, url: event.url, error: event.error });
    }
  }
}
