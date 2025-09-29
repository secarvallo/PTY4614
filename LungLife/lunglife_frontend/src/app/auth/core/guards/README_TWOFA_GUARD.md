# TwoFAPendingGuard (DEPRECATED)

> Ahora la verificación de 2FA pendiente está integrada directamente en `unifiedAuthGuard`. Este guard se mantiene sólo para compatibilidad temporal y será removido en una limpieza futura.

## Motivación
- Evitar que un usuario parcialmente autenticado (login base sin completar 2FA) llegue a `dashboard`, `profile`, etc.
- Mantener la lógica simple y sin suscripción a observables (usa API síncrona del `CoreAuthStore`).
- Encadenable después del guard de autenticación base (`AuthGuard` o `unifiedAuthGuard`).

## Lógica
| Condición | Resultado |
|----------|-----------|
| `CoreAuthStore.requiresTwoFASync() === true` | Redirect `UrlTree` -> `/auth/verify-2fa` |
| En caso contrario | `true` (permite continuar) |

## Uso en Rutas (Nuevo Patrón)
Usa únicamente `unifiedAuthGuard` (ya redirige a `/auth/verify-2fa` si el estado es pending):
```ts
{ path: 'dashboard', canActivate: [unifiedAuthGuard], loadComponent: ... }
```

Pantalla de verificación:
```ts
{ path: 'auth/verify-2fa', canActivate: [unifiedTwoFAGuard], loadComponent: ... }
```

### Patrón Antiguo (Evitar en nuevo código)
```ts
import { TwoFAPendingGuard } from './auth/core/guards/twofa-pending.guard';
import { AuthGuard } from './auth/core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'dashboard',
    canActivate: [AuthGuard, TwoFAPendingGuard],
    loadComponent: () => import('./dashboard/dashboard.page').then(m => m.DashboardPage)
  }
];
```

Si ya usas guards unificados (`unifiedAuthGuard` + `unifiedTwoFAGuard`), este guard puede servir como fallback explícito o para módulos aislados.

## Patrón Adoptado
- API síncrona del store evita hopping de streams en guards.
- El guard es idempotente (evaluación rápida, sin efectos secundarios).
- Redirección declarativa vía `router.parseUrl()`.

## Test Cases Cubiertos
1. 2FA pendiente => retorna `UrlTree('/auth/verify-2fa')`.
2. 2FA verificada / no pendiente => retorna `true`.

## Futuras Extensiones (aplicar sobre unifiedAuthGuard)
1. Tracking / Telemetría cuando se bloquea por 2FA pendiente.
2. Parametrizar método: `/auth/verify-2fa?method=totp`.
3. Interstitial UX (modal) antes de redirigir.

## Ejemplo en un Componente
```ts
// En un componente protegido puedes asumir 2FA ya verificado:
constructor(private store: CoreAuthStore) {
  // twoFAEnabledSync() puede usarse para mostrar badge de seguridad
  const twoFAEnabled = this.store.twoFAEnabledSync();
}
```

## Referencias
- `unifiedAuthGuard` (lógica consolidada)
- `unifiedTwoFAGuard` (ruta de verificación)
- `CoreAuthStore.requiresTwoFASync()` / `twoFAEnabledSync()`
