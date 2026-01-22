-- ============================================
-- LUNG LIFE DATABASE - COMPLETE SETUP SCRIPT
-- PostgreSQL Database Schema for MVP
-- ============================================

-- ============================================
-- 1. DROP EXISTING TABLES (in reverse dependency order)
-- ============================================

DROP TABLE IF EXISTS relation_patient_doctor CASCADE;
DROP TABLE IF EXISTS smoking_history CASCADE;
DROP TABLE IF EXISTS risk_factors CASCADE;
DROP TABLE IF EXISTS doctor CASCADE;
DROP TABLE IF EXISTS patient CASCADE;
DROP TABLE IF EXISTS email_verifications CASCADE;
DROP TABLE IF EXISTS password_resets CASCADE;
DROP TABLE IF EXISTS user_auth CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS roles CASCADE;

DROP VIEW IF EXISTS smoking_risk_patients CASCADE;
DROP VIEW IF EXISTS former_smokers_monitoring CASCADE;
DROP VIEW IF EXISTS active_patients_with_doctors CASCADE;
DROP VIEW IF EXISTS doctors_patient_count CASCADE;
DROP VIEW IF EXISTS active_users_with_roles CASCADE;

-- ============================================
-- 2. TABLE CREATION
-- ============================================

-- 2.1. TABLE: roles (Master table for system roles)
CREATE TABLE roles (
    role_id SERIAL PRIMARY KEY,
    role_name VARCHAR(50) UNIQUE NOT NULL,
    description_role TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2.2. TABLE: users (Main authentication table)
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

-- 2.3. TABLE: user_auth (Extended authentication security)
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

-- 2.4. TABLE: password_resets (Password recovery tokens)
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

-- 2.5. TABLE: email_verifications (Email verification tokens)
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

-- 2.6. TABLE: patient (Patient demographic information)
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

-- 2.7. TABLE: doctor (Doctor professional information)
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

-- 2.8. TABLE: risk_factors (Non-smoking related risk factors)
CREATE TABLE risk_factors (
    factor_id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patient(patient_id) ON DELETE CASCADE,
    family_history_cancer BOOLEAN DEFAULT FALSE,
    toxin_exposure BOOLEAN DEFAULT FALSE,
    air_quality_index INTEGER,
    physical_activity_level VARCHAR(20) CHECK (physical_activity_level IN ('LOW', 'MODERATE', 'HIGH')),
    dietary_habits VARCHAR(20) CHECK (dietary_habits IN ('POOR', 'AVERAGE', 'GOOD')),
    imc DECIMAL(5,2),
    evaluation_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2.9. TABLE: smoking_history (Primary lung cancer factor - smoking)
CREATE TABLE smoking_history (
    smoking_id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patient(patient_id) ON DELETE CASCADE,
    
    -- Current status
    smoking_status VARCHAR(20) CHECK (smoking_status IN ('NEVER', 'FORMER_SMOKER', 'CURRENT_SMOKER')),
    
    -- Quantitative history
    years_smoking INTEGER DEFAULT 0,
    pack_years DECIMAL(5,2) DEFAULT 0.0,
    cigarettes_per_day INTEGER,
    
    -- For former smokers
    quit_date DATE,
    years_since_quitting INTEGER,
    
    -- Temporal control (SIMPLIFIED - single date)
    recorded_date DATE DEFAULT CURRENT_DATE,
    is_current_status BOOLEAN DEFAULT TRUE,
    
    -- Smoking-specific validations
    CONSTRAINT chk_smoking_consistency CHECK (
        (smoking_status = 'NEVER' AND years_smoking = 0 AND pack_years = 0) OR
        (smoking_status IN ('FORMER_SMOKER', 'CURRENT_SMOKER') AND years_smoking >= 0 AND pack_years >= 0)
    ),
    CONSTRAINT chk_cigarettes_per_day CHECK (cigarettes_per_day BETWEEN 0 AND 100)
);

-- 2.10. TABLE: relation_patient_doctor (Patient-doctor assignments)
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
-- 3. INDEXES FOR PERFORMANCE OPTIMIZATION
-- ============================================

-- 3.1. USERS indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role_id);
CREATE INDEX idx_users_active ON users(is_active) WHERE is_active = TRUE;

-- 3.2. USER_AUTH indexes
CREATE INDEX idx_user_auth_user ON user_auth(user_id);
CREATE INDEX idx_user_auth_locked ON user_auth(account_locked_until) WHERE account_locked_until IS NOT NULL;

-- 3.3. PASSWORD_RESETS indexes
CREATE INDEX idx_password_resets_token ON password_resets(password_reset_token);
CREATE INDEX idx_password_resets_user_active ON password_resets(user_id, is_used, password_reset_expires);

-- 3.4. EMAIL_VERIFICATIONS indexes
CREATE INDEX idx_email_verifications_token ON email_verifications(verification_token);
CREATE INDEX idx_email_verifications_user_pending ON email_verifications(user_id, verified_at) WHERE verified_at IS NULL;

-- 3.5. PATIENT indexes
CREATE INDEX idx_patient_user_id ON patient(user_id);
CREATE INDEX idx_patient_name ON patient(patient_name, patient_last_name);
CREATE INDEX idx_patient_city ON patient(city);

-- 3.6. DOCTOR indexes
CREATE INDEX idx_doctor_user_id ON doctor(user_id);
CREATE INDEX idx_doctor_name ON doctor(doctor_name, doctor_last_name);
CREATE INDEX idx_doctor_specialty ON doctor(specialty);

-- 3.7. RISK_FACTORS indexes
CREATE INDEX idx_risk_factors_patient ON risk_factors(patient_id);
CREATE INDEX idx_risk_factors_evaluation_date ON risk_factors(evaluation_date);

-- 3.8. SMOKING_HISTORY indexes (PRIORITY for lung cancer focus)
CREATE INDEX idx_smoking_current_status ON smoking_history(patient_id, is_current_status) WHERE is_current_status = TRUE;
CREATE INDEX idx_smoking_status ON smoking_history(smoking_status);
CREATE INDEX idx_smoking_pack_years ON smoking_history(pack_years DESC);
CREATE INDEX idx_smoking_former_smokers ON smoking_history(patient_id) WHERE smoking_status = 'FORMER_SMOKER';
CREATE INDEX idx_smoking_current_smokers ON smoking_history(patient_id) WHERE smoking_status = 'CURRENT_SMOKER';

-- 3.9. RELATION_PATIENT_DOCTOR indexes
CREATE INDEX idx_relation_doctor_patient ON relation_patient_doctor(doctor_id, patient_id, active);
CREATE INDEX idx_relation_active_doctors ON relation_patient_doctor(doctor_id) WHERE active = TRUE;
CREATE INDEX idx_relation_active_patients ON relation_patient_doctor(patient_id) WHERE active = TRUE;

-- ============================================
-- 4. TRIGGERS FOR AUTOMATIC UPDATES
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to all tables with updated_at column
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
-- 5. USEFUL FUNCTIONS
-- ============================================

-- Function to clean up expired tokens (run periodically)
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

-- Function to calculate age from date of birth
CREATE OR REPLACE FUNCTION calculate_age(birth_date DATE)
RETURNS INTEGER AS $$
BEGIN
    RETURN DATE_PART('year', AGE(birth_date));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- 6. INITIAL DATA
-- ============================================

-- 6.1. Insert essential roles
INSERT INTO roles (role_name, description_role) VALUES 
('PACIENTE', 'System patient user'),
('MEDICO', 'Authorized medical professional'),
('ADMINISTRADOR', 'System administrator');

-- 6.2. Optional: Insert default admin user (password: Admin123)
-- Note: Password hash should be generated by your application
-- INSERT INTO users (email, password_hash, role_id, accept_terms, accept_privacy) 
-- VALUES ('admin@lunglife.cl', '$2a$12$...', 3, TRUE, TRUE);

-- ============================================
-- 7. USEFUL VIEWS FOR THE MVP
-- ============================================

-- 7.1. View: Active patients with their assigned doctors
CREATE OR REPLACE VIEW active_patients_with_doctors AS
SELECT 
    p.patient_id,
    CONCAT(p.patient_name, ' ', p.patient_last_name) AS patient_full_name,
    p.date_of_birth,
    p.gender,
    p.city,
    d.doctor_id,
    CONCAT(d.doctor_name, ' ', d.doctor_last_name) AS doctor_full_name,
    d.specialty,
    rpd.assignment_date
FROM patient p
JOIN relation_patient_doctor rpd ON p.patient_id = rpd.patient_id
JOIN doctor d ON rpd.doctor_id = d.doctor_id
WHERE rpd.active = TRUE
AND p.user_id IS NOT NULL;

-- 7.2. View: Doctors with active patient count
CREATE OR REPLACE VIEW doctors_patient_count AS
SELECT 
    d.doctor_id,
    CONCAT(d.doctor_name, ' ', d.doctor_last_name) AS doctor_full_name,
    d.specialty,
    d.hospital_institution,
    COUNT(rpd.patient_id) AS active_patients_count
FROM doctor d
LEFT JOIN relation_patient_doctor rpd ON d.doctor_id = rpd.doctor_id AND rpd.active = TRUE
GROUP BY d.doctor_id
ORDER BY active_patients_count DESC;

-- 7.3. View: Active users with roles
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

-- 7.4. View: Patients with smoking risk assessment (LUNG CANCER FOCUS)
CREATE OR REPLACE VIEW smoking_risk_patients AS
SELECT 
    p.patient_id,
    CONCAT(p.patient_name, ' ', p.patient_last_name) AS patient_full_name,
    p.date_of_birth,
    calculate_age(p.date_of_birth) AS age,
    p.gender,
    sh.smoking_status,
    sh.years_smoking,
    sh.pack_years,
    sh.cigarettes_per_day,
    CASE 
        WHEN sh.pack_years > 30 THEN 'HIGH'
        WHEN sh.pack_years > 15 THEN 'MODERATE'
        WHEN sh.pack_years > 0 THEN 'LOW'
        ELSE 'NONE'
    END AS smoking_risk_level
FROM patient p
LEFT JOIN smoking_history sh ON p.patient_id = sh.patient_id
WHERE sh.is_current_status = TRUE
ORDER BY sh.pack_years DESC NULLS LAST;

-- 7.5. View: Former smokers for monitoring and follow-up
CREATE OR REPLACE VIEW former_smokers_monitoring AS
SELECT 
    p.patient_id,
    CONCAT(p.patient_name, ' ', p.patient_last_name) AS patient_full_name,
    sh.quit_date,
    sh.years_since_quitting,
    sh.pack_years,
    p.city,
    p.area_residence
FROM patient p
JOIN smoking_history sh ON p.patient_id = sh.patient_id
WHERE sh.smoking_status = 'FORMER_SMOKER'
AND sh.is_current_status = TRUE
ORDER BY sh.quit_date DESC;

-- ============================================
-- 8. TABLE COMMENTS (Documentation)
-- ============================================

COMMENT ON TABLE roles IS 'Master table for system roles: Patient, Doctor, Administrator';
COMMENT ON TABLE users IS 'System users with basic authentication information';
COMMENT ON TABLE user_auth IS 'Sensitive security data: passwords, 2FA, account locks';
COMMENT ON TABLE password_resets IS 'Temporary tokens for password recovery';
COMMENT ON TABLE email_verifications IS 'Tokens for email verification and changes';
COMMENT ON TABLE patient IS 'Demographic and basic clinical patient information';
COMMENT ON TABLE doctor IS 'Professional information of system doctors';
COMMENT ON TABLE risk_factors IS 'Non-smoking related risk factors for patients';
COMMENT ON TABLE smoking_history IS 'Primary lung cancer factor - smoking history and status';
COMMENT ON TABLE relation_patient_doctor IS 'Assignment relationship between patients and doctors';

COMMENT ON COLUMN patient.height_cm IS 'Height in centimeters (range: 50-250 cm)';
COMMENT ON COLUMN patient.weight_kg IS 'Weight in kilograms (range: 2-300 kg)';
COMMENT ON COLUMN patient.country IS 'Country of residence, default Chile for MVP context';
COMMENT ON COLUMN doctor.medical_license IS 'Unique medical license (e.g., 12345-M)';
COMMENT ON COLUMN doctor.email_institutional IS 'Institutional email of the doctor';
COMMENT ON COLUMN smoking_history.pack_years IS 'Pack-years calculation: packs/day × years smoked';
COMMENT ON COLUMN smoking_history.is_current_status IS 'Indicates if this is the current smoking status';

-- ============================================
-- 9. MVP IMPLEMENTATION NOTES
-- ============================================

/*
PHASED IMPLEMENTATION RECOMMENDATION:

PHASE 1 (Week 1): Core authentication and user management
   - roles, users, user_auth
   - Essential for all other functionality

PHASE 2 (Week 2): Patient and doctor management
   - patient, doctor, relation_patient_doctor
   - Basic system structure

PHASE 3 (Week 3): Risk factor collection
   - risk_factors, smoking_history
   - Core data for ML model

OPTIONAL TABLES FOR LATER PHASES:
   - audit_logs (for security auditing)
   - medical_tests (for test results storage)
   - ml_predictions (for ML model results)
   - appointments (for scheduling)

PERFORMANCE NOTES:
   - Indexes are optimized for common queries
   - Views pre-calculate frequently needed data
   - Triggers maintain data consistency automatically

SECURITY NOTES:
   - Password hashing should be done at application level
   - 2FA is optional and can be enabled later
   - Regular cleanup of expired tokens recommended
*/

-- ============================================
-- SCRIPT COMPLETION
-- ============================================

-- Display creation summary
DO $$
DECLARE
    table_count INTEGER;
    view_count INTEGER;
    index_count INTEGER;
BEGIN
    -- Count created tables
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE';
    
    -- Count created views
    SELECT COUNT(*) INTO view_count
    FROM information_schema.views 
    WHERE table_schema = 'public';
    
    -- Count created indexes (approximate)
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes 
    WHERE schemaname = 'public';
    
    RAISE NOTICE '============================================';
    RAISE NOTICE 'LUNG LIFE DATABASE SETUP COMPLETE';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Tables created: %', table_count;
    RAISE NOTICE 'Views created: %', view_count;
    RAISE NOTICE 'Indexes created: %', index_count;
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Ready for MVP development!';
    RAISE NOTICE '============================================';
END $$;

-- ============================================
-- END OF SCRIPT
-- ============================================