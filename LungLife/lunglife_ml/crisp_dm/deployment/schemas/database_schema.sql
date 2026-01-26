-- =============================================================================
-- LungLife Database Schema
-- PostgreSQL 15+
-- =============================================================================

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- ENUMS
-- =============================================================================

CREATE TYPE user_role AS ENUM ('admin', 'doctor', 'nurse', 'technician');
CREATE TYPE gender_type AS ENUM ('Male', 'Female');
CREATE TYPE prediction_result AS ENUM ('Early', 'Advanced');
CREATE TYPE risk_level_type AS ENUM ('low', 'medium', 'high');
CREATE TYPE audit_action AS ENUM ('CREATE', 'READ', 'UPDATE', 'DELETE', 'PREDICT');

-- =============================================================================
-- TABLA: users
-- Usuarios del sistema (médicos, enfermeras, técnicos)
-- =============================================================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'doctor',
    full_name VARCHAR(255) NOT NULL,
    professional_license VARCHAR(50),
    department VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- =============================================================================
-- TABLA: patients
-- Registro de pacientes
-- =============================================================================

CREATE TABLE patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_by UUID NOT NULL REFERENCES users(id),
    rut VARCHAR(12) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    birth_date DATE,
    age INTEGER CHECK (age >= 0 AND age <= 150),
    gender gender_type NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    region VARCHAR(100),
    commune VARCHAR(100),
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(20),
    medical_record_number VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_patients_rut ON patients(rut);
CREATE INDEX idx_patients_region ON patients(region);
CREATE INDEX idx_patients_created_by ON patients(created_by);

-- =============================================================================
-- TABLA: predictions
-- Registro de predicciones del modelo ML
-- =============================================================================

CREATE TABLE predictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    requested_by UUID NOT NULL REFERENCES users(id),

    -- Identificador externo de la predicción
    prediction_id VARCHAR(50) UNIQUE NOT NULL,

    -- Resultados del modelo
    prediction prediction_result NOT NULL,
    probability DECIMAL(5, 4) NOT NULL CHECK (probability >= 0 AND probability <= 1),
    confidence DECIMAL(5, 4) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    risk_level risk_level_type NOT NULL,
    requires_review BOOLEAN DEFAULT FALSE,

    -- Metadatos del modelo
    model_version VARCHAR(20) NOT NULL,
    threshold_used DECIMAL(3, 2) DEFAULT 0.50,

    -- Datos de entrada (encriptados para HIPAA/GDPR)
    input_data JSONB NOT NULL,
    input_data_hash VARCHAR(64), -- SHA-256 para verificación de integridad

    -- Interpretabilidad (SHAP)
    top_factors JSONB,

    -- Métricas de rendimiento
    processing_time_ms DECIMAL(10, 2),

    -- Estado de revisión
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_notes TEXT,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_predictions_patient ON predictions(patient_id);
CREATE INDEX idx_predictions_requested_by ON predictions(requested_by);
CREATE INDEX idx_predictions_created_at ON predictions(created_at DESC);
CREATE INDEX idx_predictions_risk_level ON predictions(risk_level);
CREATE INDEX idx_predictions_prediction ON predictions(prediction);

-- =============================================================================
-- TABLA: audit_logs
-- Registro de auditoría para trazabilidad clínica
-- =============================================================================

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    prediction_id UUID REFERENCES predictions(id) ON DELETE SET NULL,

    -- Información de la acción
    action audit_action NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,

    -- Datos de cambios
    old_values JSONB,
    new_values JSONB,

    -- Información del cliente
    ip_address INET,
    user_agent TEXT,
    request_id VARCHAR(100),

    -- Información adicional
    description TEXT,
    metadata JSONB,

    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- =============================================================================
-- FUNCIONES Y TRIGGERS
-- =============================================================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_patients_updated_at
    BEFORE UPDATE ON patients
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_predictions_updated_at
    BEFORE UPDATE ON predictions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Función para crear log de auditoría automático
CREATE OR REPLACE FUNCTION create_audit_log()
RETURNS TRIGGER AS $$
DECLARE
    action_type audit_action;
    old_data JSONB;
    new_data JSONB;
BEGIN
    IF TG_OP = 'INSERT' THEN
        action_type := 'CREATE';
        old_data := NULL;
        new_data := to_jsonb(NEW);
    ELSIF TG_OP = 'UPDATE' THEN
        action_type := 'UPDATE';
        old_data := to_jsonb(OLD);
        new_data := to_jsonb(NEW);
    ELSIF TG_OP = 'DELETE' THEN
        action_type := 'DELETE';
        old_data := to_jsonb(OLD);
        new_data := NULL;
    END IF;

    INSERT INTO audit_logs (
        user_id,
        action,
        entity_type,
        entity_id,
        old_values,
        new_values
    ) VALUES (
        COALESCE(NEW.requested_by, NEW.created_by, OLD.requested_by, OLD.created_by),
        action_type,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        old_data,
        new_data
    );

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger para auditoría de predicciones
CREATE TRIGGER audit_predictions
    AFTER INSERT OR UPDATE OR DELETE ON predictions
    FOR EACH ROW
    EXECUTE FUNCTION create_audit_log();

-- =============================================================================
-- VISTAS
-- =============================================================================

-- Vista de predicciones con información del paciente
CREATE VIEW vw_predictions_summary AS
SELECT 
    p.id,
    p.prediction_id,
    p.prediction,
    p.probability,
    p.risk_level,
    p.created_at,
    pt.rut AS patient_rut,
    pt.full_name AS patient_name,
    pt.region AS patient_region,
    u.full_name AS requested_by_name
FROM predictions p
JOIN patients pt ON p.patient_id = pt.id
JOIN users u ON p.requested_by = u.id;

-- Vista de estadísticas diarias
CREATE VIEW vw_daily_statistics AS
SELECT 
    DATE(created_at) AS date,
    COUNT(*) AS total_predictions,
    SUM(CASE WHEN prediction = 'Advanced' THEN 1 ELSE 0 END) AS advanced_count,
    SUM(CASE WHEN prediction = 'Early' THEN 1 ELSE 0 END) AS early_count,
    AVG(probability) AS avg_probability,
    AVG(processing_time_ms) AS avg_processing_time
FROM predictions
GROUP BY DATE(created_at)
ORDER BY date DESC;
