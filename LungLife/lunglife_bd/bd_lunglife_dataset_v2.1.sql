-- ============================================
-- SISTEMA LUNG LIFE - MVP
-- Script completo de tablas con recomendaciones
-- ============================================

-- 1. TABLA: ROLES (Esencial para el sistema)
CREATE TABLE roles (
    role_id SERIAL PRIMARY KEY,
    role_name VARCHAR(50) UNIQUE NOT NULL,
    description_role TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. TABLA: USERS (Autenticación principal)
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    last_login TIMESTAMP,
    login_count INTEGER DEFAULT 0,
    accept_terms BOOLEAN DEFAULT FALSE,
    accept_privacy BOOLEAN DEFAULT FALSE,
    marketing_consent BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    role_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(role_id),
    CONSTRAINT chk_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- 3. TABLA: USER_AUTH (Seguridad adicional)
CREATE TABLE user_auth (
    auth_id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    password_changed_at TIMESTAMP,
    two_fa_secret VARCHAR(255),
    two_fa_enabled BOOLEAN DEFAULT FALSE,
    two_fa_method VARCHAR(20) CHECK (two_fa_method IN ('APP', 'SMS', 'EMAIL', 'NONE')) DEFAULT 'NONE',
    failed_login_attempts INTEGER DEFAULT 0,
    account_locked_until TIMESTAMP,
    last_password_change TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_user_auth_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- 4. TABLA: PASSWORD_RESETS (Recuperación de contraseña)
CREATE TABLE password_resets (
    reset_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    password_reset_token VARCHAR(255) UNIQUE NOT NULL,
    password_reset_expires TIMESTAMP NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_password_resets_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- 5. TABLA: EMAIL_VERIFICATIONS (Verificación de email)
CREATE TABLE email_verifications (
    verification_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    verification_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    verified_at TIMESTAMP,
    email_sent_at TIMESTAMP,
    verification_type VARCHAR(20) CHECK (verification_type IN ('SIGNUP', 'CHANGE', 'RECOVERY')),
    new_email VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_email_verifications_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- 6. TABLA: PATIENT (Información demográfica del paciente)
CREATE TABLE patient (
    patient_id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(user_id),
    patient_name VARCHAR(100) NOT NULL,
    patient_last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE NOT NULL,
    gender VARCHAR(20) CHECK (gender IN ('MALE', 'FEMALE', 'OTHER')),
    height_cm DECIMAL(5,2),
    weight_kg DECIMAL(5,2),
    phone VARCHAR(20),
    country VARCHAR(100) DEFAULT 'Chile',
    city VARCHAR(100),
    area_residence VARCHAR(50) CHECK (area_residence IN ('URBAN', 'RURAL', 'SUBURBAN')),
    occupation VARCHAR(100),
    registration_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT chk_height_weight 
        CHECK (height_cm BETWEEN 50 AND 250 AND weight_kg BETWEEN 2 AND 300),
    CONSTRAINT chk_date_of_birth 
        CHECK (date_of_birth <= CURRENT_DATE - INTERVAL '1 year')
);

-- 7. TABLA: DOCTOR (Información del médico)
CREATE TABLE doctor (
    doctor_id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(user_id),
    doctor_name VARCHAR(100) NOT NULL,
    doctor_last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE,
    gender VARCHAR(20) CHECK (gender IN ('MALE', 'FEMALE', 'OTHER')),
    specialty VARCHAR(100),
    medical_license VARCHAR(50) UNIQUE NOT NULL,
    hospital_institution VARCHAR(200),
    phone VARCHAR(20),
    email_institutional VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. TABLA: RELATION_PATIENT_DOCTOR (Asignación pacientes-médicos)
CREATE TABLE relation_patient_doctor (
    relation_id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patient(patient_id),
    doctor_id INTEGER REFERENCES doctor(doctor_id),
    assignment_date DATE DEFAULT CURRENT_DATE,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(doctor_id, patient_id)
);

-- ============================================
-- ÍNDICES RECOMENDADOS (Optimización)
-- ============================================

-- USERS
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role_id);
CREATE INDEX idx_users_active ON users(is_active) WHERE is_active = TRUE;

-- USER_AUTH
CREATE INDEX idx_user_auth_user ON user_auth(user_id);
CREATE INDEX idx_user_auth_locked ON user_auth(account_locked_until) WHERE account_locked_until IS NOT NULL;

-- PASSWORD_RESETS
CREATE INDEX idx_password_resets_token ON password_resets(password_reset_token);
CREATE INDEX idx_password_resets_user_active ON password_resets(user_id, is_used, password_reset_expires);

-- EMAIL_VERIFICATIONS
CREATE INDEX idx_email_verifications_token ON email_verifications(verification_token);
CREATE INDEX idx_email_verifications_user_pending ON email_verifications(user_id, verified_at) WHERE verified_at IS NULL;

-- PATIENT
CREATE INDEX idx_patient_user_id ON patient(user_id);
CREATE INDEX idx_patient_name ON patient(patient_name, patient_last_name);
CREATE INDEX idx_patient_city ON patient(city);

-- DOCTOR
CREATE INDEX idx_doctor_user_id ON doctor(user_id);
CREATE INDEX idx_doctor_name ON doctor(doctor_name, doctor_last_name);
CREATE INDEX idx_doctor_specialty ON doctor(specialty);

-- RELATION_PATIENT_DOCTOR
CREATE INDEX idx_relation_doctor_patient ON relation_patient_doctor(doctor_id, patient_id, active);
CREATE INDEX idx_relation_active_doctors ON relation_patient_doctor(doctor_id) WHERE active = TRUE;
CREATE INDEX idx_relation_active_patients ON relation_patient_doctor(patient_id) WHERE active = TRUE;

-- ============================================
-- TRIGGERS PARA ACTUALIZACIÓN AUTOMÁTICA
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar triggers a todas las tablas con updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_auth_updated_at BEFORE UPDATE ON user_auth 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_password_resets_updated_at BEFORE UPDATE ON password_resets 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_patient_updated_at BEFORE UPDATE ON patient 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_doctor_updated_at BEFORE UPDATE ON doctor 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_relation_updated_at BEFORE UPDATE ON relation_patient_doctor 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- FUNCIÓN DE LIMPIEZA DE TOKENS EXPIRADOS
-- ============================================

CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS void AS $$
BEGIN
    DELETE FROM password_resets 
    WHERE password_reset_expires < NOW() - INTERVAL '7 days';
    
    DELETE FROM email_verifications 
    WHERE expires_at < NOW() - INTERVAL '7 days' 
    AND verified_at IS NULL;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- DATOS INICIALES ESENCIALES
-- ============================================

INSERT INTO roles (role_name, description_role) VALUES 
('PACIENTE', 'Usuario paciente del sistema'),
('MEDICO', 'Personal médico autorizado'),
('ADMINISTRADOR', 'Administrador del sistema');

-- Opcional: Insertar usuario administrador por defecto (contraseña: Admin123)
-- INSERT INTO users (email, role_id, accept_terms, accept_privacy) 
-- VALUES ('admin@lunglife.cl', 3, TRUE, TRUE);

-- ============================================
-- VISTAS ÚTILES PARA EL MVP
-- ============================================

-- Vista: Pacientes activos con su médico asignado
CREATE OR REPLACE VIEW active_patients_with_doctors AS
SELECT 
    p.patient_id,
    CONCAT(p.patient_name, ' ', p.patient_last_name) AS full_name,
    p.date_of_birth,
    p.gender,
    p.city,
    d.doctor_id,
    CONCAT(d.doctor_name, ' ', d.doctor_last_name) AS doctor_name,
    d.specialty,
    rpd.assignment_date
FROM patient p
JOIN relation_patient_doctor rpd ON p.patient_id = rpd.patient_id
JOIN doctor d ON rpd.doctor_id = d.doctor_id
WHERE rpd.active = TRUE
AND p.user_id IS NOT NULL;

-- Vista: Médicos con cantidad de pacientes activos
CREATE OR REPLACE VIEW doctors_patient_count AS
SELECT 
    d.doctor_id,
    CONCAT(d.doctor_name, ' ', d.doctor_last_name) AS full_name,
    d.specialty,
    d.hospital_institution,
    COUNT(rpd.patient_id) AS active_patients_count
FROM doctor d
LEFT JOIN relation_patient_doctor rpd ON d.doctor_id = rpd.doctor_id AND rpd.active = TRUE
GROUP BY d.doctor_id
ORDER BY active_patients_count DESC;

-- Vista: Usuarios activos con roles
CREATE OR REPLACE VIEW active_users_with_roles AS
SELECT 
    u.user_id,
    u.email,
    r.role_name,
    u.email_verified,
    u.last_login,
    u.created_at
FROM users u
JOIN roles r ON u.role_id = r.role_id
WHERE u.is_active = TRUE;

-- ============================================
-- COMENTARIOS EXPLICATIVOS
-- ============================================

COMMENT ON TABLE roles IS 'Tabla maestra de roles del sistema: Paciente, Médico, Administrador';
COMMENT ON TABLE users IS 'Usuarios del sistema con información de autenticación básica';
COMMENT ON TABLE user_auth IS 'Datos sensibles de seguridad: contraseñas, 2FA, bloqueos';
COMMENT ON TABLE password_resets IS 'Tokens temporales para recuperación de contraseñas';
COMMENT ON TABLE email_verifications IS 'Tokens para verificación y cambio de email';
COMMENT ON TABLE patient IS 'Información demográfica y clínica básica de pacientes';
COMMENT ON TABLE doctor IS 'Información profesional de médicos del sistema';
COMMENT ON TABLE relation_patient_doctor IS 'Relación de asignación entre pacientes y médicos';

COMMENT ON COLUMN patient.height_cm IS 'Altura en centímetros (rango: 50-250 cm)';
COMMENT ON COLUMN patient.weight_kg IS 'Peso en kilogramos (rango: 2-300 kg)';
COMMENT ON COLUMN patient.country IS 'País de residencia, por defecto Chile para el MVP';
COMMENT ON COLUMN doctor.medical_license IS 'Licencia médica única (ej: 12345-M)';
COMMENT ON COLUMN doctor.email_institutional IS 'Email institucional del médico';

-- ============================================
-- CONSEJOS DE IMPLEMENTACIÓN MVP
-- ============================================

/*
1. PARA COMENZAR: Ejecutar solo las tablas esenciales en este orden:
   - roles
   - users
   - patient
   - doctor
   - relation_patient_doctor

2. TABLAS OPCIONALES PARA FASE 2:
   - user_auth (si necesitas seguridad avanzada)
   - password_resets (si implementas recuperación)
   - email_verifications (si verificas emails)

3. SIMPLIFICACIÓN EXTREMA PARA MVP INICIAL:
   Si el tiempo es limitado, puedes:
   - Eliminar la tabla user_auth y mover password_hash a users
   - Eliminar triggers y usar aplicación para updated_at
   - Usar solo las vistas esenciales

4. MIGRACIÓN FUTURA:
   Este esquema está diseñado para escalar fácilmente a:
   - Tablas clínicas (factores_riesgo, sintomas, etc.)
   - Modelo ML (evaluaciones_ml)
   - Auditoría completa (audit_logs)
*/

-- ============================================
-- FIN DEL SCRIPT
-- ============================================