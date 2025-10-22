import { Directive, HostListener, ElementRef, Input, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { AsYouType, CountryCode, getCountries } from 'libphonenumber-js';

@Directive({
  selector: '[appPhoneFormatter]',
  standalone: true
})
export class PhoneFormatterDirective implements OnChanges, OnDestroy {
  @Input('appPhoneFormatter') countryCode: CountryCode = 'CO'; // Colombia por defecto
  @Input() enableInternationalFormat = true; // Permitir formato internacional
  
  private formatter: AsYouType;
  private previousValue = '';

  constructor(private elementRef: ElementRef<HTMLInputElement>) {
    this.formatter = new AsYouType(this.countryCode);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['countryCode'] && changes['countryCode'].currentValue) {
      // Si el código de país cambia, se crea un nuevo formateador.
      this.formatter = new AsYouType(this.countryCode);
      // Re-formatea el valor actual con el nuevo país.
      this.formatValue(this.elementRef.nativeElement.value);
    }
  }

  ngOnDestroy(): void {
    // Cleanup si es necesario
  }

  @HostListener('input', ['$event'])
  onInput(event: InputEvent): void {
    const target = event.target as HTMLInputElement;
    this.formatValue(target.value);
  }

  @HostListener('keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    const target = event.target as HTMLInputElement;
    
    // Permitir teclas de control (backspace, delete, arrows, etc.)
    const controlKeys = [
      'Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
      'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
      'Home', 'End', 'PageUp', 'PageDown'
    ];
    
    if (controlKeys.includes(event.key) || 
        event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }

    // Para formato internacional, permitir '+' al inicio
    if (event.key === '+' && target.selectionStart === 0 && this.enableInternationalFormat) {
      return;
    }

    // Solo permitir números y algunos símbolos de formato
    if (!/[\d\s\-\(\)\.]/.test(event.key)) {
      event.preventDefault();
    }
  }

  @HostListener('paste', ['$event'])
  onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const pastedData = event.clipboardData?.getData('text');
    
    if (pastedData) {
      // Limpiar el texto pegado de caracteres no permitidos
      const cleanedData = pastedData.replace(/[^\d\+\s\-\(\)\.]/g, '');
      const target = event.target as HTMLInputElement;
      
      // Insertar el texto limpio en la posición del cursor
      const start = target.selectionStart || 0;
      const end = target.selectionEnd || 0;
      const currentValue = target.value;
      const newValue = currentValue.substring(0, start) + cleanedData + currentValue.substring(end);
      
      this.formatValue(newValue);
    }
  }

  private formatValue(value: string): void {
    if (value === this.previousValue) {
      return; // Evitar reformateo innecesario
    }

    // Guardar posición del cursor
    const element = this.elementRef.nativeElement;
    const cursorPosition = element.selectionStart || 0;
    const valueBeforeCursor = value.substring(0, cursorPosition);

    try {
      // Resetear el formateador y aplicar el nuevo valor
      this.formatter = new AsYouType(this.countryCode);
      let formatted = '';

      // Si el valor comienza con '+', usar formato internacional
      if (value.startsWith('+') && this.enableInternationalFormat) {
        this.formatter = new AsYouType();
        formatted = this.formatter.input(value);
      } else {
        // Usar el país especificado
        formatted = this.formatter.input(value);
      }

      // Actualizar el valor del input
      element.value = formatted;
      this.previousValue = formatted;

      // Restaurar posición del cursor ajustada
      const formattedBeforeCursor = this.formatter.input(valueBeforeCursor);
      const newCursorPosition = formattedBeforeCursor.length;
      
      // Usar setTimeout para evitar problemas con el timing
      setTimeout(() => {
        element.setSelectionRange(newCursorPosition, newCursorPosition);
      }, 0);

      // Disparar evento input para que Angular detecte el cambio
      element.dispatchEvent(new InputEvent('input', { bubbles: true }));

    } catch (error) {
      console.warn('Error formatting phone number:', error);
      // En caso de error, mantener el valor original
      element.value = value;
    }
  }

  /**
   * Método público para obtener el número formateado
   */
  getFormattedValue(): string {
    return this.elementRef.nativeElement.value;
  }

  /**
   * Método público para obtener el número en formato E.164
   */
  getE164Value(): string | null {
    try {
      const phoneNumber = this.formatter.getNumber();
      return phoneNumber?.format('E.164') || null;
    } catch {
      return null;
    }
  }

  /**
   * Método público para validar el número actual
   */
  isValidNumber(): boolean {
    try {
      const phoneNumber = this.formatter.getNumber();
      return phoneNumber?.isValid() || false;
    } catch {
      return false;
    }
  }

  /**
   * Método público para limpiar el campo
   */
  clear(): void {
    this.elementRef.nativeElement.value = '';
    this.previousValue = '';
    this.formatter = new AsYouType(this.countryCode);
  }

  /**
   * Método público para establecer un valor programáticamente
   */
  setValue(value: string): void {
    this.formatValue(value);
  }
}

/**
 * Directiva complementaria para detectar automáticamente el país desde IP
 */
@Directive({
  selector: '[appAutoCountryDetection]',
  standalone: true
})
export class AutoCountryDetectionDirective implements OnDestroy {
  @Input() onCountryDetected?: (countryCode: CountryCode) => void;
  @Input() fallbackCountry: CountryCode = 'CO';

  private abortController?: AbortController;

  constructor() {
    this.detectCountryFromIP();
  }

  ngOnDestroy(): void {
    this.abortController?.abort();
  }

  private async detectCountryFromIP(): Promise<void> {
    try {
      this.abortController = new AbortController();
      
      // Usar un servicio gratuito de geolocalización por IP
      const response = await fetch('https://ipapi.co/json/', {
        signal: this.abortController.signal
      });

      if (response.ok) {
        const data = await response.json();
        const countryCode = data.country_code?.toUpperCase();
        
        // Verificar que el país sea válido para libphonenumber-js
        const availableCountries = getCountries();
        if (countryCode && availableCountries.includes(countryCode as CountryCode)) {
          this.onCountryDetected?.(countryCode as CountryCode);
        } else {
          this.onCountryDetected?.(this.fallbackCountry);
        }
      } else {
        this.onCountryDetected?.(this.fallbackCountry);
      }
    } catch (error) {
      // En caso de error (network, CORS, etc.), usar país por defecto
      console.warn('Could not detect country from IP:', error);
      this.onCountryDetected?.(this.fallbackCountry);
    }
  }
}