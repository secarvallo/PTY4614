export const DEFAULT_AUTH_REDIRECT = '/profile';

// Central allowlist extendable (add here when nuevas rutas seguras post-login existan)
const AUTH_ALLOWLIST = new Set<string>([
  '/profile',
  '/dashboard',
  '/security/2fa-settings',
  '/security/sessions'
]);

// Bloqueos explícitos (rutas que nunca deben usarse como destino tras auth)
const AUTH_BLOCK_PREFIXES = ['/auth'];

/**
 * resolvePostAuthRedirect
 * Reglas:
 * 1. Si no hay returnUrl -> fallback (defaultOverride || DEFAULT_AUTH_REDIRECT)
 * 2. Rechaza URLs absolutas http/https externas
 * 3. Normaliza a prefijo '/'
 * 4. Si está en allowlist -> aceptar inmediatamente
 * 5. Si coincide con prefijos bloqueados -> fallback
 * 6. Evita redirect a root '/' devolviendo fallback
 * 7. Cualquier error -> fallback
 */
export const resolvePostAuthRedirect = (returnUrl?: string | null, defaultOverride?: string): string => {
  const fallback = defaultOverride || DEFAULT_AUTH_REDIRECT;
  try {
    if (!returnUrl) return fallback;
    let sanitized = returnUrl.trim();
    if (!sanitized) return fallback;

    // Evitar open redirect a dominios externos
    if (/^https?:\/\//i.test(sanitized)) return fallback;

    // Normalizar
    if (!sanitized.startsWith('/')) sanitized = '/' + sanitized;

    // Root no es destino útil post-login
    if (sanitized === '/') return fallback;

    // Allowlist estricta
    if (AUTH_ALLOWLIST.has(sanitized)) return sanitized;

    // Bloqueos
    if (AUTH_BLOCK_PREFIXES.some(prefix => sanitized.startsWith(prefix))) return fallback;

    // Si pasa validaciones básicas, permitir (permite deep-links como /resource/123)
    return sanitized;
  } catch {
    return fallback;
  }
};

/**
 * Helper para componer query params de login manteniendo returnUrl seguro.
 */
export const buildLoginRedirectTreeParams = (desired: string | null | undefined, currentStateUrl?: string): { returnUrl: string } => {
  const candidate = desired || currentStateUrl || DEFAULT_AUTH_REDIRECT;
  return { returnUrl: resolvePostAuthRedirect(candidate) };
};

