# LungLife Authentication Architecture

## 1. Objetivos

Unificar y robustecer la capa de autenticación eliminando duplicación y condiciones de carrera:

- Fuente única de estado y tokens (CoreAuthStore)
- Flujo 2FA explícito (pending vs enabled)
- Refresh de tokens proactivo + fallback reactivo 401
- ReturnUrl seguro (allowlist + saneamiento)
- Interceptor unificado (adjunta token, cola de refresh, reseteo consistente)
- Guards simples y deterministas
- Normalización uniforme del usuario

## 2. Capas y Responsabilidades

| Capa                 | Archivo / Carpeta                                                                         | Responsabilidad Clave                                    |
| -------------------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Core Store           | `auth/core/services/core-auth.store.ts`                                                   | Estado global, tokens, scheduler refresh, derivación 2FA |
| API / Estrategias    | `auth/core/services/application/auth-strategy-context.service.ts` y estrategias concretas | Ejecutar operaciones login/register/2FA/refresh          |
| Facade               | `auth/core/services/application/auth-facade.service.ts`                                   | Orquestación de estrategias → store; API simplificada UI |
| Interceptor          | `auth/core/interceptors/unified-auth.interceptor.ts`                                      | Attach token, manejar 401 con refresh concurrente        |
| Guards               | `auth/core/guards/*.ts`                                                                   | Control de acceso basado en estado síncrono / observable |
| Utils Navigación     | `auth/core/utils/auth-navigation.ts`                                                      | Resolución segura de post-auth redirect                  |
| Mapper User          | `auth/core/mappers/auth-user.mapper.ts`                                                   | Normalización consistente de campos backend → UI         |
| Documentación Flujos | `auth-flows.md`                                                                           | Secuencias (login, 2FA, refresh proactivo/reactivo)      |
| Inconsistencias      | `auth-inconsistencies.md`                                                                 | Backlog técnico / roadmap                                |

## 3. Modelo de Estado (CoreAuthStore)

Campos centrales (Subjects internos expuestos como Observables + getters sync):

- isAuthenticated
- loading / error
- user
- twoFAPending (usuario debe verificar código)
- twoFAEnabled (cuenta configurada con 2FA)
- sessionId
- refreshing (flag de operación de refresh proactiva en curso)

API síncrona para guards / interceptor:

- `isAuthenticatedSync()`
- `requiresTwoFASync()`
- `twoFAEnabledSync()`
- `getCurrentUserSync()`
- `getAccessTokenSync()` / `getRefreshTokenSync()`
- `resetAll()`

## 4. Flujo de 2FA

Estados separados:

- `twoFAPending = true` → Login aceptó credenciales pero requiere código adicional.
- Tras `verify2FA` exitoso → store aplica `isAuthenticated=true`, `twoFAPending=false`, deriva `twoFAEnabled` según usuario.
  Alias legacy: `requiresTwoFA$` para compatibilidad temporal.

## 5. Refresh de Tokens

### Proactivo

- Programado al aplicar un `AuthResult` con token válido.

- Cálculo: `fireIn = exp - now - leadTimeMs + jitter(0..jitterMs)` (mínimo 5s de salvaguarda).

- Configurable vía `AUTH_REFRESH_CONFIG`:
  
  ```ts
  export interface AuthRefreshConfig {
  leadTimeMs: number;
  jitterMs: number;
  maxProactiveRetries: number;
  retryDelayBaseMs: number;
  }
  ```

- Reintentos limitados (`maxProactiveRetries`). Si falla → no invalida sesión; se espera a flujo reactivo.

### Reactivo (Interceptor)

1. Request con 401 (no /auth/refresh) → inicia (o se cuelga de) ciclo de refresh.
2. Mientras refresca: otras peticiones 401 esperan en cola (`ReplaySubject`).
3. Éxito refresh → se reintenta la petición original(es) con nuevo token.
4. Falla refresh → `CoreAuthStore.resetAll()` y se propaga error.

## 6. Interceptor Unificado

Archivo: `unified-auth.interceptor.ts`
Responsabilidades:

- Adjuntar `Authorization: Bearer <token>` sólo a URLs que empiezan con `environment.apiUrl` y que no están en la exclusión auth.
- Cola concurrente de 401 mediante `ReplaySubject` + flag global `refreshInProgress`.
- Aislar refresh (no navegar ni hacer side-effects UI; sólo resetAll en caso terminal).

## 7. ReturnUrl Seguro

Función `resolvePostAuthRedirect(returnUrl?: string, defaultOverride?: string)`:
Reglas principales:

1. Null/empty → fallback
2. URL absoluta externa → fallback
3. Normaliza (prepone '/')
4. Allowlist explícita (`/profile`, `/dashboard`, etc.) retorna inmediatamente
5. Prefijos bloqueados (`/auth`) → fallback
6. Root `/` → fallback
7. Deep-link interno permitido si pasa validaciones previas

## 8. Normalización User

`normalizeUser` consolida campos snake_case → camelCase y rellena campos de perfil (firstName, lastName, phone, etc.). Deriva:

- `twoFAEnabled` desde `two_fa_enabled`
- `isEmailVerified` desde `email_verified`

## 9. Secuencia de Login (Resumen)

1. UI llama `authFacade.login(credentials)`
2. Estrategia retorna `AuthResult` → `store.applyAuthResult()`
3. `applyAuthResult` decide:
   - `pendingTwoFA` → no autentica aún.
   - `registerFlowSkipAuth` → no autentica.
   - Éxito → set tokens + user + schedule refresh.
4. Interfaz UI observa `requiresTwoFA$` y redirige a verificación si necesario.

Diagramas detallados en `auth-flows.md` (incluyendo refresco proactivo y verify2FA).

## 10. Manejo de Errores

- `applyAuthResult` con `success=false` conserva autenticación en falso y setea `error`.
- Interceptor 401 + refresh fallido: `resetAll()` → estado limpio.
- UI suscrita a `error$` para alertas.

## 11. Testing

### Archivos de pruebas clave

- `auth/core/utils/auth-navigation.spec.ts`
- `auth/core/core-auth.store.spec.ts`
- `auth/core/interceptors/unified-auth.interceptor.spec.ts`
- `auth/core/guards/auth.guard.spec.ts`

### Escenarios Cubiertos

| Área                    | Casos                                                                        |
| ----------------------- | ---------------------------------------------------------------------------- |
| Navigation              | allowlist, external URL, bloqueos `/auth`, root, deep-link, override         |
| Store (applyAuthResult) | éxito, 2FA pending, skip register, error, resetAll                           |
| Store (derivaciones)    | twoFAEnabled desde user.two_fa_enabled                                       |
| Refresh (scheduler)     | Programación y ejecución proactiva + reschedule tras éxito                   |
| Interceptor (reactivo)  | 401→refresh→retry, refresh fallido resetAll, cola concurrente single refresh |
| Guard                   | Autenticado vs no autenticado (UrlTree)                                      |

### Cómo Ejecutar Tests (Windows PowerShell)

```powershell
npm run test
```

Opcional: filtrar sólo auth (si configurado patrón Karma) lanzando watch e indicando patrón en UI. Si se desea añadir script especializado, se puede crear un script con `ng test --include 'src/app/auth/**/*.spec.ts'`.

## 12. Configuración & Extensibilidad

- Ajustar tiempos de refresh: proveer `AUTH_REFRESH_CONFIG` en algún módulo raíz.
- Añadir rutas post-login: extender `AUTH_ALLOWLIST` en `auth-navigation.ts`.
- Desacoplar persistencia tokens: reemplazar `localStorage` calls por adaptador (futuro: cookies httpOnly + CSRF tokens).
- Añadir estrategia social: implementar nueva clave en `AuthStrategyContext` y exponer método en `AuthFacadeService`.

## 13. Seguridad (Estado Actual / Futuro)

| Aspecto               | Actual             | Futuro Sugerido                                        |
| --------------------- | ------------------ | ------------------------------------------------------ |
| Almacenamiento tokens | localStorage       | Cookies httpOnly + Rotating Refresh + Sliding Sessions |
| XSS Defensa           | Ninguna explícita  | CSP + Sanitización inputs críticos + Trusted Types     |
| 2FA                   | pending vs enabled | Backup codes UI + Enforcement políticas                |
| Sesiones múltiples    | API para revocar   | Límite concurrente + detección anomalías               |

## 14. Roadmap (Ver Detalle en `auth-inconsistencies.md`)

Prioridades próximas:

1. Extraer API pura (separar AdvancedAuthService transicional en cliente REST tipado)
2. Guard específico para `twoFAPending`
3. Hardening refresh (umbral mínimo de exp antes de disparar proactivo → skip si token corto)
4. Métricas/telemetría (tiempos de refresh, ratio fallos)
5. Migrar a cookies seguras

## 15. Quick Reference (Cheat Sheet)

| Acción             | Método                                |
| ------------------ | ------------------------------------- |
| Login              | `authFacade.login(credentials)`       |
| Verificar 2FA      | `authFacade.verify2FA({ code })`      |
| Logout             | `authFacade.logout()`                 |
| Estado rápido auth | `coreAuthStore.isAuthenticatedSync()` |
| Token actual       | `coreAuthStore.getAccessTokenSync()`  |
| Forzar reset       | `coreAuthStore.resetAll()`            |

## 16. Preguntas Frecuentes

**¿Por qué separar twoFAPending de twoFAEnabled?** Para diferenciar el flujo transitorio de verificación del estado permanente de seguridad de la cuenta, evitando ambigüedad lógica en UI y guards.

**¿Qué pasa si el refresh proactivo falla?** No se invalida sesión; se espera a una petición real que reciba 401 para intentar refresh reactivo y, si también falla, limpiar sesión.

**¿Dónde agregar una nueva ruta protegida post-auth?** Simplemente usar el guard principal y, si es destino inmediato tras login, considerar añadirla al allowlist para retorno directo.

## 17. Mantenimiento

- Mantener pruebas sincronizadas ante cambios de contratos (`AuthResult`, shape user)
- Revisar periodicidad de leadTime según duración real tokens del backend
- Auditar dependencias de seguridad (npm audit / Snyk) trimestral

---

Última actualización: (auto)
