# 🗄️ LungLife Base de Datos

Esquema PostgreSQL para el sistema de evaluación de riesgo de cáncer pulmonar.

## 📁 Estructura de Directorios

```
lunglife_bd/
├── lunglife_db.sql               # ⭐ Esquema actual (usar este)
├── db_lunglife_dataset_v5.1.sql  # Versión histórica v5.1
├── diagrams/                     # Diagramas del modelo
│   ├── erd/                      # Archivos ERD editables
│   └── images/                   # Imágenes exportadas
└── seeds/                        # Datos de prueba
```

---

## 📄 Archivos SQL

| Archivo | Función |
|---------|---------|
| `lunglife_db.sql` | **Esquema principal** - Usar para crear/recrear BD |
| `db_lunglife_dataset_v5.1.sql` | Versión histórica para referencia |

---

## 📊 Diagramas

### `diagrams/erd/`
Archivos editables de diagramas entidad-relación.

| Archivo | Función |
|---------|---------|
| `bd_lunglife_dataset_v5.0.pgerd` | Diagrama ERD para pgAdmin 4 |

### `diagrams/images/`
Imágenes PNG exportadas de los diagramas para documentación.

---

## 🌱 Seeds (Datos de Prueba)

### `seeds/`
Scripts para insertar datos de prueba en desarrollo.

| Archivo | Función |
|---------|---------|
| `insert_famous_doctors.sql` | Doctores ficticios (House, Grey, Strange) |
| `insert_house_md_doctors.sql` | Doctoras de House MD (Cuddy, Cameron, Thirteen) |
| `insert_tv_patients.sql` | Pacientes ficticios con historial |

**Contraseña de prueba:** `Doctor123!` / `Patient123!`

---

## 🏗️ Modelo de Datos v5.1

### Tablas Principales

| Tabla | Función |
|-------|---------|
| `roles` | Roles del sistema (PATIENT, DOCTOR, ADMINISTRATOR) |
| `users` | Usuarios y autenticación |
| `user_auth` | Credenciales y 2FA |
| `patient` | Información demográfica del paciente |
| `doctor` | Información profesional del médico |

### Tablas Clínicas

| Tabla | Función |
|-------|---------|
| `smoking_history` | Historial de tabaquismo (factor principal) |
| `risk_factors` | Factores de riesgo no relacionados al tabaco |
| `symptom` | Síntomas reportados |
| `diagnostic_test` | Resultados de pruebas diagnósticas |
| `lifestyle_habits` | Hábitos de vida |
| `medical_history` | Historial médico |
| `comorbidities` | Catálogo de comorbilidades |
| `patient_comorbidities` | Relación paciente-comorbilidades |

### Tablas ML

| Tabla | Función |
|-------|---------|
| `ml_predictions` | Predicciones del modelo ML |
| `occupational_exposure` | Exposición ocupacional |

### Tablas de Sesión

| Tabla | Función |
|-------|---------|
| `refresh_tokens` | Tokens JWT para sesiones |
| `password_resets` | Tokens de recuperación de contraseña |
| `email_verifications` | Verificación de email |

---

## 🚀 Uso

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

## 📋 Vistas Disponibles

| Vista | Función |
|-------|---------|
| `vw_patient_current_risk` | Riesgo actual por paciente |
| `active_patients_with_doctors` | Pacientes activos con médicos asignados |
| `doctors_patient_count` | Conteo de pacientes por médico |
| `smoking_risk_patients` | Pacientes con riesgo por tabaquismo |
| `patients_clinical_summary` | Resumen clínico completo |
