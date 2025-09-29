# Catálogo de Inconsistencias y Oportunidades de Mejora (Auth)

> Fecha: 2025-09-29  
> Alcance: Estado tras completar refactors de 2FA y refresh proactivo (Task 16 & 17).

---
## 1. Naming / Payload

| Área | Observado | Problema | Acción Propuesta | Prioridad |
|------|-----------|----------|------------------|-----------|
| 2FA flags usuario | `two_fa_enabled` vs `twoFAEnabled` | Doble convención snake/camel | Normalizar al entrar en mapper → ya aplicado; documentar propiedad única pública `twoFAEnabled` | Media |
| 2FA flujo login | Uso `requiresTwoFA` y nuevo `twoFAPending` | Ambigüedad temporal mientras ambos existen | Deprecar `requiresTwoFA$` tras migrar componentes restantes | Media |
| Campos fecha usuario | `created_at`, `updated_at`, `last_login` vs `createdAt` etc. | Duplicados y mezcla | Mapper ya traduce; añadir tests para garantizar cobertura | Baja |
| Verificación email | `email_verified` vs `isEmailVerified` | Inconsistencia naming boolean | Mapper traduce; documentar convención `is*` | Baja |
| SessionId persistencia | localStorage key `lunglife_session_id` sin namespacing en env | Hardcoded; riesgo colisión si multi-app | Introducir prefix configurable (p.ej. en environment.auth.sessionKey) | Baja |
| Token keys | `lunglife_access_token`, `lunglife_refresh_token` | Hardcoded en varias capas externas | Centralizar en environment.auth.* (parcial) y remover lecturas directas fuera del store | Alta |
| DeviceId key | `lunglife_device_id` accedida directo en store | Acoplamiento API -> storage | Crear helper `deviceStorage.getId()` (inyección) | Media |

---
## 2. ReturnUrl / Navegación

| Observado | Riesgo | Caso Edge | Acción | Prioridad |
|-----------|--------|----------|--------|-----------|
| Solo query param `returnUrl` | Usuario lo edita o se pierde tras redirect intermedio | Deep link externo | Guardar backup en `sessionStorage` (`last_protected_route`) | Media |
| No expiración del returnUrl guardado | Uso obsoleto en otra sesión | Token caducado + reopen | Limpiar en logout y tras uso | Baja |
| Fallback único (PROFILE) | UX limitada si usuario esperaba volver a subruta | Multi-tab | Permitir tabla de rutas por rol (opcional) | Baja |

---
## 3. Refresh Tokens

| Observado | Riesgo | Acción | Prioridad |
|-----------|--------|--------|-----------|
| Falta diferenciación error red vs token inválido | Logout evitables | Inspeccionar payload backend: si `error_code === 'invalid_token'` invalidar; si network → reintentar | Alta |
| Interceptor siempre intenta refresh ante cualquier 401 (except refresh endpoint) | 401 no necesariamente exp (p.ej. permiso) | Podría generar refresh innecesario | Añadir heurística: si header `WWW-Authenticate` indica `expired` o clock skew | Media |
| No hay métrica/telemetría de intentos | Dificultad monitoreo | Contador simple en logger/MetricService futuro | Baja |

---
## 4. 2FA

| Observado | Riesgo | Acción | Prioridad |
|-----------|--------|--------|-----------|
| Guard específico 2FA aún no implementado | Acceso a rutas sin haber completado verificación (si UI navega manual) | Inconsistencia seguridad | Crear `twoFaPendingGuard` usando store.twoFAPendingSync() | Alta |
| Setup 2FA vs Verify 2FA mezclados en AdvancedAuthService | Aumenta superficie de mantenimiento | Extraer a `two-fa-api.service.ts` | Media |

---
## 5. AdvancedAuthService / API Layer

| Observado | Riesgo | Acción | Prioridad |
|-----------|--------|--------|-----------|
| Servicio mezcla endpoints heterogéneos (sessions, 2FA, logout, login transitional) | Violación SRP | Crear `auth-api.service.ts` y `two-fa-api.service.ts` | Media |
| Persisten referencias legacy a métodos ya delegados | Confusión en refactors futuros | Eliminar métodos wrapper obsoletos tras confirmar no usados | Media |

---
## 6. Estado / Store

| Observado | Riesgo | Acción | Prioridad |
|-----------|--------|--------|-----------|
| Falta flag de "bootstrapLoading" separado | UI no distingue entre cold-start y simple idle | Flicker inicial | Añadir `bootstrapLoading$` y set en bootstrapSession() | Baja |
| `refreshing$` sólo refleja proactivo | Reactivo (401) no marcado | Difícil mostrar spinner global consistente | Integrar interceptor para set/unset al usar refresh reactivo | Media |

---
## 7. Tests Ausentes (Gap)

| Área | Casos Críticos | Acción | Prioridad |
|------|---------------|--------|-----------|
| applyAuthResult | 2FA pending→enabled, register skipAuth, error branch | Crear spec store | Alta |
| returnUrl helper | XSS (javascript:), rutas no allowlist, slash edge | Spec navigation | Alta |
| scheduler refresh | No reprograma si falta exp, reprograma tras refresh | Spec store | Media |
| interceptor refresh | Cola concurrente, fallo refresh → resetAll | Spec interceptor (si factible) | Media |

---
## 8. Seguridad / Hardening

| Observado | Riesgo | Acción | Prioridad |
|-----------|--------|--------|-----------|
| Tokens en localStorage | Susceptible a XSS | Mitigaciones faltantes | Investigar migrar a cookies httpOnly + ROTATE endpoints | Alta (estratégica) |
| Falta Content-Security-Policy documentada | Incrementa vector XSS | Defecto config | Añadir CSP recomendada en docs | Media |
| No hay throttling UI para 2FA verify | Fuerza bruta cliente | Abuso | Añadir lock temporal tras N intentos fallo en estado local | Baja |

---
## 9. Observabilidad

| Observado | Riesgo | Acción | Prioridad |
|-----------|--------|--------|-----------|
| Logger no taggea sessionId en cada evento auth | Dificultad de correlación | Wrap logger child con sessionId context | Baja |
| Sin métricas de refresh ratios | Opacidad caducidad tokens | Exposición a sorpresas | Añadir contadores simple (in-memory) y exponer en dev tools panel | Baja |

---
## 10. Migración Pendiente

| Punto | Estado | Acción | Prioridad |
|-------|--------|--------|-----------|
| Deprecación `requiresTwoFA$` | En uso parcial | Marcar @deprecated JSDoc y plan remover | Media |
| Extraer API Layer limpio | No iniciado | Crear `auth-api.service.ts` | Media |
| Documentar config refresh | Parcial (auth-flows #17) | Añadir a README_AUTH.md final | Media |

---
## 11. Roadmap Recomendado (Post Task 6)

1. Implementar guard 2FA pendiente.
2. Crear tests Alta prioridad (applyAuthResult, returnUrl helper).
3. Deprecar `requiresTwoFA$` en fachada y componentes.
4. Extraer servicios API dedicados (auth + twoFA + sessions).
5. README_AUTH.md consolidado (incluir tabla de config y matriz de estados).
6. Evaluar estrategia de almacenamiento tokens (corto plazo mitigaciones XSS: CSP, sanitizer agresivo, auditoría dependencias UI).

---
## 12. Notas de Cierre

Este catálogo sirve como lista base para tareas futuras (issues). Cada fila debería transformarse en un ticket con etiqueta (prio, tipo: refactor, bug, enhancement, security). Mantener este archivo sincronizado tras cada cambio mayor.

