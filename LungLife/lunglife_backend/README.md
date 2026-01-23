# LungLife Backend

API REST para el sistema de evaluacion de riesgo de cancer pulmonar.

## Estructura de Directorios

```
lunglife_backend/
├── src/                          # Codigo fuente principal
│   ├── index.ts                  # Punto de entrada de la aplicacion
│   ├── application/              # Capa de Aplicacion (Casos de Uso)
│   ├── domain/                   # Capa de Dominio (Entidades e Interfaces)
│   ├── infrastructure/           # Capa de Infraestructura (BD, Config)
│   ├── presentation/             # Capa de Presentacion (HTTP)
│   └── shared/                   # Codigo compartido
├── tests/                        # Tests unitarios e integracion
├── database/                     # Migraciones de base de datos
│   └── migrations/
├── scripts/                      # Scripts utilitarios
├── .env                          # Variables de entorno (no commitear)
├── package.json                  # Dependencias y scripts
├── tsconfig.json                 # Configuracion TypeScript
└── jest.config.js                # Configuracion de tests
```

---

## Arquitectura Clean Architecture

### `src/application/` - Capa de Aplicacion
Contiene la logica de negocio y casos de uso.

| Archivo | Funcion |
|---------|---------|
| `services/authentication.service.ts` | Logica de autenticacion (login, registro, tokens) |
| `services/logger.service.ts` | Servicio de logging centralizado |
| `services/profile.service.ts` | Gestion de perfiles de usuario |

### `src/domain/` - Capa de Dominio
Define contratos e interfaces del sistema.

| Archivo | Funcion |
|---------|---------|
| `interfaces/config.interface.ts` | Interfaces de configuracion |
| `interfaces/database.interface.ts` | Contratos de conexion BD |
| `interfaces/profile.interface.ts` | Entidades de perfil y riesgo |
| `interfaces/repository.interface.ts` | Patron Repository base |

### `src/infrastructure/` - Capa de Infraestructura
Implementaciones concretas y conexiones externas.

| Directorio | Funcion |
|------------|---------|
| `config/` | Configuracion de app y Swagger |
| `database/` | Conexion PostgreSQL |
| `factories/` | Factory para crear conexiones |
| `repositories/` | Implementacion de repositorios |
| `unit-of-work/` | Patron Unit of Work (transacciones) |

#### Repositorios disponibles:
- `user.repository.ts` - Gestion de usuarios
- `patient.repository.ts` - Datos de pacientes
- `ml-prediction.repository.ts` - Predicciones ML
- `risk-assessment.repository.ts` - Evaluaciones de riesgo
- `refresh-token.repository.ts` - Tokens JWT
- `profile.repository.ts` - Perfiles de usuario

### `src/presentation/` - Capa de Presentacion
Capa HTTP: controladores, rutas y middlewares.

| Directorio | Funcion |
|------------|---------|
| `controllers/` | Controladores HTTP (request/response) |
| `routes/` | Definicion de endpoints |
| `middleware/` | Auth, validacion, logging |

#### Controladores:
- `auth.controller.ts` - Login, registro, logout, refresh
- `user-profile.controller.ts` - Perfil de usuario
- `clinical-profile.controller.ts` - Perfil clinico del paciente
- `doctor.controller.ts` - Gestion de doctores
- `directory.controller.ts` - Directorio de profesionales
- `health.controller.ts` - Health check del API

### `src/shared/` - Codigo Compartido
Utilidades y constantes globales.

| Directorio | Funcion |
|------------|---------|
| `rbac/` | Control de acceso por roles (PATIENT, DOCTOR, ADMIN) |
| `utils/` | Funciones utilitarias |

---

## Tests

```
tests/
├── setup.ts                      # Configuracion global de tests
├── smoke.test.ts                 # Test basico de sanidad
└── application/
    └── services/
        └── authentication.service.spec.ts  # Tests de autenticacion
```

---

## Scripts Disponibles

```bash
npm start          # Inicia servidor en desarrollo
npm run build      # Compila TypeScript
npm test           # Ejecuta tests
npm run dev        # Modo desarrollo con hot-reload
```

---

## Variables de Entorno

Ver archivo `.env.example` para configuracion requerida.
