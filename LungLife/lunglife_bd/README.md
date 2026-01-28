# LungLife Base de Datos

Esquema PostgreSQL para el sistema de evaluacion de riesgo de cancer pulmonar.

## Estructura de Directorios

```
lunglife_bd/
├── lunglife_db.sql               # Esquema actual (usar este)
├── db_lunglife_dataset_v5.1.sql  # Version historica v5.1
├── diagrams/                     # Diagramas del modelo
│   ├── erd/                      # Archivos ERD editables
│   └── images/                   # Imagenes exportadas
└── seeds/                        # Datos de prueba
```

---

## Archivos SQL

| Archivo | Funcion |
|---------|---------|
| `lunglife_db.sql` | Esquema principal - Usar para crear/recrear BD |
| `db_lunglife_dataset_v5.1.sql` | Version historica para referencia |

---

## Diagramas

### `diagrams/erd/`
Archivos editables de diagramas entidad-relacion.

| Archivo | Funcion |
|---------|---------|
| `bd_lunglife_dataset_v5.0.pgerd` | Diagrama ERD para pgAdmin 4 |

### `diagrams/images/`
Imagenes PNG exportadas de los diagramas para documentacion.

---

## Seeds (Datos de Prueba)

### `seeds/`
Scripts para insertar datos de prueba en desarrollo.

| Archivo | Funcion |
|---------|---------|
| `insert_famous_doctors.sql` | Doctores ficticios (House, Grey, Strange) |
| `insert_house_md_doctors.sql` | Doctoras de House MD (Cuddy, Cameron, Thirteen) |
| `insert_tv_patients.sql` | Pacientes ficticios con historial |

Contrasena de prueba: `Doctor123!` / `Patient123!`

---

## Modelo de Datos v5.1

### Tablas Principales

| Tabla | Funcion |
|-------|---------|
| `roles` | Roles del sistema (PATIENT, DOCTOR, ADMINISTRATOR) |
| `users` | Usuarios y autenticacion |
| `user_auth` | Credenciales y 2FA |
| `patient` | Informacion demografica del paciente |
| `doctor` | Informacion profesional del medico |

### Tablas Clinicas

| Tabla | Funcion |
|-------|---------|
| `smoking_history` | Historial de tabaquismo (factor principal) |
| `risk_factors` | Factores de riesgo no relacionados al tabaco |
| `symptom` | Sintomas reportados |
| `diagnostic_test` | Resultados de pruebas diagnosticas |
| `lifestyle_habits` | Habitos de vida |
| `medical_history` | Historial medico |
| `comorbidities` | Catalogo de comorbilidades |
| `patient_comorbidities` | Relacion paciente-comorbilidades |

### Tablas ML

| Tabla | Funcion |
|-------|---------|
| `ml_predictions` | Predicciones del modelo ML |
| `occupational_exposure` | Exposicion ocupacional |

### Tablas de Sesion

| Tabla | Funcion |
|-------|---------|
| `refresh_tokens` | Tokens JWT para sesiones |
| `password_resets` | Tokens de recuperacion de contrasena |
| `email_verifications` | Verificacion de email |

---

## Uso

```bash
# Crear base de datos
psql -U postgres -c "CREATE DATABASE lunglife_db;"

# Ejecutar esquema
psql -U postgres -d lunglife_db -f lunglife_db.sql

# Cargar datos de prueba (opcional)
psql -U postgres -d lunglife_db -f seeds/insert_famous_doctors.sql
psql -U postgres -d lunglife_db -f seeds/insert_tv_patients.sql
```

---

## Vistas Disponibles

| Vista | Funcion |
|-------|---------|
| `vw_patient_current_risk` | Riesgo actual por paciente |
| `active_patients_with_doctors` | Pacientes activos con medicos asignados |
| `doctors_patient_count` | Conteo de pacientes por medico |
| `smoking_risk_patients` | Pacientes con riesgo por tabaquismo |
| `patients_clinical_summary` | Resumen clinico completo |
