import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { RegisterStrategy } from '../services/infrastructure/strategies/register.strategy';
import { AuthApiService } from '../services/infrastructure/auth-api.service';

interface StrategyResult { success: boolean; token?: string; refreshToken?: string; error?: any; }

describe('RegisterStrategy', () => {
  let strategy: RegisterStrategy;
  let api: jasmine.SpyObj<AuthApiService>;

  beforeEach(() => {
    const apiSpy = jasmine.createSpyObj<AuthApiService>('AuthApiService', ['register']);
    TestBed.configureTestingModule({
      providers: [
        RegisterStrategy,
        { provide: AuthApiService, useValue: apiSpy }
      ]
    });
    strategy = TestBed.inject(RegisterStrategy);
    api = TestBed.inject(AuthApiService) as jasmine.SpyObj<AuthApiService>;
  });

  it('maps nombre/apellido/telefono to firstName/lastName/phone', (done) => {
    api.register.and.callFake((body: any) => {
      expect(body.firstName).toBe('Juan');
      expect(body.lastName).toBe('Pérez');
      expect(body.phone).toBe('+56911111111');
      return of({ success: true, token: 't', refreshToken: 'r', user: { id: 7 } } as any);
    });

    strategy.execute({ email: 'j@p.com', password: '123456', nombre: 'Juan', apellido: 'Pérez', telefono: '+56911111111' })
      .subscribe((res: StrategyResult) => {
        expect(res.success).toBeTrue();
        expect(res.token).toBe('t');
        done();
      });
  });

  it('passes additional fields birthDate/acceptTerms/acceptPrivacy', (done) => {
    api.register.and.callFake((body: any) => {
      expect(body.birthDate).toBe('1990-01-01');
      expect(body.acceptTerms).toBeTrue();
      expect(body.acceptPrivacy).toBeTrue();
      return of({ success: true } as any);
    });

    strategy.execute({ email: 'a@b.com', password: 'x', firstName: 'A', lastName: 'B', birthDate: '1990-01-01', acceptTerms: true, acceptPrivacy: true })
      .subscribe((res: StrategyResult) => {
        expect(res.success).toBeTrue();
        done();
      });
  });
});
