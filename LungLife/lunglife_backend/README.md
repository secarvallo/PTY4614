# 🔧 LungLife Backend

API REST para el sistema de evaluación de riesgo de cáncer pulmonar.

## 📁 Estructura de Directorios

```
lunglife_backend/
├── src/                          # Código fuente principal
│   ├── index.ts                  # Punto de entrada de la aplicación
│   ├── application/              # Capa de Aplicación (Casos de Uso)
│   ├── domain/                   # Capa de Dominio (Entidades e Interfaces)
│   ├── infrastructure/           # Capa de Infraestructura (BD, Config)
│   ├── presentation/             # Capa de Presentación (HTTP)
│   └── shared/                   # Código compartido
├── tests/                        # Tests unitarios e integración
├── database/                     # Migraciones de base de datos
│   └── migrations/
├── scripts/                      # Scripts utilitarios
├── .env                          # Variables de entorno (no commitear)
├── package.json                  # Dependencias y scripts
├── tsconfig.json                 # Configuración TypeScript
└── jest.config.js                # Configuración de tests
```

---

## 🏗️ Arquitectura Clean Architecture

### `src/application/` - Capa de Aplicación
Contiene la lógica de negocio y casos de uso.

| Archivo | Función |
|---------|---------|
| `services/authentication.service.ts` | Lógica de autenticación (login, registro, tokens) |
| `services/logger.service.ts` | Servicio de logging centralizado |
| `services/profile.service.ts` | Gestión de perfiles de usuario |

### `src/domain/` - Capa de Dominio
Define contratos e interfaces del sistema.

| Archivo | Función |
|---------|---------|
| `interfaces/config.interface.ts` | Interfaces de configuración |
| `interfaces/database.interface.ts` | Contratos de conexión BD |
| `interfaces/profile.interface.ts` | Entidades de perfil y riesgo |
| `interfaces/repository.interface.ts` | Patrón Repository base |

### `src/infrastructure/` - Capa de Infraestructura
Implementaciones concretas y conexiones externas.

| Directorio | Función |
|------------|---------|
| `config/` | Configuración de app y Swagger |
| `database/` | Conexión PostgreSQL |
| `factories/` | Factory para crear conexiones |
| `repositories/` | Implementación de repositorios |
| `unit-of-work/` | Patrón Unit of Work (transacciones) |

#### Repositorios disponibles:
- `user.repository.ts` - Gestión de usuarios
- `patient.repository.ts` - Datos de pacientes
- `ml-prediction.repository.ts` - Predicciones ML
- `risk-assessment.repository.ts` - Evaluaciones de riesgo
- `refresh-token.repository.ts` - Tokens JWT
- `profile.repository.ts` - Perfiles de usuario

### `src/presentation/` - Capa de Presentación
Capa HTTP: controladores, rutas y middlewares.

| Directorio | Función |
|------------|---------|
| `controllers/` | Controladores HTTP (request/response) |
| `routes/` | Definición de endpoints |
| `middleware/` | Auth, validación, logging |

#### Controladores:
- `auth.controller.ts` - Login, registro, logout, refresh
- `user-profile.controller.ts` - Perfil de usuario
- `clinical-profile.controller.ts` - Perfil clínico del paciente
- `doctor.controller.ts` - Gestión de doctores
- `directory.controller.ts` - Directorio de profesionales
- `health.controller.ts` - Health check del API

### `src/shared/` - Código Compartido
Utilidades y constantes globales.

| Directorio | Función |
|------------|---------|
| `rbac/` | Control de acceso por roles (PATIENT, DOCTOR, ADMIN) |
| `utils/` | Funciones utilitarias |

---

## 🧪 Tests

```
tests/
├── setup.ts                      # Configuración global de tests
├── smoke.test.ts                 # Test básico de sanidad
└── application/
    └── services/
        └── authentication.service.spec.ts  # Tests de autenticación
```

---

## 🚀 Scripts Disponibles

```bash
npm start          # Inicia servidor en desarrollo
npm run build      # Compila TypeScript
npm test           # Ejecuta tests
npm run dev        # Modo desarrollo con hot-reload
```

---

## 🔐 Variables de Entorno

Ver archivo `.env.example` para configuración requerida.
