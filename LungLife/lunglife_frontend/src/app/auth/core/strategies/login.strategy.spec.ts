import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { LoginStrategy } from '../services/infrastructure/strategies/login.strategy';
import { AuthApiService } from '../services/infrastructure/auth-api.service';

// Minimal shape expected from BaseAuthStrategy result
interface StrategyResult {
  success: boolean;
  requiresTwoFA?: boolean;
  error?: any;
  token?: string;
  refreshToken?: string;
}

describe('LoginStrategy', () => {
  let strategy: LoginStrategy;
  let api: jasmine.SpyObj<AuthApiService>;

  beforeEach(() => {
    const apiSpy = jasmine.createSpyObj<AuthApiService>('AuthApiService', ['login']);

    TestBed.configureTestingModule({
      providers: [
        LoginStrategy,
        { provide: AuthApiService, useValue: apiSpy }
      ]
    });

    strategy = TestBed.inject(LoginStrategy);
    api = TestBed.inject(AuthApiService) as jasmine.SpyObj<AuthApiService>;
  });

  it('should return requiresTwoFA when API indicates so', (done) => {
    api.login.and.returnValue(of({ success: true, requiresTwoFA: true } as any));

  strategy.execute({ email: 'u@x.com', password: 'p' }).subscribe((res: StrategyResult) => {
      expect(res.requiresTwoFA).toBeTrue();
      expect(res.success).toBeTrue();
      done();
    });
  });

  it('should return success with tokens on normal login', (done) => {
    api.login.and.returnValue(of({ success: true, token: 't', refreshToken: 'r', user: { id: 1 } } as any));

  strategy.execute({ email: 'u@x.com', password: 'p' }).subscribe((res: StrategyResult) => {
      expect(res.success).toBeTrue();
      expect(res.token).toBe('t');
      done();
    });
  });

  it('should map API error into strategy error result', (done) => {
    api.login.and.returnValue(throwError(() => ({ status: 400, error: { message: 'Invalid' } })));

    strategy.execute({ email: 'bad', password: 'bad' }).subscribe((res: StrategyResult) => {
      expect(res.success).toBeFalse();
      expect(res.error).toBeDefined();
      done();
    });
  });
});
