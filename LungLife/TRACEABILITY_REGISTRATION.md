# 📊 Trazabilidad de Registro de Usuario - LungLife

## 🎯 Resumen Ejecutivo
Documentación completa del flujo de registro de usuario desde el frontend hasta la base de datos PostgreSQL, incluyendo validaciones, transformaciones de datos y logs de auditoría.

---

## 📋 Flujo Completo de Registro

### 1️⃣ FRONTEND - Formulario de Registro
**Archivo**: `lunglife_frontend/src/app/auth/login/pages/register/register.page.ts`

#### Campos del Formulario:
```typescript
registerForm = {
  nombre: string,           // Campo obligatorio (firstName en backend)
  apellido: string,         // Campo opcional (lastName en backend)
  email: string,            // Campo obligatorio
  telefono: string,         // Campo opcional (phone en backend)
  password: string,         // Campo obligatorio (min 8 caracteres)
  confirmPassword: string,  // Campo obligatorio (validación local)
  acceptTerms: boolean,     // OBLIGATORIO ✅
  acceptPrivacy: boolean,   // OBLIGATORIO ✅
  acceptMarketing: boolean  // OPCIONAL (default: false)
}
```

#### Transformación de Datos (Línea 128-138):
```typescript
const registerData = {
  email: this.registerForm.get('email')?.value,
  password: this.registerForm.get('password')?.value,
  firstName: this.registerForm.get('nombre')?.value,      // ⚠️ Mapeo nombre → firstName
  lastName: this.registerForm.get('apellido')?.value || '',
  phone: this.registerForm.get('telefono')?.value || undefined,
  acceptTerms: this.registerForm.get('acceptTerms')?.value,
  acceptPrivacy: this.registerForm.get('acceptPrivacy')?.value,
  acceptMarketing: this.registerForm.get('acceptMarketing')?.value || false
};
```

**🔍 Punto de Trazabilidad #1**: 
- Los datos se transforman del formato español (nombre/apellido) al formato inglés (firstName/lastName)
- Los campos de aceptación se envían tal cual
- El teléfono se envía como `undefined` si está vacío

---

### 2️⃣ FRONTEND - Servicio API
**Archivo**: `lunglife_frontend/src/app/auth/core/services/infrastructure/auth-api.service.ts`

#### Interface de Registro (Línea 10-21):
```typescript
export interface RegisterRequest {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  acceptTerms?: boolean;
  acceptPrivacy?: boolean;
  acceptMarketing?: boolean; // ✅ CORREGIDO: Campo añadido
}
```

#### Endpoint HTTP:
```typescript
register(body: RegisterRequest): Observable<RegisterResponse> {
  return this.http.post<RegisterResponse>(`${this.base}/register`, body);
}
// URL completa: http://localhost:3003/api/auth/register
```

**🔍 Punto de Trazabilidad #2**:
- La petición HTTP POST se envía al endpoint `/api/auth/register`
- El cuerpo contiene todos los campos mapeados **INCLUYENDO acceptMarketing** ✅
- Se usa HttpClient de Angular con Observable

---

### 3️⃣ BACKEND - Controller (Punto de Entrada)
**Archivo**: `lunglife_backend/src/controllers/auth.controller.v2.ts`

#### Recepción de Datos (Línea 77-107):
```typescript
async register(req: Request, res: Response): Promise<void> {
  this.logger.info('Registration attempt started', { 
    email: req.body.email,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Construcción del objeto RegisterUserRequest
  const registerRequest: RegisterUserRequest = {
    email: req.body.email,
    password: req.body.password,
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    phone: req.body.phone,
    acceptTerms: req.body.acceptTerms,
    acceptPrivacy: req.body.acceptPrivacy,
    acceptMarketing: req.body.acceptMarketing || false
  };

  // Log de campos de aceptación
  this.logger.info('Acceptance fields received:', {
    acceptTerms: req.body.acceptTerms,
    acceptPrivacy: req.body.acceptPrivacy,
    acceptMarketing: req.body.acceptMarketing
  });
```

**🔍 Punto de Trazabilidad #3**:
- Se registra el intento de registro con IP y User-Agent
- Se valida la estructura de los datos
- Se hace log específico de los campos de aceptación

---

### 4️⃣ BACKEND - Authentication Service (Lógica de Negocio)
**Archivo**: `lunglife_backend/src/core/services/authentication.service.ts`

#### Validaciones (Línea 80-130):
```typescript
// 1. VALIDACIÓN DE CAMPOS OBLIGATORIOS
const validationErrors: {[key: string]: string} = {};

// Validar email
if (!request.email || !this.isValidEmail(request.email)) {
  validationErrors.email = 'Valid email is required';
}

// Validar contraseña
if (!request.password || request.password.length < 8) {
  validationErrors.password = 'Password must be at least 8 characters long';
}

// Validar nombres
if (!request.firstName || request.firstName.trim().length === 0) {
  validationErrors.firstName = 'First name is required';
}

// 2. VALIDACIÓN DE CAMPOS DE ACEPTACIÓN (OBLIGATORIOS)
if (!request.acceptTerms) {
  validationErrors.acceptTerms = 'Must accept terms and conditions';
  this.logger.warn(`❌ Terms not accepted for: ${request.email}`);
}

if (!request.acceptPrivacy) {
  validationErrors.acceptPrivacy = 'Must accept privacy policy';
  this.logger.warn(`❌ Privacy policy not accepted for: ${request.email}`);
}
```

**🔍 Punto de Trazabilidad #4**:
- Se validan todos los campos obligatorios
- Los campos de aceptación son OBLIGATORIOS para compliance
- Se retorna error específico si falta algún campo

#### Preparación de Datos (Línea 154-178):
```typescript
const userData: Omit<IUser, 'id'> = {
  email: request.email.toLowerCase().trim(),
  password_hash: passwordHash,
  nombre: request.firstName.trim(),
  apellido: request.lastName?.trim(),
  phone: request.phone?.trim(),
  email_verified: false,
  two_fa_enabled: false,
  is_active: true,
  created_at: currentTime,
  updated_at: currentTime,
  
  // CAMPOS DE ACEPTACIÓN - CRÍTICOS PARA COMPLIANCE
  accept_terms: request.acceptTerms,     // OBLIGATORIO
  accept_privacy: request.acceptPrivacy, // OBLIGATORIO  
  marketing_consent: request.acceptMarketing || false // OPCIONAL
};

this.logger.info(`📝 Creating user record for: ${request.email}`, {
  hasAcceptance: {
    terms: userData.accept_terms,
    privacy: userData.accept_privacy,
    marketing: userData.marketing_consent
  }
});
```

**🔍 Punto de Trazabilidad #5**:
- Se hashea la contraseña con bcrypt
- Se normalizan los datos (lowercase, trim)
- Se añaden metadatos: created_at, updated_at
- Se registran explícitamente los campos de aceptación

---

### 5️⃣ BACKEND - User Repository (Capa de Datos)
**Archivo**: `lunglife_backend/src/core/infrastructure/repositories/user.repository.ts`

#### Query SQL de Inserción (Línea 66-91):
```sql
INSERT INTO users (
  email, password_hash, nombre, apellido, phone,
  email_verified, two_fa_enabled, is_active, 
  created_at, updated_at,
  accept_terms, accept_privacy, marketing_consent
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
RETURNING *
```

#### Parámetros:
```typescript
[
  user.email,              // $1
  user.password_hash,      // $2
  user.nombre,             // $3
  user.apellido,           // $4
  user.phone,              // $5
  user.email_verified,     // $6
  user.two_fa_enabled,     // $7
  user.is_active,          // $8
  user.created_at,         // $9
  user.updated_at,         // $10
  user.accept_terms,       // $11 ✅
  user.accept_privacy,     // $12 ✅
  user.marketing_consent   // $13 ✅
]
```

**🔍 Punto de Trazabilidad #6**:
- La query INSERT incluye los 3 campos de aceptación
- Se usa RETURNING * para obtener el registro completo insertado
- PostgreSQL asigna automáticamente el ID
- Se hace log después de la inserción exitosa

---

### 6️⃣ BASE DE DATOS - PostgreSQL
**Base de datos**: `lunglife_db`
**Tabla**: `users`

#### Esquema Relevante:
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  apellido VARCHAR(100),
  phone VARCHAR(20),
  email_verified BOOLEAN DEFAULT FALSE,
  two_fa_enabled BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Campos de Aceptación para Compliance
  accept_terms BOOLEAN NOT NULL DEFAULT FALSE,
  accept_privacy BOOLEAN NOT NULL DEFAULT FALSE,
  marketing_consent BOOLEAN DEFAULT FALSE,
  
  CONSTRAINT users_email_key UNIQUE (email)
);
```

**🔍 Punto de Trazabilidad #7**:
- Los campos `accept_terms` y `accept_privacy` son NOT NULL
- El campo `marketing_consent` tiene default FALSE
- Se crea constraint UNIQUE en email para evitar duplicados
- Se generan timestamps automáticos

---

### 7️⃣ BACKEND - Respuesta al Frontend
**Archivo**: `lunglife_backend/src/controllers/auth.controller.v2.ts` (Línea 120-140)

#### Respuesta Exitosa:
```typescript
res.status(201).json({
  success: true,
  message: 'User registered successfully',
  user: {
    id: result.user!.id,
    email: result.user!.email,
    firstName: result.user!.nombre,
    lastName: result.user!.apellido,
    emailVerified: result.user!.email_verified,
    acceptanceStatus: {
      terms: result.user!.accept_terms,
      privacy: result.user!.accept_privacy,
      marketing: result.user!.marketing_consent
    }
  },
  token: result.token,
});
```

**🔍 Punto de Trazabilidad #8**:
- Se incluye un objeto `acceptanceStatus` con los campos de aceptación
- Se devuelve el token JWT para autenticación inmediata
- El status code es 201 (Created)

---

## 🔐 Logs de Auditoría

### Puntos de Log en el Flujo:

1. **Controller - Inicio de Registro**:
   ```typescript
   this.logger.info('Registration attempt started', { 
     email: req.body.email,
     ip: req.ip,
     userAgent: req.get('User-Agent')
   });
   ```

2. **Controller - Campos de Aceptación**:
   ```typescript
   this.logger.info('Acceptance fields received:', {
     acceptTerms: req.body.acceptTerms,
     acceptPrivacy: req.body.acceptPrivacy,
     acceptMarketing: req.body.acceptMarketing
   });
   ```

3. **Service - Validación de Aceptaciones**:
   ```typescript
   if (!request.acceptTerms) {
     this.logger.warn(`❌ Terms not accepted for: ${request.email}`);
   }
   ```

4. **Service - Creación de Usuario**:
   ```typescript
   this.logger.info(`📝 Creating user record for: ${request.email}`, {
     hasAcceptance: {
       terms: userData.accept_terms,
       privacy: userData.accept_privacy,
       marketing: userData.marketing_consent
     }
   });
   ```

5. **Service - Registro Exitoso**:
   ```typescript
   this.logger.info(`✅ User registration completed successfully for: ${newUser.email}`, {
     userId: newUser.id,
     duration: `${duration}ms`,
     acceptanceFields: {
       terms: newUser.accept_terms,
       privacy: newUser.accept_privacy,
       marketing: newUser.marketing_consent
     }
   });
   ```

6. **Repository - Inserción**:
   ```typescript
   this.logger.info(`User created successfully with email: ${user.email}`);
   ```

---

## ✅ Checklist de Verificación

### Frontend:
- [x] Formulario incluye campos de aceptación
- [x] Validación obligatoria de términos y privacidad
- [x] Mapeo correcto de campos (nombre → firstName)
- [x] Petición HTTP correcta al endpoint

### Backend - Controller:
- [x] Recibe todos los campos correctamente
- [x] Log de IP y User-Agent
- [x] Log específico de campos de aceptación
- [x] Validación de estructura

### Backend - Service:
- [x] Validación de campos obligatorios
- [x] Validación de campos de aceptación
- [x] Hasheo de contraseña
- [x] Normalización de datos
- [x] Generación de tokens
- [x] Manejo de transacciones

### Backend - Repository:
- [x] Query INSERT con 13 parámetros
- [x] Incluye accept_terms, accept_privacy, marketing_consent
- [x] RETURNING * para obtener registro completo
- [x] Manejo de errores (email duplicado)

### Base de Datos:
- [x] Campos NOT NULL para terms y privacy
- [x] Default FALSE para marketing_consent
- [x] Constraint UNIQUE en email
- [x] Timestamps automáticos

---

## 🧪 Pruebas de Verificación

### Caso 1: Registro Exitoso
**Request**:
```json
{
  "email": "test@example.com",
  "password": "MiPassword123!",
  "firstName": "Juan",
  "lastName": "Pérez",
  "phone": "+56912345678",
  "acceptTerms": true,
  "acceptPrivacy": true,
  "acceptMarketing": false
}
```

**Response Esperada** (201):
```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "id": 1,
    "email": "test@example.com",
    "firstName": "Juan",
    "lastName": "Pérez",
    "emailVerified": false,
    "acceptanceStatus": {
      "terms": true,
      "privacy": true,
      "marketing": false
    }
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Verificación en BD**:
```sql
SELECT id, email, nombre, apellido, 
       accept_terms, accept_privacy, marketing_consent
FROM users 
WHERE email = 'test@example.com';
```

**Resultado Esperado**:
```
id | email              | nombre | apellido | accept_terms | accept_privacy | marketing_consent
---|--------------------|--------|----------|--------------|----------------|------------------
 1 | test@example.com   | Juan   | Pérez    | true         | true           | false
```

---

### Caso 2: Error - Sin Aceptar Términos
**Request**:
```json
{
  "email": "test2@example.com",
  "password": "MiPassword123!",
  "firstName": "Maria",
  "acceptTerms": false,
  "acceptPrivacy": true,
  "acceptMarketing": false
}
```

**Response Esperada** (400):
```json
{
  "success": false,
  "message": "Validation errors found",
  "errorCode": "VALIDATION_ERROR",
  "validationErrors": {
    "acceptTerms": "Must accept terms and conditions"
  }
}
```

**Logs Esperados**:
```
❌ Terms not accepted for: test2@example.com
❌ Validation failed for: test2@example.com
```

---

### Caso 3: Error - Email Duplicado
**Request**:
```json
{
  "email": "test@example.com",
  "password": "OtraPassword123!",
  "firstName": "Pedro",
  "acceptTerms": true,
  "acceptPrivacy": true,
  "acceptMarketing": true
}
```

**Response Esperada** (400):
```json
{
  "success": false,
  "error": "Email already registered",
  "errorCode": "EMAIL_EXISTS"
}
```

---

## 📊 Diagrama de Flujo

```
┌─────────────────────────────────────────────────────────────────┐
│  FRONTEND (Angular + Ionic)                                      │
├─────────────────────────────────────────────────────────────────┤
│  1. Usuario llena formulario                                     │
│     - nombre, apellido, email, telefono, password                │
│     - ✓ acceptTerms, ✓ acceptPrivacy, acceptMarketing           │
│                                                                   │
│  2. Transformación de datos (register.page.ts:128-138)          │
│     - nombre → firstName                                         │
│     - apellido → lastName                                        │
│     - telefono → phone                                           │
│                                                                   │
│  3. Petición HTTP POST (auth-api.service.ts:48)                 │
│     POST /api/auth/register                                      │
└──────────────────────────┬────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  BACKEND (Node.js + Express + TypeScript)                        │
├─────────────────────────────────────────────────────────────────┤
│  4. Controller recibe request (auth.controller.v2.ts:77)        │
│     📝 Log: email, IP, User-Agent                                │
│     📝 Log: acceptTerms, acceptPrivacy, acceptMarketing          │
│                                                                   │
│  5. Service valida datos (authentication.service.ts:80-130)     │
│     ✓ Email válido                                               │
│     ✓ Password >= 8 caracteres                                   │
│     ✓ firstName no vacío                                         │
│     ✓ acceptTerms === true ❗                                    │
│     ✓ acceptPrivacy === true ❗                                  │
│                                                                   │
│  6. Service procesa datos (authentication.service.ts:154-178)   │
│     🔐 Hash password con bcrypt                                  │
│     🔄 Normaliza email (lowercase, trim)                         │
│     📝 Log: campos de aceptación                                 │
│                                                                   │
│  7. Repository inserta en BD (user.repository.ts:66-91)         │
│     INSERT INTO users (13 campos) VALUES (...)                   │
│     RETURNING *                                                  │
└──────────────────────────┬────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  BASE DE DATOS (PostgreSQL)                                      │
├─────────────────────────────────────────────────────────────────┤
│  8. Inserción en tabla users                                     │
│     - Genera ID automático (SERIAL)                              │
│     - Valida UNIQUE constraint en email                          │
│     - Verifica NOT NULL en accept_terms y accept_privacy         │
│     - Aplica DEFAULT en campos opcionales                        │
│                                                                   │
│  9. Retorna registro completo                                    │
│     - Todos los campos incluidos los de aceptación               │
└──────────────────────────┬────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  RESPUESTA AL FRONTEND                                           │
├─────────────────────────────────────────────────────────────────┤
│  10. Controller formatea respuesta (auth.controller.v2.ts:120)  │
│      {                                                           │
│        success: true,                                            │
│        user: { id, email, firstName, lastName,                   │
│                acceptanceStatus: { terms, privacy, marketing }   │
│        },                                                        │
│        token: "JWT..."                                           │
│      }                                                           │
│                                                                   │
│  11. Frontend recibe y procesa respuesta                         │
│      - Muestra mensaje de éxito                                  │
│      - Redirige a login con email pre-llenado                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Comandos de Verificación

### Iniciar Backend:
```bash
cd lunglife_backend
npx ts-node src/index.ts
```

### Iniciar Frontend:
```bash
cd lunglife_frontend
npm start
```

### Test de Registro (Node.js):
```bash
cd lunglife_backend
node test_registration.js
```

### Verificar en Base de Datos:
```sql
-- Ver todos los usuarios
SELECT * FROM users ORDER BY created_at DESC LIMIT 10;

-- Ver solo campos de aceptación
SELECT id, email, nombre, apellido,
       accept_terms, accept_privacy, marketing_consent,
       created_at
FROM users
ORDER BY created_at DESC;

-- Contar usuarios por tipo de consentimiento
SELECT 
  COUNT(*) as total_users,
  SUM(CASE WHEN accept_terms THEN 1 ELSE 0 END) as accepted_terms,
  SUM(CASE WHEN accept_privacy THEN 1 ELSE 0 END) as accepted_privacy,
  SUM(CASE WHEN marketing_consent THEN 1 ELSE 0 END) as accepted_marketing
FROM users;
```

---

## 📝 Conclusiones

### ✅ Puntos Fuertes:
1. **Validación completa** de campos obligatorios
2. **Campos de aceptación** correctamente implementados
3. **Logs detallados** en cada paso del flujo
4. **Transacciones** para integridad de datos
5. **Manejo de errores** específico (email duplicado, validaciones)
6. **Trazabilidad completa** desde frontend hasta BD

### ⚠️ Áreas de Mejora Detectadas:
1. El servidor backend no se mantiene activo (necesita investigación)
2. Falta timestamp de aceptación de cada consentimiento
3. Podría añadirse versión del documento aceptado
4. Considerar añadir IP address en registro de aceptación

### 🔒 Compliance:
- ✅ GDPR: Se registran consentimientos de manera explícita
- ✅ Granularidad: Términos, Privacidad y Marketing por separado
- ✅ Auditoría: Logs completos del proceso
- ⚠️ Falta: Timestamp específico de cada consentimiento

---

**Última actualización**: 2025-10-13
**Autor**: Sistema de Documentación Automática
**Versión**: 1.0
