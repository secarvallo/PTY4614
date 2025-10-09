import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { TwoFactorStrategy } from '../services/infrastructure/strategies/two-factor.strategy';
import { AuthApiService } from '../services/infrastructure/auth-api.service';

interface StrategyResult { success: boolean; requiresTwoFA?: boolean; token?: string; refreshToken?: string; error?: any; metadata?: any; }

describe('TwoFactorStrategy', () => {
  let strategy: TwoFactorStrategy;
  let api: jasmine.SpyObj<AuthApiService>;

  beforeEach(() => {
    const apiSpy = jasmine.createSpyObj<AuthApiService>('AuthApiService', ['setup2FA', 'verify2FA']);
    TestBed.configureTestingModule({
      providers: [
        TwoFactorStrategy,
        { provide: AuthApiService, useValue: apiSpy }
      ]
    });
    strategy = TestBed.inject(TwoFactorStrategy);
    api = TestBed.inject(AuthApiService) as jasmine.SpyObj<AuthApiService>;
  });

  it('performs setup when setup flag present', (done) => {
    api.setup2FA.and.returnValue(of({ success: true, qrCode: 'qr', secret: 'S', backupCodes: ['1'] } as any));

    strategy.execute({ setup: true, method: 'totp' }).subscribe((res: StrategyResult) => {
      expect(res.success).toBeTrue();
      expect(res.metadata.qrCode).toBe('qr');
      done();
    });
  });

  it('verifies 2FA code when code provided (verify path)', (done) => {
    api.verify2FA.and.returnValue(of({ success: true, token: 't', refreshToken: 'r', user: { id: 10 } } as any));

    strategy.execute({ code: '123456' }).subscribe((res: StrategyResult) => {
      expect(res.success).toBeTrue();
      expect(res.token).toBe('t');
      done();
    });
  });

  it('returns error result on invalid code', (done) => {
    api.verify2FA.and.returnValue(throwError(() => ({ status: 400, error: { message: 'Invalid code' } })));

    strategy.execute({ code: 'bad' }).subscribe((res: StrategyResult) => {
      expect(res.success).toBeFalse();
      expect(res.error).toBeDefined();
      done();
    });
  });
});
