import { bootstrapApplication } from '@angular/platform-browser';
import { addIcons } from 'ionicons';
import { 
  checkmarkCircle, 
  closeCircle, 
  eyeOutline, 
  eyeOffOutline,
  alertCircle,
  lockClosed,
  mail,
  person,
  call,
  shield,
  shieldOutline,
  warning,
  warningOutline,
  personAdd
} from 'ionicons/icons';

import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

// Register icons globally
addIcons({
  'checkmark-circle': checkmarkCircle,
  'close-circle': closeCircle,
  'eye-outline': eyeOutline,
  'eye-off-outline': eyeOffOutline,
  'alert-circle': alertCircle,
  'lock-closed': lockClosed,
  'mail': mail,
  'person': person,
  'call': call,
  'shield': shield,
  'shield-outline': shieldOutline,
  'warning': warning,
  'warning-outline': warningOutline,
  'person-add': personAdd
});

bootstrapApplication(AppComponent, appConfig).catch(err => console.error(err));
