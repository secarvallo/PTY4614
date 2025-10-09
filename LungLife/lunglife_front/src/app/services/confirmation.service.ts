import {inject, Injectable} from '@angular/core';
import {AlertController} from '@ionic/angular/standalone';

export interface ConfirmationConfig {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: string;
  cancelColor?: string;
  icon?: string;
  backdropDismiss?: boolean;
  cssClass?: string;
}

export interface ActionSheetConfig {
  title?: string;
  subTitle?: string;
  buttons: ActionSheetButton[];
  backdropDismiss?: boolean;
  cssClass?: string;
}

export interface ActionSheetButton {
  text: string;
  icon?: string;
  handler?: () => void;
  role?: 'cancel' | 'destructive';
  cssClass?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ConfirmationService {
  private alertController = inject(AlertController);

  /**
   * Show a confirmation dialog
   */
  async showConfirmation(config: ConfirmationConfig): Promise<boolean> {
    return new Promise(async (resolve) => {
      const alert = await this.alertController.create({
        header: config.title || 'Confirmar acción',
        message: config.message,
        backdropDismiss: config.backdropDismiss !== false,
        cssClass: `confirmation-alert ${config.cssClass || ''}`,
        buttons: [
          {
            text: config.cancelText || 'Cancelar',
            role: 'cancel',
            cssClass: config.cancelColor ? `alert-button-${config.cancelColor}` : 'alert-button-cancel',
            handler: () => resolve(false)
          },
          {
            text: config.confirmText || 'Confirmar',
            cssClass: config.confirmColor ? `alert-button-${config.confirmColor}` : 'alert-button-confirm',
            handler: () => resolve(true)
          }
        ]
      });

      await alert.present();
    });
  }

  /**
   * Show a delete confirmation dialog
   */
  async confirmDelete(itemName?: string): Promise<boolean> {
    return this.showConfirmation({
      title: 'Eliminar elemento',
      message: itemName
        ? `¿Estás seguro de que deseas eliminar "${itemName}"? Esta acción no se puede deshacer.`
        : '¿Estás seguro de que deseas eliminar este elemento? Esta acción no se puede deshacer.',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      confirmColor: 'danger',
      icon: 'trash'
    });
  }

  /**
   * Show a logout confirmation dialog
   */
  async confirmLogout(): Promise<boolean> {
    return this.showConfirmation({
      title: 'Cerrar sesión',
      message: '¿Estás seguro de que deseas cerrar tu sesión?',
      confirmText: 'Cerrar sesión',
      cancelText: 'Cancelar',
      confirmColor: 'warning',
      icon: 'log-out'
    });
  }

  /**
   * Show a save changes confirmation dialog
   */
  async confirmUnsavedChanges(): Promise<boolean> {
    return this.showConfirmation({
      title: 'Cambios sin guardar',
      message: 'Tienes cambios sin guardar. ¿Deseas salir sin guardar?',
      confirmText: 'Salir sin guardar',
      cancelText: 'Continuar editando',
      confirmColor: 'warning',
      icon: 'warning'
    });
  }

  /**
   * Show an action sheet with multiple options
   */
  async showActionSheet(config: ActionSheetConfig): Promise<void> {
    const actionSheet = await this.alertController.create({
      header: config.title,
      subHeader: config.subTitle,
      backdropDismiss: config.backdropDismiss !== false,
      cssClass: `action-sheet ${config.cssClass || ''}`,
      buttons: config.buttons.map(button => ({
        text: button.text,
        icon: button.icon,
        role: button.role,
        cssClass: button.cssClass,
        handler: button.handler || (() => {
        })
      }))
    });

    await actionSheet.present();
  }

  /**
   * Show an info alert
   */
  async showInfo(title: string, message: string): Promise<void> {
    const alert = await this.alertController.create({
      header: title,
      message: message,
      cssClass: 'info-alert',
      buttons: [
        {
          text: 'Entendido',
          cssClass: 'alert-button-primary'
        }
      ]
    });

    await alert.present();
  }

  /**
   * Show an error alert
   */
  async showError(message: string, title: string = 'Error'): Promise<void> {
    const alert = await this.alertController.create({
      header: title,
      message: message,
      cssClass: 'error-alert',
      buttons: [
        {
          text: 'Cerrar',
          cssClass: 'alert-button-danger'
        }
      ]
    });

    await alert.present();
  }

  /**
   * Show a success alert
   */
  async showSuccess(message: string, title: string = 'Éxito'): Promise<void> {
    const alert = await this.alertController.create({
      header: title,
      message: message,
      cssClass: 'success-alert',
      buttons: [
        {
          text: 'Continuar',
          cssClass: 'alert-button-success'
        }
      ]
    });

    await alert.present();
  }

  /**
   * Show an input prompt
   */
  async showPrompt(config: {
    title: string;
    message?: string;
    placeholder?: string;
    inputType?: string;
    confirmText?: string;
    cancelText?: string;
  }): Promise<string | null> {
    return new Promise(async (resolve) => {
      const alert = await this.alertController.create({
        header: config.title,
        message: config.message,
        cssClass: 'prompt-alert',
        inputs: [
          {
            name: 'input',
            type: config.inputType as any || 'text',
            placeholder: config.placeholder || ''
          }
        ],
        buttons: [
          {
            text: config.cancelText || 'Cancelar',
            role: 'cancel',
            handler: () => resolve(null)
          },
          {
            text: config.confirmText || 'Confirmar',
            handler: (data) => resolve(data.input || '')
          }
        ]
      });

      await alert.present();
    });
  }
}
