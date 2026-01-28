# LungLife Frontend

Aplicacion movil/web con Angular 20 + Ionic Framework para evaluacion de riesgo de cancer pulmonar.

## Estructura de Directorios

```
lunglife_frontend/
├── src/                          # Codigo fuente
│   ├── index.html                # HTML principal
│   ├── main.ts                   # Bootstrap de Angular
│   ├── global.scss               # Estilos globales
│   ├── app/                      # Modulos de la aplicacion
│   ├── assets/                   # Recursos estaticos
│   ├── environments/             # Configuracion por ambiente
│   └── theme/                    # Variables de tema
├── www/                          # Build de produccion
├── .angular/                     # Cache de Angular
├── angular.json                  # Configuracion Angular
├── ionic.config.json             # Configuracion Ionic
├── capacitor.config.ts           # Configuracion Capacitor (movil)
├── package.json                  # Dependencias
└── tsconfig.json                 # Configuracion TypeScript
```

---

## Arquitectura de Modulos

### `src/app/` - Aplicacion Principal

```
app/
├── app.component.ts              # Componente raiz
├── app.config.ts                 # Configuracion de providers
├── app.routes.ts                 # Rutas principales
├── auth/                         # Modulo de autenticacion
├── core/                         # Servicios core
├── shared/                       # Componentes compartidos
├── dashboard/                    # Dashboard principal
├── home/                         # Pagina de inicio
├── profile/                      # Perfil de usuario
├── clinical-profile/             # Perfil clinico
├── directory/                    # Directorio de profesionales
├── security/                     # Configuracion de seguridad
└── theme/                        # Estilos compartidos
```

---

## Modulos Detallados

### `app/auth/` - Autenticacion
Maneja login, registro y gestion de sesion.

| Directorio | Funcion |
|------------|---------|
| `core/guards/` | Guards de rutas (autenticacion, roles) |
| `core/interceptors/` | Interceptores HTTP (tokens, errores) |
| `core/interfaces/` | Interfaces de autenticacion |
| `core/services/` | Servicios de auth (login, tokens) |
| `core/validators/` | Validadores de formularios |
| `login/pages/` | Paginas de login |
| `pages/splash/` | Pantalla de carga inicial |
| `shared/components/` | Componentes de auth reutilizables |

### `app/core/` - Nucleo
Servicios y configuracion central.

| Directorio | Funcion |
|------------|---------|
| `config/` | Configuracion de ambiente |
| `rbac/` | Control de acceso por roles |
| `services/error.service.ts` | Manejo centralizado de errores |
| `services/logger.service.ts` | Logging de la aplicacion |
| `services/theme.service.ts` | Gestion de tema claro/oscuro |

### `app/profile/` - Perfil de Usuario
Gestion del perfil personal.

| Directorio | Funcion |
|------------|---------|
| `components/profile-form/` | Formulario de perfil |
| `interfaces/` | Interfaces y enums de perfil |
| `services/profile.service.ts` | CRUD de perfil |
| `services/lifestyle.service.ts` | Habitos de vida |
| `services/medical-history.service.ts` | Historial medico |

### `app/clinical-profile/` - Perfil Clinico
Datos clinicos del paciente.

| Directorio | Funcion |
|------------|---------|
| `pages/detailed-profile/` | Vista detallada del perfil clinico |
| `services/clinical-profile.service.ts` | Servicio de datos clinicos |

### `app/directory/` - Directorio
Busqueda de profesionales de salud.

| Directorio | Funcion |
|------------|---------|
| `pages/directory/` | Lista de doctores |
| `services/directory.service.ts` | Busqueda y filtrado |

### `app/security/` - Seguridad
Configuracion de seguridad de cuenta.

| Directorio | Funcion |
|------------|---------|
| `session-management/` | Gestion de sesiones activas |
| `two-fa-settings/` | Configuracion de 2FA |
| `two-fa-setup/` | Configuracion inicial de 2FA |

### `app/shared/` - Compartidos
Componentes y utilidades reutilizables.

| Directorio | Funcion |
|------------|---------|
| `components/` | Componentes UI reutilizables |
| `not-found/` | Pagina 404 |

### `app/dashboard/` - Dashboard
Panel principal del usuario.

| Archivo | Funcion |
|---------|---------|
| `dashboard.page.ts` | Logica del dashboard |
| `dashboard.page.html` | Template del dashboard |

### `app/home/` - Home
Pagina de inicio/landing.

---

## Estilos y Tema

### `src/theme/`
Variables CSS de Ionic.

| Archivo | Funcion |
|---------|---------|
| `variables.css` | Variables CSS customizadas |
| `variables.scss` | Variables SCSS de Ionic |

### `app/theme/`
Estilos compartidos entre modulos.

| Archivo | Funcion |
|---------|---------|
| `shared-layout.scss` | Layouts reutilizables |

---

## Ambientes

### `src/environments/`

| Archivo | Funcion |
|---------|---------|
| `environment.ts` | Desarrollo local |
| `environment.prod.ts` | Produccion |
| `environment.model.ts` | Interface de configuracion |

---

## Assets

### `src/assets/`

| Directorio | Funcion |
|------------|---------|
| `icon/` | Logos e iconos de la app |
| `images/` | Imagenes estaticas |

---

## Scripts Disponibles

```bash
npm start          # Servidor de desarrollo (localhost:4200)
npm run build      # Build de produccion
npm test           # Tests unitarios
npm run lint       # Linting del codigo
ionic serve        # Servidor Ionic con live-reload
ionic build        # Build para Capacitor
```

---

## Plataformas

- Web: Angular SPA
- iOS/Android: Capacitor (configurado en `capacitor.config.ts`)
