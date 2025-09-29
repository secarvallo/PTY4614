import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AuthApiService, LoginRequest, RegisterRequest, TwoFASetupRequest, TwoFAVerifyRequest, RefreshRequest } from './auth-api.service';
import { environment } from '../../../../../environments/environment';

// Basic happy-path + a couple of error path tests to lock API contract

describe('AuthApiService', () => {
  let service: AuthApiService;
  let http: HttpTestingController;
  const base = environment.apiUrl + '/auth';

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });
    service = TestBed.inject(AuthApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('login() should POST credentials and return response', () => {
    const reqBody: LoginRequest = { email: 'a@b.com', password: 'x' };
    const mockResponse = { success: true, token: 't1', refreshToken: 'r1', user: { id: 1 } };

    service.login(reqBody).subscribe(res => {
      expect(res).toEqual(mockResponse);
    });

    const req = http.expectOne(base + '/login');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(reqBody);
    req.flush(mockResponse);
  });

  it('register() should POST register data', () => {
    const reqBody: RegisterRequest = { email: 'c@d.com', password: 'pass', firstName: 'Nom', lastName: 'Ape' };
    const mock = { success: true, token: 't2', refreshToken: 'r2', user: { id: 2 } };

    service.register(reqBody).subscribe(res => {
      expect(res.success).toBeTrue();
      expect(res.user?.id).toBe(2);
    });

    const req = http.expectOne(base + '/register');
    expect(req.request.method).toBe('POST');
    expect(req.request.body.firstName).toBe('Nom');
    req.flush(mock);
  });

  it('setup2FA() should POST method', () => {
    const body: TwoFASetupRequest = { method: 'totp' };
    const mock = { success: true, qrCode: 'data:image/png;base64,xx', secret: 'ABC', backupCodes: ['111111'] } as any;

    service.setup2FA(body).subscribe(res => {
      expect(res.success).toBeTrue();
      expect((res as any).qrCode).toBeDefined();
    });

    const req = http.expectOne(base + '/2fa/setup');
    expect(req.request.method).toBe('POST');
    req.flush(mock);
  });

  it('verify2FA() should POST code', () => {
    const body: TwoFAVerifyRequest = { code: '123456' };
    const mock = { success: true, token: 'newToken', refreshToken: 'newRefresh', user: { id: 3 } };

    service.verify2FA(body).subscribe(res => {
      expect(res.success).toBeTrue();
      expect(res.token).toBe('newToken');
    });

    const req = http.expectOne(base + '/2fa/verify');
    expect(req.request.method).toBe('POST');
    req.flush(mock);
  });

  it('refresh() should POST refresh token', () => {
    const body: RefreshRequest = { refreshToken: 'rr' };
    const mock = { success: true, accessToken: 'acc2', refreshToken: 'rr2' };

    service.refresh(body).subscribe(res => {
      expect(res.accessToken).toBe('acc2');
    });

    const req = http.expectOne(base + '/refresh');
    expect(req.request.method).toBe('POST');
    req.flush(mock);
  });

  it('me() should GET user profile', () => {
    const mock = { success: true, user: { id: 9, email: 'x@y.com' } };

    service.me().subscribe(res => {
      expect(res.user?.id).toBe(9);
    });

    const req = http.expectOne(base + '/me');
    expect(req.request.method).toBe('GET');
    req.flush(mock);
  });

  it('sessions() should GET sessions list', () => {
    const mock = { sessions: [{ id: 1 }, { id: 2 }] };

    service.sessions().subscribe(res => {
      expect(res.sessions.length).toBe(2);
    });

    const req = http.expectOne(base + '/sessions');
    expect(req.request.method).toBe('GET');
    req.flush(mock);
  });

  it('revokeSession() should POST body', () => {
    service.revokeSession({ sessionId: 5 }).subscribe();
    const req = http.expectOne(base + '/sessions/revoke');
    expect(req.request.method).toBe('POST');
    expect(req.request.body.sessionId).toBe(5);
    req.flush({});
  });

  it('should surface HTTP error (login)', () => {
    const reqBody: LoginRequest = { email: 'bad@x.com', password: 'wrong' };
    service.login(reqBody).subscribe({
      next: () => fail('expected error'),
      error: err => {
        expect(err.status).toBe(401);
      }
    });
    const req = http.expectOne(base + '/login');
    req.flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });
  });
});
