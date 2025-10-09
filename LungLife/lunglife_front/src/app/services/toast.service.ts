import {inject, Injectable} from '@angular/core';
import {ToastController} from '@ionic/angular/standalone';

export interface ToastConfig {
  message: string;
  duration?: number;
  position?: 'top' | 'middle' | 'bottom';
  color?: 'primary' | 'secondary' | 'tertiary' | 'success' | 'warning' | 'danger' | 'light' | 'medium' | 'dark';
  icon?: string;
  buttons?: ToastButton[];
  cssClass?: string;
  animated?: boolean;
  showCloseButton?: boolean;
}

export interface ToastButton {
  text: string;
  icon?: string;
  handler?: () => void;
  role?: 'cancel';
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toastController = inject(ToastController);

  /**
   * Show a success toast
   */
  async showSuccess(message: string, duration: number = 3000): Promise<void> {
    await this.showToast({
      message,
      duration,
      color: 'success',
      icon: 'checkmark-circle',
      position: 'top',
      animated: true
    });
  }

  /**
   * Show an error toast
   */
  async showError(message: string, duration: number = 4000): Promise<void> {
    await this.showToast({
      message,
      duration,
      color: 'danger',
      icon: 'alert-circle',
      position: 'top',
      animated: true,
      showCloseButton: true
    });
  }

  /**
   * Show a warning toast
   */
  async showWarning(message: string, duration: number = 3500): Promise<void> {
    await this.showToast({
      message,
      duration,
      color: 'warning',
      icon: 'warning',
      position: 'top',
      animated: true
    });
  }

  /**
   * Show an info toast
   */
  async showInfo(message: string, duration: number = 3000): Promise<void> {
    await this.showToast({
      message,
      duration,
      color: 'primary',
      icon: 'information-circle',
      position: 'bottom',
      animated: true
    });
  }

  /**
   * Show a loading toast
   */
  async showLoading(message: string = 'Cargando...'): Promise<HTMLIonToastElement> {
    const toast = await this.toastController.create({
      message,
      position: 'bottom',
      color: 'medium',
      duration: 0, // Infinite duration
      cssClass: 'loading-toast',
      animated: true,
      buttons: [
        {
          icon: 'hourglass-outline',
          side: 'start'
        }
      ]
    });

    await toast.present();
    return toast;
  }

  /**
   * Show a custom toast with action buttons
   */
  async showActionToast(config: ToastConfig & { actionText: string; actionHandler: () => void }): Promise<void> {
    await this.showToast({
      ...config,
      buttons: [
        {
          text: config.actionText,
          handler: config.actionHandler
        },
        {
          text: 'Cerrar',
          role: 'cancel'
        }
      ]
    });
  }

  /**
   * Generic toast method
   */
  private async showToast(config: ToastConfig): Promise<void> {
    const toast = await this.toastController.create({
      message: config.message,
      duration: config.duration || 3000,
      position: config.position || 'bottom',
      color: config.color || 'medium',
      icon: config.icon,
      buttons: config.showCloseButton ? [
        ...(config.buttons || []),
        {
          icon: 'close',
          role: 'cancel'
        }
      ] : config.buttons,
      cssClass: `custom-toast ${config.cssClass || ''}`,
      animated: config.animated !== false,
      enterAnimation: (baseEl: any) => {
        return this.createEnterAnimation(baseEl);
      },
      leaveAnimation: (baseEl: any) => {
        return this.createLeaveAnimation(baseEl);
      }
    });

    await toast.present();
  }

  /**
   * Custom enter animation for toasts
   */
  private createEnterAnimation = (baseEl: any) => {
    const root = baseEl.shadowRoot;
    const backdrop = root.querySelector('ion-backdrop');
    const wrapper = root.querySelector('.toast-wrapper');

    const backdropAnimation = this.animationCtrl?.create()
      .addElement(backdrop)
      .fromTo('opacity', '0.01', 'var(--backdrop-opacity)');

    const wrapperAnimation = this.animationCtrl?.create()
      .addElement(wrapper)
      .keyframes([
        {offset: 0, opacity: '0', transform: 'translateY(-100%) scale(0.8)'},
        {offset: 0.5, opacity: '0.8', transform: 'translateY(0%) scale(1.05)'},
        {offset: 1, opacity: '1', transform: 'translateY(0%) scale(1)'}
      ]);

    return this.animationCtrl?.create()
      .addElement(baseEl)
      .easing('cubic-bezier(0.25, 0.46, 0.45, 0.94)')
      .duration(400)
      .addAnimation([backdropAnimation, wrapperAnimation]);
  };

  /**
   * Custom leave animation for toasts
   */
  private createLeaveAnimation = (baseEl: any) => {
    const root = baseEl.shadowRoot;
    const backdrop = root.querySelector('ion-backdrop');
    const wrapper = root.querySelector('.toast-wrapper');

    const backdropAnimation = this.animationCtrl?.create()
      .addElement(backdrop)
      .fromTo('opacity', 'var(--backdrop-opacity)', '0.01');

    const wrapperAnimation = this.animationCtrl?.create()
      .addElement(wrapper)
      .keyframes([
        {offset: 0, opacity: '1', transform: 'translateY(0%) scale(1)'},
        {offset: 1, opacity: '0', transform: 'translateY(-100%) scale(0.8)'}
      ]);

    return this.animationCtrl?.create()
      .addElement(baseEl)
      .easing('cubic-bezier(0.25, 0.46, 0.45, 0.94)')
      .duration(300)
      .addAnimation([backdropAnimation, wrapperAnimation]);
  };

  // Animation controller (will be injected if available)
  private animationCtrl = (globalThis as any)?.Ionic?.createAnimation;
}
