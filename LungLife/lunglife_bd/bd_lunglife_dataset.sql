-- ============================================
-- SCRIPT DE CREACIÓN DE TABLAS - LUNG LIFE
-- Diseño en Tercera Forma Normal (3NF)
-- ============================================

-- Tabla 1: USUARIO (Entidad principal para autenticación)
CREATE TABLE users (
    usuario_id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    contrasena_hash VARCHAR(255) NOT NULL,
    rol VARCHAR(20) CHECK (rol IN ('PACIENTE', 'MEDICO', 'ADMINISTRADOR')) NOT NULL,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    activo BOOLEAN DEFAULT TRUE
);

-- Tabla 2: PACIENTE (Información demográfica básica)
CREATE TABLE PACIENTE (
    paciente_id SERIAL PRIMARY KEY,
    usuario_id INTEGER UNIQUE REFERENCES USUARIO(usuario_id),
    nombre VARCHAR(100),
    fecha_nacimiento DATE,
    genero VARCHAR(20) CHECK (genero IN ('MASCULINO', 'FEMENINO', 'OTRO')),
    area_residencia VARCHAR(50) CHECK (area_residencia IN ('URBANO', 'RURAL', 'SUBURBANO')),
    ocupacion VARCHAR(100),
    fecha_registro DATE DEFAULT CURRENT_DATE
);

-- Tabla 3: FACTOR_RIESGO (Factores de riesgo del paciente)
CREATE TABLE FACTOR_RIESGO (
    factor_id SERIAL PRIMARY KEY,
    paciente_id INTEGER REFERENCES PACIENTE(paciente_id) ON DELETE CASCADE,
    historial_tabaquismo VARCHAR(20) CHECK (historial_tabaquismo IN ('NUNCA', 'EX_FUMADOR', 'FUMADOR_ACTUAL')),
    años_fumando INTEGER,
    paquetes_año DECIMAL(5,2),
    historial_familiar_cancer BOOLEAN,
    exposicion_toxinas BOOLEAN,
    indice_calidad_aire INTEGER,
    nivel_actividad_fisica VARCHAR(20) CHECK (nivel_actividad_fisica IN ('BAJO', 'MODERADO', 'ALTO')),
    habitos_alimenticios VARCHAR(20) CHECK (habitos_alimenticios IN ('MALO', 'PROMEDIO', 'BUENO')),
    imc DECIMAL(5,2),
    fecha_evaluacion DATE DEFAULT CURRENT_DATE
);

-- Tabla 4: SINTOMA (Síntomas reportados)
CREATE TABLE SINTOMA (
    sintoma_id SERIAL PRIMARY KEY,
    paciente_id INTEGER REFERENCES PACIENTE(paciente_id) ON DELETE CASCADE,
    dolor_pecho BOOLEAN DEFAULT FALSE,
    falta_aire BOOLEAN DEFAULT FALSE,
    tos_cronica BOOLEAN DEFAULT FALSE,
    perdida_peso BOOLEAN DEFAULT FALSE,
    fecha_reporte DATE DEFAULT CURRENT_DATE
);

-- Tabla 5: PRUEBA_DIAGNOSTICA (Resultados de pruebas médicas)
CREATE TABLE PRUEBA_DIAGNOSTICA (
    prueba_id SERIAL PRIMARY KEY,
    paciente_id INTEGER REFERENCES PACIENTE(paciente_id) ON DELETE CASCADE,
    funcion_pulmonar DECIMAL(5,2),
    tamano_tumor_cm DECIMAL(5,2),
    metastasis BOOLEAN DEFAULT FALSE,
    estadio VARCHAR(10) CHECK (estadio IN ('I', 'II', 'III', 'IV')),
    fecha_prueba DATE
);

-- Tabla 6: COMORBILIDAD (Tabla maestra de comorbilidades)
CREATE TABLE COMORBILIDAD (
    comorbilidad_id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) UNIQUE NOT NULL,
    descripcion TEXT
);

-- Tabla 7: PACIENTE_COMORBILIDAD (Relación muchos-a-muchos)
CREATE TABLE PACIENTE_COMORBILIDAD (
    paciente_id INTEGER REFERENCES PACIENTE(paciente_id) ON DELETE CASCADE,
    comorbilidad_id INTEGER REFERENCES COMORBILIDAD(comorbilidad_id),
    PRIMARY KEY (paciente_id, comorbilidad_id)
);

-- Tabla 8: MEDICO (Información del personal de salud)
CREATE TABLE MEDICO (
    medico_id SERIAL PRIMARY KEY,
    usuario_id INTEGER UNIQUE REFERENCES USUARIO(usuario_id),
    nombre VARCHAR(100),
    especialidad VARCHAR(100),
    licencia_medica VARCHAR(50) UNIQUE,
    hospital_institucion VARCHAR(200)
);

-- Tabla 9: RELACION_MEDICO_PACIENTE (Asignación de pacientes a médicos)
CREATE TABLE RELACION_MEDICO_PACIENTE (
    relacion_id SERIAL PRIMARY KEY,
    medico_id INTEGER REFERENCES MEDICO(medico_id),
    paciente_id INTEGER REFERENCES PACIENTE(paciente_id),
    fecha_asignacion DATE DEFAULT CURRENT_DATE,
    activo BOOLEAN DEFAULT TRUE,
    UNIQUE(medico_id, paciente_id)
);

-- Tabla 10: EVALUACION_ML (Resultados del modelo de ML)
CREATE TABLE EVALUACION_ML (
    evaluacion_id SERIAL PRIMARY KEY,
    paciente_id INTEGER REFERENCES PACIENTE(paciente_id) ON DELETE CASCADE,
    medico_id INTEGER REFERENCES MEDICO(medico_id),
    riesgo_predicho VARCHAR(20) CHECK (riesgo_predicho IN ('BAJO', 'MODERADO', 'ALTO')),
    probabilidad DECIMAL(5,4),
    variables_influyentes JSONB,
    fecha_evaluacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modelo_version VARCHAR(20),
    metadatos JSONB
);

-- Tabla 11: TRATAMIENTO (Información de tratamientos)
CREATE TABLE TRATAMIENTO (
    tratamiento_id SERIAL PRIMARY KEY,
    paciente_id INTEGER REFERENCES PACIENTE(paciente_id) ON DELETE CASCADE,
    tipo_tratamiento VARCHAR(50) CHECK (tipo_tratamiento IN ('CIRUGÍA', 'QUIMIOTERAPIA', 'RADIACIÓN', 'PALIATIVO')),
    fecha_inicio DATE,
    fecha_fin DATE,
    respuesta_medicacion VARCHAR(20) CHECK (respuesta_medicacion IN ('MALA', 'MODERADA', 'BUENA')),
    progresion_sintomas VARCHAR(20) CHECK (progresion_sintomas IN ('ESTABLE', 'MEJORANDO', 'EMPEORANDO'))
);

-- Tabla 12: SEGUIMIENTO (Visitas de seguimiento)
CREATE TABLE SEGUIMIENTO (
    seguimiento_id SERIAL PRIMARY KEY,
    paciente_id INTEGER REFERENCES PACIENTE(paciente_id) ON DELETE CASCADE,
    visita_numero INTEGER,
    fecha_visita DATE,
    observaciones TEXT,
    proxima_visita DATE,
    años_supervivencia INTEGER
);

-- Tabla 13: AUDITORIA (Registro de actividades del sistema)
CREATE TABLE AUDITORIA (
    auditoria_id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES USUARIO(usuario_id),
    accion VARCHAR(100),
    tabla_afectada VARCHAR(50),
    registro_id INTEGER,
    fecha_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    direccion_ip VARCHAR(45),
    detalles JSONB
);

-- ============================================
-- FIN DEL SCRIPT DE CREACIÓN DE TABLAS
-- ============================================