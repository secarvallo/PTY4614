import { resolvePostAuthRedirect, DEFAULT_AUTH_REDIRECT } from './auth-navigation';

describe('resolvePostAuthRedirect', () => {
  it('devuelve fallback cuando returnUrl es null/undefined/vacío', () => {
    expect(resolvePostAuthRedirect(undefined)).toBe(DEFAULT_AUTH_REDIRECT);
    expect(resolvePostAuthRedirect(null)).toBe(DEFAULT_AUTH_REDIRECT);
    expect(resolvePostAuthRedirect('   ')).toBe(DEFAULT_AUTH_REDIRECT);
  });

  it('normaliza rutas sin slash inicial', () => {
    expect(resolvePostAuthRedirect('profile')).toBe('/profile');
  });

  it('rechaza URLs absolutas externas', () => {
    expect(resolvePostAuthRedirect('https://malicious.com/evil')).toBe(DEFAULT_AUTH_REDIRECT);
  });

  it('usa allowlist estricta cuando coincide', () => {
    expect(resolvePostAuthRedirect('/profile')).toBe('/profile');
  });

  it('bloquea prefijos /auth', () => {
    expect(resolvePostAuthRedirect('/auth/login')).toBe(DEFAULT_AUTH_REDIRECT);
  });

  it('evita redirect a root /', () => {
    expect(resolvePostAuthRedirect('/')).toBe(DEFAULT_AUTH_REDIRECT);
  });

  it('permite deep link interno no listado pero válido', () => {
    expect(resolvePostAuthRedirect('/patients/123')).toBe('/patients/123');
  });

  it('aplica defaultOverride si se provee', () => {
    expect(resolvePostAuthRedirect(undefined, '/dashboard')).toBe('/dashboard');
  });
});
