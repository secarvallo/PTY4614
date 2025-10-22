import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, ElementRef, ViewChild } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { PhoneFormatterDirective, AutoCountryDetectionDirective } from './phone-formatter.directive';
import { CountryCode } from 'libphonenumber-js';

// Componente de prueba para la directiva
@Component({
  template: `
    <input 
      #phoneInput
      type="tel" 
      [formControl]="phoneControl"
      [appPhoneFormatter]="countryCode"
      [enableInternationalFormat]="enableInternational"
    />
  `,
  standalone: true,
  imports: [ReactiveFormsModule, PhoneFormatterDirective]
})
class TestPhoneFormatterComponent {
  @ViewChild('phoneInput') phoneInput!: ElementRef<HTMLInputElement>;
  @ViewChild(PhoneFormatterDirective) directive!: PhoneFormatterDirective;
  
  phoneControl = new FormControl('');
  countryCode: CountryCode = 'CO';
  enableInternational = true;
}

@Component({
  template: `
    <input 
      type="tel" 
      appAutoCountryDetection
      [onCountryDetected]="onCountryDetected"
      [fallbackCountry]="fallbackCountry"
    />
  `,
  standalone: true,
  imports: [AutoCountryDetectionDirective]
})
class TestAutoCountryComponent {
  detectedCountry?: CountryCode;
  fallbackCountry: CountryCode = 'US';
  
  onCountryDetected = (country: CountryCode) => {
    this.detectedCountry = country;
  };
}

describe('PhoneFormatterDirective', () => {
  let component: TestPhoneFormatterComponent;
  let fixture: ComponentFixture<TestPhoneFormatterComponent>;
  let inputElement: HTMLInputElement;
  let directive: PhoneFormatterDirective;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestPhoneFormatterComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TestPhoneFormatterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    
    inputElement = component.phoneInput.nativeElement;
    directive = component.directive;
  });

  describe('Basic formatting functionality', () => {
    it('should create the directive', () => {
      expect(directive).toBeTruthy();
    });

    it('should format Colombian numbers correctly', () => {
      component.countryCode = 'CO';
      fixture.detectChanges();
      
      // Simulate typing
      simulateInput('3001234567');
      
      expect(inputElement.value).toMatch(/300\s*123\s*4567/);
    });

    it('should format US numbers correctly', () => {
      component.countryCode = 'US';
      fixture.detectChanges();
      
      simulateInput('2015550123');
      
      expect(inputElement.value).toMatch(/\(\d{3}\)\s*\d{3}-\d{4}/);
    });

    it('should handle international format when enabled', () => {
      component.enableInternational = true;
      fixture.detectChanges();
      
      simulateInput('+573001234567');
      
      expect(inputElement.value).toContain('+57');
    });
  });

  describe('Input validation and filtering', () => {
    it('should allow only valid phone number characters', () => {
      const event = new KeyboardEvent('keydown', { key: 'a' });
      inputElement.dispatchEvent(event);
      
      expect(event.defaultPrevented).toBe(true);
    });

    it('should allow numbers', () => {
      const event = new KeyboardEvent('keydown', { key: '5' });
      inputElement.dispatchEvent(event);
      
      expect(event.defaultPrevented).toBe(false);
    });

    it('should allow control keys', () => {
      const controlKeys = ['Backspace', 'Delete', 'Tab', 'Enter', 'ArrowLeft'];
      
      controlKeys.forEach(key => {
        const event = new KeyboardEvent('keydown', { key });
        inputElement.dispatchEvent(event);
        expect(event.defaultPrevented).toBe(false);
      });
    });

    it('should allow + symbol at the beginning for international format', () => {
      component.enableInternational = true;
      fixture.detectChanges();
      
      // Set cursor at beginning
      inputElement.setSelectionRange(0, 0);
      
      const event = new KeyboardEvent('keydown', { key: '+' });
      Object.defineProperty(event, 'target', {
        value: inputElement,
        writable: false
      });
      
      inputElement.dispatchEvent(event);
      
      expect(event.defaultPrevented).toBe(false);
    });
  });

  describe('Paste functionality', () => {
    it('should clean pasted content', () => {
      const pasteEvent = new ClipboardEvent('paste', {
        clipboardData: new DataTransfer()
      });
      
      // Mock clipboard data
      pasteEvent.clipboardData!.setData('text', '+57 (300) 123-4567 ext. 123');
      
      inputElement.dispatchEvent(pasteEvent);
      
      expect(pasteEvent.defaultPrevented).toBe(true);
    });
  });

  describe('Country code changes', () => {
    it('should reformat when country code changes', () => {
      // Start with US
      component.countryCode = 'US';
      fixture.detectChanges();
      simulateInput('2015550123');
      
      const usFormat = inputElement.value;
      
      // Change to Colombia
      component.countryCode = 'CO';
      fixture.detectChanges();
      
      // Format should change
      expect(inputElement.value).not.toBe(usFormat);
    });
  });

  describe('Public methods', () => {
    beforeEach(() => {
      simulateInput('+573001234567');
    });

    it('should return formatted value', () => {
      const formatted = directive.getFormattedValue();
      expect(formatted).toContain('+57');
    });

    it('should return E.164 format', () => {
      const e164 = directive.getE164Value();
      expect(e164).toBe('+573001234567');
    });

    it('should validate number correctly', () => {
      const isValid = directive.isValidNumber();
      expect(isValid).toBe(true);
    });

    it('should clear the field', () => {
      directive.clear();
      expect(inputElement.value).toBe('');
    });

    it('should set value programmatically', () => {
      directive.setValue('+12015550123');
      expect(inputElement.value).toContain('+1');
    });
  });

  // Helper function to simulate user input
  function simulateInput(value: string): void {
    inputElement.value = value;
    const inputEvent = new InputEvent('input', {
      bubbles: true,
      data: value
    });
    inputElement.dispatchEvent(inputEvent);
    fixture.detectChanges();
  }
});

describe('AutoCountryDetectionDirective', () => {
  let component: TestAutoCountryComponent;
  let fixture: ComponentFixture<TestAutoCountryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestAutoCountryComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TestAutoCountryComponent);
    component = fixture.componentInstance;
  });

  it('should create the directive', () => {
    expect(component).toBeTruthy();
  });

  it('should call onCountryDetected callback', (done) => {
    spyOn(component, 'onCountryDetected').and.callThrough();
    
    fixture.detectChanges();
    
    // Wait for async country detection
    setTimeout(() => {
      expect(component.onCountryDetected).toHaveBeenCalled();
      done();
    }, 100);
  });

  it('should use fallback country when detection fails', (done) => {
    // Mock fetch to fail
    spyOn(window, 'fetch').and.returnValue(
      Promise.reject(new Error('Network error'))
    );

    component.fallbackCountry = 'AR';
    fixture.detectChanges();

    setTimeout(() => {
      expect(component.detectedCountry).toBe('AR');
      done();
    }, 100);
  });

  it('should handle invalid country codes gracefully', (done) => {
    // Mock fetch to return invalid country
    spyOn(window, 'fetch').and.returnValue(
      Promise.resolve(new Response(JSON.stringify({ country_code: 'XX' })))
    );

    component.fallbackCountry = 'BR';
    fixture.detectChanges();

    setTimeout(() => {
      expect(component.detectedCountry).toBe('BR');
      done();
    }, 100);
  });
});

// Pruebas de integración
describe('Phone Directives Integration', () => {
  let component: TestPhoneFormatterComponent;
  let fixture: ComponentFixture<TestPhoneFormatterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestPhoneFormatterComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TestPhoneFormatterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should work with Angular reactive forms', () => {
    const inputElement = component.phoneInput.nativeElement;
    
    // Simulate user input
    inputElement.value = '+573001234567';
    inputElement.dispatchEvent(new InputEvent('input', { bubbles: true }));
    
    fixture.detectChanges();
    
    // Check that FormControl is updated
    expect(component.phoneControl.value).toBeTruthy();
  });

  it('should maintain cursor position during formatting', () => {
    const inputElement = component.phoneInput.nativeElement;
    
    // Set initial value and cursor position
    inputElement.value = '30012';
    inputElement.setSelectionRange(5, 5);
    
    // Simulate typing one more digit
    inputElement.value = '300123';
    inputElement.dispatchEvent(new InputEvent('input', { bubbles: true }));
    
    // Cursor should be positioned correctly after formatting
    expect(inputElement.selectionStart).toBeGreaterThan(5);
  });

  it('should handle rapid input changes', () => {
    const inputElement = component.phoneInput.nativeElement;
    
    // Simulate rapid typing
    const inputs = ['3', '30', '300', '3001', '30012', '300123'];
    
    inputs.forEach(value => {
      inputElement.value = value;
      inputElement.dispatchEvent(new InputEvent('input', { bubbles: true }));
    });
    
    fixture.detectChanges();
    
    // Should handle all inputs without errors
    expect(inputElement.value).toBeTruthy();
  });
});

// Pruebas de rendimiento
describe('Phone Directives Performance', () => {
  let component: TestPhoneFormatterComponent;
  let fixture: ComponentFixture<TestPhoneFormatterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestPhoneFormatterComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TestPhoneFormatterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should handle many rapid changes efficiently', () => {
    const inputElement = component.phoneInput.nativeElement;
    const start = performance.now();
    
    // Simulate 100 rapid input changes
    for (let i = 0; i < 100; i++) {
      inputElement.value = `300123456${i % 10}`;
      inputElement.dispatchEvent(new InputEvent('input', { bubbles: true }));
    }
    
    const end = performance.now();
    const duration = end - start;
    
    // Should complete within reasonable time (less than 100ms)
    expect(duration).toBeLessThan(100);
  });

  it('should not cause memory leaks', () => {
    const directive = component.directive;
    
    // Simulate many operations
    for (let i = 0; i < 1000; i++) {
      directive.setValue(`+57300123456${i % 10}`);
    }
    
    // Clean up
    fixture.destroy();
    
    // Should not throw errors during cleanup
    expect(() => {
      directive.ngOnDestroy();
    }).not.toThrow();
  });
});