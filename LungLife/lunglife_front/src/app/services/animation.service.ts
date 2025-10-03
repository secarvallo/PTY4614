import {inject, Injectable} from '@angular/core';
import {AnimationController} from '@ionic/angular';

export interface AnimationConfig {
  element: HTMLElement;
  duration?: number;
  delay?: number;
  easing?: string;
  direction?: 'normal' | 'reverse' | 'alternate' | 'alternate-reverse';
  iterations?: number;
}

@Injectable({
  providedIn: 'root'
})
export class AnimationService {
  // Reemplaza inyección por constructor según regla prefer-inject
  private readonly animationCtrl = inject(AnimationController);

  /**
   * Fade in animation
   */
  fadeIn(config: AnimationConfig) {
    return this.animationCtrl
      .create()
      .addElement(config.element)
      .duration(config.duration || 300)
      .delay(config.delay || 0)
      .easing(config.easing || 'ease-out')
      .direction(config.direction || 'normal')
      .iterations(config.iterations || 1)
      .fromTo('opacity', '0', '1')
      .fromTo('transform', 'translateY(20px)', 'translateY(0px)');
  }

  /**
   * Fade out animation
   */
  fadeOut(config: AnimationConfig) {
    return this.animationCtrl
      .create()
      .addElement(config.element)
      .duration(config.duration || 300)
      .delay(config.delay || 0)
      .easing(config.easing || 'ease-in')
      .direction(config.direction || 'normal')
      .iterations(config.iterations || 1)
      .fromTo('opacity', '1', '0')
      .fromTo('transform', 'translateY(0px)', 'translateY(-20px)');
  }

  /**
   * Slide in from right animation
   */
  slideInRight(config: AnimationConfig) {
    return this.animationCtrl
      .create()
      .addElement(config.element)
      .duration(config.duration || 400)
      .delay(config.delay || 0)
      .easing(config.easing || 'cubic-bezier(0.25, 0.46, 0.45, 0.94)')
      .direction(config.direction || 'normal')
      .iterations(config.iterations || 1)
      .fromTo('opacity', '0', '1')
      .fromTo('transform', 'translateX(100%)', 'translateX(0%)');
  }

  /**
   * Slide in from left animation
   */
  slideInLeft(config: AnimationConfig) {
    return this.animationCtrl
      .create()
      .addElement(config.element)
      .duration(config.duration || 400)
      .delay(config.delay || 0)
      .easing(config.easing || 'cubic-bezier(0.25, 0.46, 0.45, 0.94)')
      .direction(config.direction || 'normal')
      .iterations(config.iterations || 1)
      .fromTo('opacity', '0', '1')
      .fromTo('transform', 'translateX(-100%)', 'translateX(0%)');
  }

  /**
   * Slide out to left animation
   */
  slideOutLeft(config: AnimationConfig) {
    return this.animationCtrl
      .create()
      .addElement(config.element)
      .duration(config.duration || 400)
      .delay(config.delay || 0)
      .easing(config.easing || 'cubic-bezier(0.25, 0.46, 0.45, 0.94)')
      .direction(config.direction || 'normal')
      .iterations(config.iterations || 1)
      .fromTo('opacity', '1', '0')
      .fromTo('transform', 'translateX(0%)', 'translateX(-100%)');
  }

  /**
   * Slide out to right animation
   */
  slideOutRight(config: AnimationConfig) {
    return this.animationCtrl
      .create()
      .addElement(config.element)
      .duration(config.duration || 400)
      .delay(config.delay || 0)
      .easing(config.easing || 'cubic-bezier(0.25, 0.46, 0.45, 0.94)')
      .direction(config.direction || 'normal')
      .iterations(config.iterations || 1)
      .fromTo('opacity', '1', '0')
      .fromTo('transform', 'translateX(0%)', 'translateX(100%)');
  }

  /**
   * Scale in animation (zoom in)
   */
  scaleIn(config: AnimationConfig) {
    return this.animationCtrl
      .create()
      .addElement(config.element)
      .duration(config.duration || 300)
      .delay(config.delay || 0)
      .easing(config.easing || 'cubic-bezier(0.175, 0.885, 0.32, 1.275)')
      .direction(config.direction || 'normal')
      .iterations(config.iterations || 1)
      .fromTo('opacity', '0', '1')
      .fromTo('transform', 'scale(0.8)', 'scale(1)');
  }

  /**
   * Bounce animation
   */
  bounce(config: AnimationConfig) {
    return this.animationCtrl
      .create()
      .addElement(config.element)
      .duration(config.duration || 600)
      .delay(config.delay || 0)
      .easing('ease-in-out')
      .direction(config.direction || 'normal')
      .iterations(config.iterations || 1)
      .keyframes([
        {offset: 0, transform: 'translateY(0px)'},
        {offset: 0.2, transform: 'translateY(-10px)'},
        {offset: 0.4, transform: 'translateY(0px)'},
        {offset: 0.6, transform: 'translateY(-5px)'},
        {offset: 0.8, transform: 'translateY(0px)'},
        {offset: 1, transform: 'translateY(0px)'}
      ]);
  }

  /**
   * Pulse animation
   */
  pulse(config: AnimationConfig) {
    return this.animationCtrl
      .create()
      .addElement(config.element)
      .duration(config.duration || 1000)
      .delay(config.delay || 0)
      .easing('ease-in-out')
      .direction('alternate')
      .iterations(Infinity)
      .fromTo('transform', 'scale(1)', 'scale(1.05)');
  }

  /**
   * Shake animation (for errors)
   */
  shake(config: AnimationConfig) {
    return this.animationCtrl
      .create()
      .addElement(config.element)
      .duration(config.duration || 600)
      .delay(config.delay || 0)
      .easing('ease-in-out')
      .direction(config.direction || 'normal')
      .iterations(config.iterations || 1)
      .keyframes([
        {offset: 0, transform: 'translateX(0px)'},
        {offset: 0.1, transform: 'translateX(-10px)'},
        {offset: 0.2, transform: 'translateX(10px)'},
        {offset: 0.3, transform: 'translateX(-10px)'},
        {offset: 0.4, transform: 'translateX(10px)'},
        {offset: 0.5, transform: 'translateX(-10px)'},
        {offset: 0.6, transform: 'translateX(10px)'},
        {offset: 0.7, transform: 'translateX(-10px)'},
        {offset: 0.8, transform: 'translateX(10px)'},
        {offset: 0.9, transform: 'translateX(-10px)'},
        {offset: 1, transform: 'translateX(0px)'}
      ]);
  }

  /**
   * Staggered animations for lists
   */
  staggerAnimation(elements: HTMLElement[], animationType: 'fadeIn' | 'slideInLeft' | 'slideInRight' | 'scaleIn' = 'fadeIn', staggerDelay: number = 100) {
    const animations = elements.map((element, index) => {
      const config: AnimationConfig = {
        element,
        delay: index * staggerDelay,
        duration: 400
      };

      switch (animationType) {
        case 'slideInLeft':
          return this.slideInLeft(config);
        case 'slideInRight':
          return this.slideInRight(config);
        case 'scaleIn':
          return this.scaleIn(config);
        default:
          return this.fadeIn(config);
      }
    });

    const groupAnimation = this.animationCtrl.create();
    animations.forEach(animation => groupAnimation.addAnimation(animation));

    return groupAnimation;
  }
}
