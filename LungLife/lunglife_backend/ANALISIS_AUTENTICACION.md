# 🔐 Análisis del Estado Actual de Autenticación - LungLife Backend

**Fecha de Análisis:** 18 de enero de 2026  
**Versión del Backend:** 1.0.0  
**Arquitectura:** Clean Architecture + Node.js + TypeScript + Express

---

## 📋 Resumen Ejecutivo

El backend de LungLife cuenta con un **sistema de autenticación parcialmente implementado** siguiendo principios de Clean Architecture. La implementación actual cubre las funcionalidades básicas de autenticación, pero tiene algunas características avanzadas pendientes de desarrollo.

### Estado General: ⚠️ **FUNCIONAL CON MEJORAS PENDIENTES**

- ✅ **Implementado y Funcional:** 70%
- ⚠️ **Parcialmente Implementado:** 20%
- ❌ **No Implementado:** 10%

---

## ✅ 1. Funcionalidades IMPLEMENTADAS

### 1.1 Autenticación Básica ✅

#### **Registro de Usuarios** (`POST /api/auth/register`)

- ✅ Validación de datos de entrada
- ✅ Soporte para campos en español e inglés (nombre/firstName, apellido/lastName)
- ✅ Validación de email
- ✅ Validación de contraseña (mínimo 8 caracteres)
- ✅ Hash de contraseñas con bcrypt (12 rounds)
- ✅ Aceptación de términos y condiciones (obligatorio)
- ✅ Aceptación de políticas de privacidad (obligatorio)
- ✅ Consentimiento de marketing (opcional)
- ✅ Generación de token JWT al registrar
- ✅ Prevención de duplicados de email
- ✅ Logging detallado de intentos de registro

**Endpoint:** `/api/auth/register`  
**Controller:** `AuthController.register()` (Clean Architecture v2)  
**Service:** `AuthenticationService.registerUser()`

#### **Login de Usuarios** (`POST /api/auth/login`)

- ✅ Validación de credenciales (email + password)
- ✅ Verificación de contraseña con bcrypt
- ✅ Generación de Access Token (JWT)
- ✅ Generación de Refresh Token (JWT)
- ✅ Soporte para "Remember Me"
- ✅ Actualización de último login
- ✅ Tracking de IP y User Agent
- ✅ Logging de intentos de login
- ✅ Manejo de cuentas bloqueadas (423 status)
- ✅ Control de intentos fallidos

**Endpoint:** `/api/auth/login`  
**Controller:** `AuthController.login()`  
**Service:** `AuthenticationService.loginUser()`

#### **Refresh Token** (`POST /api/auth/refresh`)

- ✅ Renovación de access token usando refresh token
- ✅ Validación de refresh token
- ✅ Generación de nuevos tokens (access + refresh)
- ✅ Manejo de tokens expirados
- ✅ Validación de issuer y audience

**Endpoint:** `/api/auth/refresh`  
**Controller:** `AuthController.refresh()`  
**Service:** `AuthenticationService.refreshTokens()`

### 1.2 Recuperación de Contraseña ✅

#### **Forgot Password** (`POST /api/auth/forgot-password`)

- ✅ Validación de email
- ✅ Generación de token de reseteo seguro (UUID v4 + random hex)
- ✅ Almacenamiento de token en base de datos
- ✅ Expiración de token (1 hora)
- ✅ Logging de solicitudes
- ✅ Respuesta consistente (previene email enumeration)

**Endpoint:** `/api/auth/forgot-password`  
**Controller:** `AuthController.forgotPassword()`  
**Service:** `AuthenticationService.forgotPassword()`

⚠️ **Nota:** Actualmente devuelve el token en la respuesta para testing. En producción debe enviarse por email.

#### **Reset Password** (`POST /api/auth/reset-password`)

- ✅ Validación de token de reseteo
- ✅ Verificación de expiración del token
- ✅ Validación de nueva contraseña (mínimo 8 caracteres)
- ✅ Hash de nueva contraseña
- ✅ Actualización de contraseña en base de datos
- ✅ Invalidación de token después de uso
- ✅ Logging de reseteos exitosos y fallidos

**Endpoint:** `/api/auth/reset-password`  
**Controller:** `AuthController.resetPassword()`  
**Service:** `AuthenticationService.resetPassword()`

### 1.3 Seguridad Implementada ✅

#### **JWT (JSON Web Tokens)**

```typescript
// Configuración JWT
{
  accessTokenSecret: process.env.JWT_SECRET || 'lunglife_jwt_secret',
  refreshTokenSecret: process.env.JWT_REFRESH_SECRET || 'lunglife_refresh_secret',
  accessTokenExpiry: '15m',
  refreshTokenExpiry: '7d',
  issuer: 'LungLife-API',
  audience: 'LungLife-Web'
}
```

- ✅ Access Token: 15 minutos de expiración
- ✅ Refresh Token: 7 días de expiración
- ✅ Validación de issuer y audience
- ✅ Payload incluye: userId, email, tipo de usuario

#### **Hashing de Contraseñas**

- ✅ Bcrypt con 12 rounds (configurable)
- ✅ Salting automático
- ✅ Verificación segura de contraseñas

#### **Middleware de Autenticación** (`src/core/middleware.ts`)

- ✅ `AuthMiddleware.authenticateToken()` - Autenticación obligatoria
- ✅ `AuthMiddleware.optionalAuthenticate()` - Autenticación opcional
- ✅ Extracción de token del header Authorization (Bearer)
- ✅ Validación de token JWT
- ✅ Manejo de errores específicos:
  - `TOKEN_MISSING` (401)
  - `TOKEN_EXPIRED` (401)
  - `TOKEN_INVALID` (401)
- ✅ Adjunta información del usuario a `req.user`

#### **Validación de Datos**

- ✅ Email format validation (regex)
- ✅ Password strength validation (mínimo 8 caracteres)
- ✅ Validación de campos requeridos
- ✅ Validación con Zod en middleware (disponible)

#### **Rate Limiting**

```typescript
// RateLimitMiddleware
- maxAttempts: 5 intentos
- windowMs: 15 minutos
- Retorna 429 Too Many Requests cuando se excede
```

#### **Seguridad Adicional**

- ✅ CORS configurado (localhost permitido)
- ✅ Security Headers (X-Frame-Options, X-Content-Type-Options, etc.)
- ✅ Logging de actividad sospechosa
- ✅ Prevención de SQL Injection (prepared statements)
- ✅ Manejo de errores centralizado

### 1.4 Base de Datos ✅

#### **Tabla `users`**

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  nombre VARCHAR(100),
  apellido VARCHAR(100),
  telefono VARCHAR(20),
  email_verified BOOLEAN DEFAULT FALSE,
  accept_terms BOOLEAN DEFAULT FALSE,
  accept_privacy BOOLEAN DEFAULT FALSE,
  marketing_consent BOOLEAN DEFAULT FALSE,
  last_login TIMESTAMP,
  failed_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMP,
  reset_token VARCHAR(255),
  reset_token_expires TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Campos para perfiles extendidos
  role VARCHAR(20) DEFAULT 'patient',
  profile_completed BOOLEAN DEFAULT FALSE,
  specialty VARCHAR(100),
  license_number VARCHAR(50),
  institution VARCHAR(255)
);
```

#### **Tablas Complementarias**

- ✅ `user_profiles` - Información extendida de salud
- ✅ `risk_assessments` - Evaluaciones de riesgo
- ✅ `health_metrics` - Métricas de salud tracking
- ✅ `role_permissions` - Matriz de permisos RBAC

#### **Repositorio de Usuarios** (`UserRepository`)

Métodos implementados:

- ✅ `findById(id)` - Buscar por ID
- ✅ `findByEmail(email)` - Buscar por email
- ✅ `findAll()` - Listar todos
- ✅ `create(user)` - Crear usuario
- ✅ `update(id, userData)` - Actualizar usuario
- ✅ `delete(id)` - Eliminar usuario
- ✅ `emailExists(email)` - Verificar si email existe
- ✅ `updateLastLogin(userId, ip)` - Actualizar último login
- ✅ `incrementFailedAttempts(userId)` - Incrementar intentos fallidos
- ✅ `resetFailedAttempts(userId)` - Resetear intentos fallidos
- ✅ `lockUser(userId, lockUntil)` - Bloquear usuario
- ✅ `findActiveUsers()` - Buscar usuarios activos

### 1.5 Logging y Monitoreo ✅

#### **Logger Service**

- ✅ Logging de todas las operaciones de autenticación
- ✅ Niveles de log: info, warn, error
- ✅ Información contextual (email, IP, user agent)
- ✅ Medición de duración de operaciones
- ✅ Logging de errores con stack traces

#### **Health Check** (`GET /api/health`)

- ✅ Estado de conexión a base de datos
- ✅ Métricas de conexión
- ✅ Timestamp de respuesta

### 1.6 Arquitectura y Patrones ✅

#### **Clean Architecture**

```
src/
├── controllers/           # Capa de presentación
│   └── auth.controller.v2.ts
├── core/
│   ├── services/         # Capa de aplicación
│   │   └── authentication.service.ts
│   ├── infrastructure/   # Capa de infraestructura
│   │   ├── repositories/
│   │   │   └── user.repository.ts
│   │   └── database/
│   ├── interfaces/       # Contratos
│   └── middleware.ts     # Middlewares
└── routes/              # Routing
    └── auth.routes.ts
```

#### **Dependency Injection**

- ✅ DatabaseServiceFactory (Singleton)
- ✅ Inyección de dependencias en servicios
- ✅ Repository Pattern
- ✅ Unit of Work Pattern

---

## ⚠️ 2. Funcionalidades PARCIALMENTE IMPLEMENTADAS

### 2.1 Logout ⚠️

**Estado:** Endpoint comentado, no implementado

```typescript
// auth.routes.ts, línea 202
// Note: Logout endpoint not implemented in v2 architecture
```

**Pendiente:**

- ❌ Endpoint `/api/auth/logout`
- ❌ Invalidación de refresh tokens
- ❌ Blacklist de tokens (opcional)
- ❌ Limpieza de sesiones activas

**Recomendación:** Implementar logout con invalidación de refresh token en base de datos.

### 2.2 Email Notifications ⚠️

**Estado:** Configuración presente, envío no implementado

```typescript
// Configuración de email presente en config.ts
email: {
  host: 'smtp.gmail.com',
  port: 587,
  user: '',
  password: '',
  from: 'noreply@lunglife.com',
  templates: {
    welcome: 'welcome.html',
    passwordReset: 'password-reset.html',
    twoFAEnabled: '2fa-enabled.html'
  }
}
```

**Pendiente:**

- ❌ Envío de email de bienvenida al registrar
- ❌ Envío de email con link de reset password
- ❌ Plantillas HTML de emails
- ⚠️ Actualmente devuelve el reset token en la respuesta JSON (solo para testing)

**Dependencias instaladas:**

- ✅ `nodemailer` (v7.0.6)
- ✅ `@types/nodemailer`

### 2.3 Verificación de Email ⚠️

**Estado:** Campo en base de datos, flujo no implementado

```sql
-- Campo en users table
email_verified BOOLEAN DEFAULT FALSE
```

**Pendiente:**

- ❌ Generación de token de verificación
- ❌ Endpoint para verificar email
- ❌ Envío de email con link de verificación
- ❌ Restricción de acceso para usuarios no verificados

### 2.4 Control de Sesiones ⚠️

**Estado:** Tracking básico implementado, gestión avanzada pendiente

**Implementado:**

- ✅ Tracking de último login
- ✅ Registro de IP y User Agent

**Pendiente:**

- ❌ Tabla de sesiones activas
- ❌ Listado de dispositivos activos
- ❌ Cerrar sesión en otros dispositivos
- ❌ Detección de acceso sospechoso

---

## ❌ 3. Funcionalidades NO IMPLEMENTADAS

### 3.1 Autenticación de Dos Factores (2FA) ❌

**Estado:** Preparado para implementación, totalmente pendiente

```typescript
// auth.routes.ts
// ========== 2FA ROUTES ==========
// Note: 2FA endpoints omitted in this minimal setup
// POST /api/auth/2fa/setup
// POST /api/auth/2fa/verify
// POST /api/auth/2fa/disable
```

**Dependencias instaladas:**

- ✅ `speakeasy` (v2.0.0) - TOTP generation
- ✅ `qrcode` (v1.5.4) - QR code generation
- ✅ `@types/speakeasy`
- ✅ `@types/qrcode`

**Pendiente:**

- ❌ Endpoint de configuración de 2FA
- ❌ Generación de secreto TOTP
- ❌ Generación de QR code
- ❌ Endpoint de verificación de código 2FA
- ❌ Endpoint para deshabilitar 2FA
- ❌ Almacenamiento de secreto 2FA en base de datos
- ❌ Códigos de backup de emergencia

### 3.2 OAuth / Social Login ❌

**Estado:** No implementado

**Pendiente:**

- ❌ Google OAuth
- ❌ Facebook Login
- ❌ Apple Sign In
- ❌ Configuración de providers
- ❌ Linking de cuentas

### 3.3 Perfiles de Usuario Extendidos ❌

**Estado:** Esquema de base de datos presente, lógica no implementada

```typescript
// auth.routes.ts, línea 244
// TODO: Implement getProfile method in AuthController
// router.get('/user/profile', AuthController.getProfile);
```

**Esquemas de BD creados:**

- ✅ `user_profiles` table
- ✅ `role_permissions` table
- ✅ `user_profile_summary` view

**Pendiente:**

- ❌ Endpoint para obtener perfil (`GET /api/auth/user/profile`)
- ❌ Endpoint para actualizar perfil
- ❌ Gestión de roles (patient, health_professional, admin, researcher)
- ❌ Control de acceso basado en roles (RBAC)
- ❌ Completar perfil obligatorio

### 3.4 Auditoría y Compliance ❌

**Pendiente:**

- ❌ Tabla de audit logs
- ❌ Registro de todos los accesos
- ❌ Registro de cambios de datos sensibles
- ❌ Exportación de datos de usuario (GDPR)
- ❌ Eliminación de cuenta (GDPR)
- ❌ Historial de contraseñas

---

## 🔧 4. Configuración Actual

### 4.1 Variables de Entorno

**Archivo:** `.env` (No encontrado en el proyecto)

**Variables esperadas:**

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=lunglife_db
DB_USER=postgres
DB_PASSWORD=336911

# JWT
JWT_SECRET=lunglife_jwt_secret
JWT_REFRESH_SECRET=lunglife_refresh_secret
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Security
BCRYPT_ROUNDS=12
RATE_LIMIT_MAX_ATTEMPTS=5

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=
EMAIL_PASSWORD=
EMAIL_FROM=noreply@lunglife.com

# Server
PORT=3002
NODE_ENV=development
```

⚠️ **Recomendación:** Crear archivo `.env` con valores de configuración.

### 4.2 Dependencias Instaladas

```json
{
  "dependencies": {
    "axios": "^1.12.2",
    "bcrypt": "^5.1.1",           // ✅ Hashing
    "cors": "^2.8.5",             // ✅ CORS
    "dotenv": "^16.6.1",          // ✅ Config
    "express": "^4.18.2",         // ✅ Server
    "jsonwebtoken": "^9.0.2",     // ✅ JWT
    "nodemailer": "^7.0.6",       // ⚠️ Email (no usado)
    "pg": "^8.16.3",              // ✅ PostgreSQL
    "qrcode": "^1.5.4",           // ❌ 2FA (no usado)
    "speakeasy": "^2.0.0",        // ❌ 2FA (no usado)
    "uuid": "^13.0.0",            // ✅ Token generation
    "validator": "^13.15.15",     // ✅ Validation
    "zod": "^4.1.9"               // ✅ Schema validation
  }
}
```

---

## 🧪 5. Testing

### 5.1 Scripts de Testing Disponibles

```json
{
  "test": "jest",
  "test:watch": "jest --watch",
  "test:coverage": "jest --coverage",
  "test:verbose": "jest --verbose",
  "test:auth": "ts-node src/scripts/complete_auth_test.ts",
  "test:registration": "ts-node src/scripts/test_registration_http.ts",
  "test:forgot-password": "ts-node src/scripts/test_forgot_password.ts"
}
```

### 5.2 Estado de Testing

- ✅ Scripts de testing manual creados
- ⚠️ Tests unitarios con Jest no implementados
- ❌ Tests de integración pendientes
- ❌ Coverage reportes pendientes

---

## 📊 6. Endpoints Disponibles

### Autenticación Básica

| Método | Endpoint             | Estado            | Autenticación |
| ------ | -------------------- | ----------------- | ------------- |
| POST   | `/api/auth/register` | ✅ Funcional       | No requerida  |
| POST   | `/api/auth/login`    | ✅ Funcional       | No requerida  |
| POST   | `/api/auth/refresh`  | ✅ Funcional       | No requerida  |
| POST   | `/api/auth/logout`   | ❌ No implementado | Requerida     |

### Recuperación de Contraseña

| Método | Endpoint                    | Estado       | Autenticación |
| ------ | --------------------------- | ------------ | ------------- |
| POST   | `/api/auth/forgot-password` | ✅ Funcional* | No requerida  |
| POST   | `/api/auth/reset-password`  | ✅ Funcional  | No requerida  |

*Devuelve token en respuesta (solo para testing)

### 2FA (Preparado, no implementado)

| Método | Endpoint                | Estado            | Autenticación |
| ------ | ----------------------- | ----------------- | ------------- |
| POST   | `/api/auth/2fa/setup`   | ❌ No implementado | Requerida     |
| POST   | `/api/auth/2fa/verify`  | ❌ No implementado | No requerida  |
| POST   | `/api/auth/2fa/disable` | ❌ No implementado | Requerida     |

### Perfil de Usuario

| Método | Endpoint                 | Estado            | Autenticación |
| ------ | ------------------------ | ----------------- | ------------- |
| GET    | `/api/auth/user/profile` | ❌ No implementado | Requerida     |
| PUT    | `/api/auth/user/profile` | ❌ No implementado | Requerida     |

### Health & Monitoring

| Método | Endpoint      | Estado      | Autenticación |
| ------ | ------------- | ----------- | ------------- |
| GET    | `/api/health` | ✅ Funcional | No requerida  |
| GET    | `/api/test`   | ✅ Funcional | No requerida  |

---

## 🔒 7. Evaluación de Seguridad

### Fortalezas ✅

1. **Hashing seguro de contraseñas** (bcrypt con 12 rounds)
2. **JWT con expiración apropiada** (15m access, 7d refresh)
3. **Validación de datos de entrada**
4. **Rate limiting** implementado
5. **Security headers** configurados
6. **CORS** configurado apropiadamente
7. **Logging completo** de actividades
8. **Control de intentos fallidos** y bloqueo de cuentas
9. **Tokens de reset seguros** (UUID + random + expiración)
10. **Arquitectura limpia** con separación de responsabilidades

### Debilidades / Áreas de Mejora ⚠️

1. **Falta 2FA** - No hay autenticación de dos factores
2. **Email no verificado** - Usuarios pueden usar emails falsos
3. **Sin blacklist de tokens** - Tokens no se pueden invalidar antes de expirar
4. **Secrets hardcodeados** - JWT secrets tienen valores por defecto inseguros
5. **Sin auditoría completa** - Falta tabla de audit logs
6. **Reset password token en respuesta** - Debería enviarse solo por email
7. **Sin rotación de refresh tokens** - Mismo refresh token se usa múltiples veces
8. **Falta validación de fuerza de contraseña** - Solo valida longitud mínima
9. **Sin rate limiting granular** - Rate limit global, no por usuario/endpoint
10. **Falta CSRF protection** - No hay tokens CSRF

### Riesgos Identificados 🚨

| Riesgo                            | Nivel | Mitigación Actual | Recomendación             |
| --------------------------------- | ----- | ----------------- | ------------------------- |
| Secrets expuestos en código       | Alto  | Ninguna           | Usar variables de entorno |
| Token disclosure (reset password) | Medio | Logging           | Enviar solo por email     |
| No verificación de email          | Medio | Ninguna           | Implementar verificación  |
| Sin 2FA                           | Medio | Ninguna           | Implementar 2FA           |
| Token no revocable                | Bajo  | Expiración corta  | Implementar blacklist     |
| Falta CSRF                        | Bajo  | SameSite cookies  | Implementar tokens CSRF   |

---

## 💡 8. Recomendaciones Prioritarias

### Alta Prioridad 🔴

1. **Crear archivo `.env` con secrets seguros**
   
   - Generar JWT secrets aleatorios fuertes
   - Configurar credenciales de base de datos
   - Configurar credenciales de email

2. **Implementar envío de emails**
   
   - Email de bienvenida al registrar
   - Email con link de reset password
   - Remover reset token de respuesta JSON

3. **Implementar verificación de email**
   
   - Generar token de verificación
   - Endpoint de verificación
   - Restricción para usuarios no verificados

4. **Implementar logout**
   
   - Invalidar refresh tokens
   - Tabla de tokens revocados o blacklist

5. **Mejorar validación de contraseñas**
   
   - Validar mayúsculas, minúsculas, números
   - Validar contra diccionarios comunes
   - Implementar pwned passwords check

### Media Prioridad 🟡

6. **Implementar 2FA**
   
   - Setup de TOTP con QR code
   - Verificación de código 2FA
   - Códigos de backup

7. **Implementar gestión de perfiles**
   
   - Endpoint para obtener perfil
   - Endpoint para actualizar perfil
   - Control de acceso basado en roles (RBAC)

8. **Mejorar logging y auditoría**
   
   - Tabla de audit logs completa
   - Tracking de cambios en datos sensibles
   - Dashboard de auditoría

9. **Implementar gestión de sesiones**
   
   - Tabla de sesiones activas
   - Listar dispositivos activos
   - Cerrar sesión en otros dispositivos

10. **Tests automatizados**
    
    - Tests unitarios con Jest
    - Tests de integración
    - Coverage reports

### Baja Prioridad 🟢

11. **OAuth / Social Login**
    
    - Google
    - Facebook
    - Apple

12. **GDPR Compliance**
    
    - Exportar datos de usuario
    - Eliminar cuenta
    - Consentimiento granular

13. **Features avanzados**
    
    - Detección de acceso sospechoso
    - Alertas de seguridad
    - Historial de contraseñas

---

## 📈 9. Roadmap Sugerido

### Sprint 1: Fundamentos de Seguridad (1 semana)

- [ ] Configurar `.env` con secrets seguros
- [ ] Implementar envío de emails
- [ ] Implementar verificación de email
- [ ] Implementar logout
- [ ] Tests básicos de autenticación

### Sprint 2: Mejoras de Seguridad (1 semana)

- [ ] Mejorar validación de contraseñas
- [ ] Implementar 2FA
- [ ] Implementar blacklist de tokens
- [ ] Auditoría completa
- [ ] Tests de seguridad

### Sprint 3: Gestión de Usuarios (1 semana)

- [ ] Endpoints de perfil
- [ ] RBAC completo
- [ ] Gestión de sesiones
- [ ] Dashboard de usuario
- [ ] Tests de integración

### Sprint 4: Features Avanzados (1 semana)

- [ ] OAuth / Social Login
- [ ] GDPR compliance
- [ ] Detección de anomalías
- [ ] Documentación completa
- [ ] Tests end-to-end

---

## 🎯 10. Conclusión

El sistema de autenticación de LungLife Backend está **funcionalmente implementado** con las características básicas necesarias para un MVP. La arquitectura sigue principios SOLID y Clean Architecture, lo que facilita la extensibilidad y mantenimiento.

**Puntos fuertes:**

- ✅ Arquitectura limpia y escalable
- ✅ Seguridad básica robusta (JWT, bcrypt, rate limiting)
- ✅ Logging y monitoreo implementado
- ✅ Fundamentos sólidos para expansión

**Áreas críticas de mejora:**

- 🔴 Implementar envío de emails
- 🔴 Configurar secrets de producción
- 🔴 Implementar verificación de email
- 🔴 Implementar logout con invalidación de tokens

**Estado de producción:**  
⚠️ **NO LISTO PARA PRODUCCIÓN SIN:**

1. Secrets seguros (no hardcodeados)
2. Envío de emails funcional
3. Verificación de email
4. 2FA (recomendado para datos médicos)
5. Auditoría completa
6. Tests automatizados

**Tiempo estimado para producción:** 3-4 semanas siguiendo el roadmap sugerido.

---

**Preparado por:** Antigravity AI  
**Fecha:** 18 de enero de 2026  
**Versión del documento:** 1.0
