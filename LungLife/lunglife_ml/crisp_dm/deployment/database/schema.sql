
-- =============================================================================
-- LUNGLIFE - POSTGRESQL SCHEMA v1.0
-- Fase 6: Deployment - Persistencia de Predicciones
-- =============================================================================

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- TABLA: users
-- Médicos y administradores del sistema
-- =============================================================================
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    first_name      VARCHAR(100) NOT NULL,
    last_name       VARCHAR(100) NOT NULL,
    role            VARCHAR(50) NOT NULL DEFAULT 'physician'
                    CHECK (role IN ('admin', 'physician', 'researcher')),
    institution     VARCHAR(255),
    license_number  VARCHAR(50),  -- Número de registro médico
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE
);

-- Trigger para updated_at automático
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

-- =============================================================================
-- TABLA: patients
-- Datos de pacientes (campos sensibles encriptados)
-- =============================================================================
CREATE TABLE patients (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_by      UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    -- Campos sensibles encriptados con pgcrypto
    rut_encrypted   BYTEA UNIQUE,  -- RUT chileno encriptado
    first_name_enc  BYTEA NOT NULL,
    last_name_enc   BYTEA NOT NULL,
    -- Datos demográficos
    birth_date      DATE NOT NULL,
    gender          VARCHAR(10) NOT NULL CHECK (gender IN ('M', 'F', 'Other')),
    region          VARCHAR(100),
    commune         VARCHAR(100),
    contact_phone   BYTEA,  -- Encriptado
    -- Metadatos
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE
);

CREATE TRIGGER patients_updated_at
    BEFORE UPDATE ON patients
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

-- =============================================================================
-- TABLA: predictions
-- Resultados de predicciones del modelo ML
-- =============================================================================
CREATE TABLE predictions (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id       UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
    created_by       UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    -- Resultado de la predicción
    prediction       VARCHAR(20) NOT NULL CHECK (prediction IN ('Early', 'Advanced')),
    probability      DECIMAL(5,4) NOT NULL CHECK (probability >= 0 AND probability <= 1),
    risk_level       VARCHAR(10) NOT NULL CHECK (risk_level IN ('low', 'medium', 'high')),
    confidence       DECIMAL(5,4) CHECK (confidence >= 0 AND confidence <= 1),
    requires_review  BOOLEAN NOT NULL DEFAULT false,
    recommendation   TEXT,
    -- Datos técnicos
    input_data       JSONB NOT NULL,         -- Datos enviados al modelo
    risk_factors     JSONB,                  -- Factores de riesgo identificados
    feature_values   JSONB,                  -- Valores de features procesados
    model_version    VARCHAR(20) NOT NULL,   -- Versión del modelo usado
    inference_time   INTEGER,                -- Tiempo de inferencia en ms
    -- Revisión clínica
    reviewed_by      UUID REFERENCES users(id),
    review_notes     TEXT,
    review_decision  VARCHAR(20) CHECK (review_decision IN ('confirmed', 'rejected', 'pending')),
    reviewed_at      TIMESTAMP WITH TIME ZONE,
    -- Metadatos
    created_at       TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para consultas frecuentes
CREATE INDEX idx_predictions_patient_id ON predictions(patient_id);
CREATE INDEX idx_predictions_created_at ON predictions(created_at DESC);
CREATE INDEX idx_predictions_risk_level ON predictions(risk_level);
CREATE INDEX idx_predictions_requires_review ON predictions(requires_review) WHERE requires_review = true;
CREATE INDEX idx_predictions_model_version ON predictions(model_version);

-- Índice GIN para búsqueda en JSONB
CREATE INDEX idx_predictions_risk_factors ON predictions USING GIN (risk_factors);

-- =============================================================================
-- TABLA: audit_logs
-- Registro de auditoría para trazabilidad
-- =============================================================================
CREATE TABLE audit_logs (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id          UUID REFERENCES users(id) ON DELETE SET NULL,
    prediction_id    UUID REFERENCES predictions(id) ON DELETE SET NULL,
    -- Información del evento
    action           VARCHAR(50) NOT NULL
                     CHECK (action IN (
                         'CREATE_PREDICTION', 'VIEW_PREDICTION', 'EXPORT_PREDICTION',
                         'CREATE_PATIENT', 'UPDATE_PATIENT', 'VIEW_PATIENT',
                         'LOGIN', 'LOGOUT', 'FAILED_LOGIN',
                         'CREATE_USER', 'UPDATE_USER', 'DELETE_USER'
                     )),
    resource_type    VARCHAR(50) NOT NULL,
    resource_id      UUID,
    -- Datos de la petición
    request_data     JSONB,       -- Payload sanitizado (sin datos sensibles)
    response_status  INTEGER,     -- Código HTTP de respuesta
    error_message    TEXT,        -- Mensaje de error si aplica
    -- Información del cliente
    ip_address       INET,
    user_agent       TEXT,
    session_id       UUID,
    -- Performance
    duration_ms      INTEGER,     -- Duración de la operación
    -- Timestamp
    created_at       TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para auditoría
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_prediction_id ON audit_logs(prediction_id);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

-- Particionamiento por fecha para audit_logs (opcional para alto volumen)
-- CREATE TABLE audit_logs_2024 PARTITION OF audit_logs
--     FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

-- =============================================================================
-- VISTAS ÚTILES
-- =============================================================================

-- Vista: Resumen de predicciones por paciente
CREATE OR REPLACE VIEW v_patient_predictions AS
SELECT 
    p.id AS patient_id,
    p.birth_date,
    p.gender,
    p.region,
    COUNT(pr.id) AS total_predictions,
    COUNT(pr.id) FILTER (WHERE pr.risk_level = 'high') AS high_risk_count,
    MAX(pr.probability) AS max_probability,
    MAX(pr.created_at) AS last_prediction_at
FROM patients p
LEFT JOIN predictions pr ON p.id = pr.patient_id
GROUP BY p.id;

-- Vista: Predicciones pendientes de revisión
CREATE OR REPLACE VIEW v_pending_reviews AS
SELECT 
    pr.id AS prediction_id,
    pr.patient_id,
    pr.prediction,
    pr.probability,
    pr.risk_level,
    pr.recommendation,
    pr.created_at,
    u.email AS created_by_email,
    u.first_name || ' ' || u.last_name AS created_by_name
FROM predictions pr
JOIN users u ON pr.created_by = u.id
WHERE pr.requires_review = true 
  AND pr.reviewed_at IS NULL
ORDER BY pr.created_at DESC;

-- Vista: Estadísticas del modelo por versión
CREATE OR REPLACE VIEW v_model_statistics AS
SELECT 
    model_version,
    COUNT(*) AS total_predictions,
    AVG(probability) AS avg_probability,
    AVG(inference_time) AS avg_inference_time_ms,
    COUNT(*) FILTER (WHERE risk_level = 'low') AS low_risk,
    COUNT(*) FILTER (WHERE risk_level = 'medium') AS medium_risk,
    COUNT(*) FILTER (WHERE risk_level = 'high') AS high_risk,
    MIN(created_at) AS first_used,
    MAX(created_at) AS last_used
FROM predictions
GROUP BY model_version
ORDER BY MAX(created_at) DESC;

-- =============================================================================
-- FUNCIONES ALMACENADAS
-- =============================================================================

-- Función: Crear registro de auditoría
CREATE OR REPLACE FUNCTION log_audit_event(
    p_user_id UUID,
    p_action VARCHAR(50),
    p_resource_type VARCHAR(50),
    p_resource_id UUID DEFAULT NULL,
    p_prediction_id UUID DEFAULT NULL,
    p_request_data JSONB DEFAULT NULL,
    p_response_status INTEGER DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_duration_ms INTEGER DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_audit_id UUID;
BEGIN
    INSERT INTO audit_logs (
        user_id, action, resource_type, resource_id, prediction_id,
        request_data, response_status, ip_address, user_agent, duration_ms
    ) VALUES (
        p_user_id, p_action, p_resource_type, p_resource_id, p_prediction_id,
        p_request_data, p_response_status, p_ip_address, p_user_agent::TEXT, p_duration_ms
    )
    RETURNING id INTO v_audit_id;

    RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql;

-- Función: Obtener historial de predicciones de un paciente
CREATE OR REPLACE FUNCTION get_patient_history(p_patient_id UUID)
RETURNS TABLE (
    prediction_id UUID,
    prediction VARCHAR(20),
    probability DECIMAL(5,4),
    risk_level VARCHAR(10),
    model_version VARCHAR(20),
    reviewed BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pr.id,
        pr.prediction,
        pr.probability,
        pr.risk_level,
        pr.model_version,
        pr.reviewed_at IS NOT NULL,
        pr.created_at
    FROM predictions pr
    WHERE pr.patient_id = p_patient_id
    ORDER BY pr.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- POLÍTICAS DE SEGURIDAD (Row Level Security)
-- =============================================================================

-- Habilitar RLS en tablas sensibles
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;

-- Los médicos solo ven pacientes que ellos crearon
CREATE POLICY patient_physician_policy ON patients
    FOR ALL
    TO PUBLIC
    USING (created_by = current_setting('app.current_user_id')::UUID);

-- Los administradores ven todo
CREATE POLICY patient_admin_policy ON patients
    FOR ALL
    TO PUBLIC
    USING (current_setting('app.user_role', true) = 'admin');

-- Políticas similares para predictions
CREATE POLICY prediction_physician_policy ON predictions
    FOR ALL
    TO PUBLIC
    USING (created_by = current_setting('app.current_user_id')::UUID);

CREATE POLICY prediction_admin_policy ON predictions
    FOR ALL
    TO PUBLIC
    USING (current_setting('app.user_role', true) = 'admin');
