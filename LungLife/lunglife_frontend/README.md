# 📱 LungLife Frontend

Aplicación móvil/web con Angular 20 + Ionic Framework para evaluación de riesgo de cáncer pulmonar.

## 📁 Estructura de Directorios

```
lunglife_frontend/
├── src/                          # Código fuente
│   ├── index.html                # HTML principal
│   ├── main.ts                   # Bootstrap de Angular
│   ├── global.scss               # Estilos globales
│   ├── app/                      # Módulos de la aplicación
│   ├── assets/                   # Recursos estáticos
│   ├── environments/             # Configuración por ambiente
│   └── theme/                    # Variables de tema
├── www/                          # Build de producción
├── .angular/                     # Cache de Angular
├── angular.json                  # Configuración Angular
├── ionic.config.json             # Configuración Ionic
├── capacitor.config.ts           # Configuración Capacitor (móvil)
├── package.json                  # Dependencias
└── tsconfig.json                 # Configuración TypeScript
```

---

## 🏗️ Arquitectura de Módulos

### `src/app/` - Aplicación Principal

```
app/
├── app.component.ts              # Componente raíz
├── app.config.ts                 # Configuración de providers
├── app.routes.ts                 # Rutas principales
├── auth/                         # Módulo de autenticación
├── core/                         # Servicios core
├── shared/                       # Componentes compartidos
├── dashboard/                    # Dashboard principal
├── home/                         # Página de inicio
├── profile/                      # Perfil de usuario
├── clinical-profile/             # Perfil clínico
├── directory/                    # Directorio de profesionales
├── security/                     # Configuración de seguridad
└── theme/                        # Estilos compartidos
```

---

## 📂 Módulos Detallados

### `app/auth/` - Autenticación
Maneja login, registro y gestión de sesión.

| Directorio | Función |
|------------|---------|
| `core/guards/` | Guards de rutas (autenticación, roles) |
| `core/interceptors/` | Interceptores HTTP (tokens, errores) |
| `core/interfaces/` | Interfaces de autenticación |
| `core/services/` | Servicios de auth (login, tokens) |
| `core/validators/` | Validadores de formularios |
| `login/pages/` | Páginas de login |
| `pages/splash/` | Pantalla de carga inicial |
| `shared/components/` | Componentes de auth reutilizables |

### `app/core/` - Núcleo
Servicios y configuración central.

| Directorio | Función |
|------------|---------|
| `config/` | Configuración de ambiente |
| `rbac/` | Control de acceso por roles |
| `services/error.service.ts` | Manejo centralizado de errores |
| `services/logger.service.ts` | Logging de la aplicación |
| `services/theme.service.ts` | Gestión de tema claro/oscuro |

### `app/profile/` - Perfil de Usuario
Gestión del perfil personal.

| Directorio | Función |
|------------|---------|
| `components/profile-form/` | Formulario de perfil |
| `interfaces/` | Interfaces y enums de perfil |
| `services/profile.service.ts` | CRUD de perfil |
| `services/lifestyle.service.ts` | Hábitos de vida |
| `services/medical-history.service.ts` | Historial médico |

### `app/clinical-profile/` - Perfil Clínico
Datos clínicos del paciente.

| Directorio | Función |
|------------|---------|
| `pages/detailed-profile/` | Vista detallada del perfil clínico |
| `services/clinical-profile.service.ts` | Servicio de datos clínicos |

### `app/directory/` - Directorio
Búsqueda de profesionales de salud.

| Directorio | Función |
|------------|---------|
| `pages/directory/` | Lista de doctores |
| `services/directory.service.ts` | Búsqueda y filtrado |

### `app/security/` - Seguridad
Configuración de seguridad de cuenta.

| Directorio | Función |
|------------|---------|
| `session-management/` | Gestión de sesiones activas |
| `two-fa-settings/` | Configuración de 2FA |
| `two-fa-setup/` | Configuración inicial de 2FA |

### `app/shared/` - Compartidos
Componentes y utilidades reutilizables.

| Directorio | Función |
|------------|---------|
| `components/` | Componentes UI reutilizables |
| `not-found/` | Página 404 |

### `app/dashboard/` - Dashboard
Panel principal del usuario.

| Archivo | Función |
|---------|---------|
| `dashboard.page.ts` | Lógica del dashboard |
| `dashboard.page.html` | Template del dashboard |

### `app/home/` - Home
Página de inicio/landing.

---

## 🎨 Estilos y Tema

### `src/theme/`
Variables CSS de Ionic.

| Archivo | Función |
|---------|---------|
| `variables.css` | Variables CSS customizadas |
| `variables.scss` | Variables SCSS de Ionic |

### `app/theme/`
Estilos compartidos entre módulos.

| Archivo | Función |
|---------|---------|
| `shared-layout.scss` | Layouts reutilizables |

---

## 🌍 Ambientes

### `src/environments/`

| Archivo | Función |
|---------|---------|
| `environment.ts` | Desarrollo local |
| `environment.prod.ts` | Producción |
| `environment.model.ts` | Interface de configuración |

---

## 📦 Assets

### `src/assets/`

| Directorio | Función |
|------------|---------|
| `icon/` | Logos e iconos de la app |
| `images/` | Imágenes estáticas |

---

## 🚀 Scripts Disponibles

```bash
npm start          # Servidor de desarrollo (localhost:4200)
npm run build      # Build de producción
npm test           # Tests unitarios
npm run lint       # Linting del código
ionic serve        # Servidor Ionic con live-reload
ionic build        # Build para Capacitor
```

---

## 📱 Plataformas

- **Web**: Angular SPA
- **iOS/Android**: Capacitor (configurado en `capacitor.config.ts`)
