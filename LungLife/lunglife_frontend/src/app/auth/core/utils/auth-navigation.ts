export const DEFAULT_AUTH_REDIRECT = '/dashboard';

/**
 * Tipo de rol de usuario para navegación
 */
export type UserRole = 'PATIENT' | 'DOCTOR' | 'ADMINISTRATOR';

/**
 * Mapeo de roles a rutas de dashboard específicas
 * Configurable para agregar dashboards específicos por rol
 */
const ROLE_DASHBOARD_MAP: Record<UserRole, string> = {
  'PATIENT': '/dashboard',
  'DOCTOR': '/dashboard',
  'ADMINISTRATOR': '/dashboard'
};

/**
 * Obtiene la URL de dashboard según el rol del usuario
 * @param role - Rol del usuario (PATIENT, DOCTOR, ADMINISTRATOR)
 * @returns URL del dashboard correspondiente al rol
 */
export const getRoleDashboardUrl = (role?: UserRole | string | null): string => {
  if (!role) return DEFAULT_AUTH_REDIRECT;
  const normalizedRole = role.toUpperCase() as UserRole;
  return ROLE_DASHBOARD_MAP[normalizedRole] || DEFAULT_AUTH_REDIRECT;
};

// Central allowlist extendable (add here when nuevas rutas seguras post-login existan)
const AUTH_ALLOWLIST = new Set<string>([
  '/profile',
  '/dashboard',
  '/security/2fa-settings',
  '/security/sessions',
  '/directory',
  '/clinical-profile'
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

