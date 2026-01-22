-- ============================================
-- LUNG LIFE DATABASE - COMPLETE SETUP SCRIPT v4.0
-- PostgreSQL Database Schema for MVP
-- Fixed syntax errors and dependencies
-- ============================================

-- ============================================
-- 1. DROP EXISTING TABLES (in reverse dependency order)
-- ============================================

-- Drop views first
DROP VIEW IF EXISTS patients_clinical_summary CASCADE;
DROP VIEW IF EXISTS lung_cancer_patients_by_stage CASCADE;
DROP VIEW IF EXISTS smoking_risk_patients CASCADE;
DROP VIEW IF EXISTS former_smokers_monitoring CASCADE;
DROP VIEW IF EXISTS active_patients_with_doctors CASCADE;
DROP VIEW IF EXISTS doctors_patient_count CASCADE;
DROP VIEW IF EXISTS active_users_with_roles CASCADE;

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS patient_comorbidities CASCADE;
DROP TABLE IF EXISTS comorbidities CASCADE;
DROP TABLE IF EXISTS diagnostic_test CASCADE;
DROP TABLE IF EXISTS symptom CASCADE;
DROP TABLE IF EXISTS medical_history CASCADE;
DROP TABLE IF EXISTS lifestyle_habits CASCADE;
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
    emergency_contact_name VARCHAR(100),
    emergency_contact_phone VARCHAR(20),
    registration_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT chk_height_weight 
        CHECK (height_cm BETWEEN 50 AND 250 AND weight_kg BETWEEN 2 AND 300),
    CONSTRAINT chk_date_of_birth 
        CHECK (date_of_birth <= CURRENT_DATE - INTERVAL '1 year')
);

-- 2.7. TABLE: doctor (Doctor professional information)
-- CREAR doctor ANTES de relation_patient_doctor
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

-- 2.8. TABLE: relation_patient_doctor (Patient-doctor assignments)
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

-- 2.9. TABLE: risk_factors (Non-smoking related risk factors)
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

-- 2.10. TABLE: smoking_history (Primary lung cancer factor - smoking)
-- CORREGIDO: Removida constraint inválida con WHERE
CREATE TABLE smoking_history (
    smoking_id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patient(patient_id) ON DELETE CASCADE,
    smoking_date DATE NOT NULL DEFAULT CURRENT_DATE,
    smoking_status VARCHAR(20) NOT NULL CHECK (smoking_status IN ('NEVER', 'FORMER_SMOKER', 'CURRENT_SMOKER')),
    cigarettes_per_day INTEGER CHECK (cigarettes_per_day >= 0 AND cigarettes_per_day <= 100),
    start_date DATE,
    quit_date DATE,
    is_current_status BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- NOTA: La constraint unique_current_status se moverá a un índice parcial
    CONSTRAINT chk_status_dates CHECK (
        (smoking_status = 'NEVER' AND start_date IS NULL AND quit_date IS NULL) OR
        (smoking_status = 'CURRENT_SMOKER' AND start_date IS NOT NULL AND quit_date IS NULL) OR
        (smoking_status = 'FORMER_SMOKER' AND start_date IS NOT NULL AND quit_date IS NOT NULL AND quit_date >= start_date)
    ),
    CONSTRAINT chk_cigarettes_amount CHECK (
        (smoking_status IN ('NEVER') AND cigarettes_per_day = 0) OR
        (smoking_status IN ('CURRENT_SMOKER', 'FORMER_SMOKER') AND cigarettes_per_day >= 0)
    )
);

-- 2.10.a TABLE: medical_history (Patient medical history)
CREATE TABLE medical_history (
    history_id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patient(patient_id) ON DELETE CASCADE,
    doctor_id INTEGER REFERENCES doctor(doctor_id),
    entry_type VARCHAR(20) NOT NULL CHECK (entry_type IN ('CONDITION', 'ALLERGY', 'MEDICATION')),
    entry_name VARCHAR(200) NOT NULL,
    details TEXT,
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'RESOLVED', 'INACTIVE')),
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_medical_history_patient FOREIGN KEY (patient_id) REFERENCES patient(patient_id),
    CONSTRAINT fk_medical_history_doctor FOREIGN KEY (doctor_id) REFERENCES doctor(doctor_id)
);

-- 2.10.b TABLE: lifestyle_habits (Patient lifestyle habits)
-- CORREGIDO: Removida constraint inválida con WHERE
CREATE TABLE lifestyle_habits (
    habit_id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patient(patient_id) ON DELETE CASCADE,
    alcohol_consumption VARCHAR(20) CHECK (alcohol_consumption IN ('NONE', 'SOCIAL', 'REGULAR', 'HEAVY')),
    alcohol_units_per_week INTEGER CHECK (alcohol_units_per_week >= 0),
    physical_activity_frequency VARCHAR(20) CHECK (physical_activity_frequency IN ('SEDENTARY', 'LIGHT', 'MODERATE', 'INTENSE')),
    physical_activity_minutes_weekly INTEGER CHECK (physical_activity_minutes_weekly >= 0),
    diet_type VARCHAR(50),
    sleep_duration_hours DECIMAL(3,1) CHECK (sleep_duration_hours >= 0 AND sleep_duration_hours <= 24),
    stress_level VARCHAR(20) CHECK (stress_level IN ('LOW', 'MODERATE', 'HIGH')),
    is_current BOOLEAN DEFAULT TRUE,
    effective_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    -- NOTA: La constraint idx_unique_current_habit se moverá a un índice parcial
);

-- 2.11. TABLE: symptom (Reported symptoms)
CREATE TABLE symptom (
    symptom_id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patient(patient_id) ON DELETE CASCADE,
    chest_pain BOOLEAN DEFAULT FALSE, -- dolor en el pecho
    shortness_of_breath BOOLEAN DEFAULT FALSE, -- dificultad para respirar
    chronic_cough BOOLEAN DEFAULT FALSE, -- tos crónica
    weight_loss BOOLEAN DEFAULT FALSE, -- pérdida de peso
    fatigue BOOLEAN DEFAULT FALSE, -- fatiga
    hemoptysis BOOLEAN DEFAULT FALSE, -- hemoptisis (tos con sangre)
    report_date DATE DEFAULT CURRENT_DATE, 
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- At least one symptom should be true for a valid record
    CONSTRAINT chk_at_least_one_symptom 
        CHECK (chest_pain = TRUE OR shortness_of_breath = TRUE OR 
               chronic_cough = TRUE OR weight_loss = TRUE OR
               fatigue = TRUE OR hemoptysis = TRUE)
);

-- 2.12. TABLE: diagnostic_test (Medical test results)
CREATE TABLE diagnostic_test (
    test_id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patient(patient_id) ON DELETE CASCADE,
    test_type VARCHAR(50) CHECK (test_type IN ('CHEST_XRAY', 'CT_SCAN', 'PET_SCAN', 'BIOPSY', 'BRONCHOSCOPY', 'SPUTUM_CYTOLOGY')),
    lung_function DECIMAL(5,2),
    tumor_size_cm DECIMAL(5,2),
    tumor_location VARCHAR(100),
    metastasis BOOLEAN DEFAULT FALSE,
    metastasis_location TEXT,
    stage_of_cancer VARCHAR(10) CHECK (stage_of_cancer IN ('IA', 'IB', 'IIA', 'IIB', 'IIIA', 'IIIB', 'IIIC', 'IVA', 'IVB')),
    treatment_type VARCHAR(50) CHECK (treatment_type IN ('SURGERY', 'CHEMOTHERAPY', 'RADIATION', 'PALLIATIVE')),
    test_date DATE,
    result_date DATE DEFAULT CURRENT_DATE,
    medical_center VARCHAR(200),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Validation: tumor size should be positive if metastasis is true
    CONSTRAINT chk_tumor_size CHECK (tumor_size_cm >= 0),
    CONSTRAINT chk_lung_function CHECK (lung_function BETWEEN 0 AND 100)
);

-- 2.13. TABLE: comorbidities (Comorbidities master table)
CREATE TABLE comorbidities (
    comorbidity_id SERIAL PRIMARY KEY,
    comorbidity_code VARCHAR(10) UNIQUE NOT NULL,
    comorbidity_name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    category VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2.14. TABLE: patient_comorbidities (Many-to-many relationship)
CREATE TABLE patient_comorbidities (
    patient_id INTEGER REFERENCES patient(patient_id) ON DELETE CASCADE,
    comorbidity_id INTEGER REFERENCES comorbidities(comorbidity_id),
    diagnosis_date DATE DEFAULT CURRENT_DATE,
    is_active BOOLEAN DEFAULT TRUE,
    treatment_status VARCHAR(20) CHECK (treatment_status IN ('UNTREATED', 'TREATED', 'CONTROLLED', 'RESOLVED')),
    notes TEXT,
    PRIMARY KEY (patient_id, comorbidity_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
CREATE INDEX idx_smoking_former_smokers ON smoking_history(patient_id) WHERE smoking_status = 'FORMER_SMOKER';
CREATE INDEX idx_smoking_current_smokers ON smoking_history(patient_id) WHERE smoking_status = 'CURRENT_SMOKER';

-- 3.8.a Índice único parcial para smoking_history (reemplaza la constraint inválida)
CREATE UNIQUE INDEX unique_current_smoking_status ON smoking_history(patient_id) WHERE is_current_status = TRUE;

-- 3.9. RELATION_PATIENT_DOCTOR indexes
CREATE INDEX idx_relation_doctor_patient ON relation_patient_doctor(doctor_id, patient_id, active);
CREATE INDEX idx_relation_active_doctors ON relation_patient_doctor(doctor_id) WHERE active = TRUE;
CREATE INDEX idx_relation_active_patients ON relation_patient_doctor(patient_id) WHERE active = TRUE;

-- 3.10. LIFESTYLE_HABITS indexes
CREATE INDEX idx_lifestyle_habits_patient ON lifestyle_habits(patient_id);
CREATE INDEX idx_lifestyle_habits_current ON lifestyle_habits(patient_id, is_current);

-- 3.10.a Índice único parcial para lifestyle_habits (reemplaza la constraint inválida)
CREATE UNIQUE INDEX unique_current_lifestyle_habit ON lifestyle_habits(patient_id) WHERE is_current = TRUE;

-- 3.11. SYMPTOM indexes
CREATE INDEX idx_symptom_patient_date ON symptom(patient_id, report_date DESC);
CREATE INDEX idx_symptom_chest_pain ON symptom(patient_id) WHERE chest_pain = TRUE;
CREATE INDEX idx_symptom_chronic_cough ON symptom(patient_id) WHERE chronic_cough = TRUE;
CREATE INDEX idx_symptom_hemoptysis ON symptom(patient_id) WHERE hemoptysis = TRUE;

-- 3.12. DIAGNOSTIC_TEST indexes
CREATE INDEX idx_diagnostic_test_patient_date ON diagnostic_test(patient_id, test_date DESC);
CREATE INDEX idx_diagnostic_test_stage ON diagnostic_test(stage_of_cancer);
CREATE INDEX idx_diagnostic_test_metastasis ON diagnostic_test(patient_id) WHERE metastasis = TRUE;
CREATE INDEX idx_diagnostic_test_type ON diagnostic_test(test_type);
CREATE INDEX idx_diagnostic_test_treatment ON diagnostic_test(treatment_type);

-- 3.13. COMORBIDITIES indexes
CREATE INDEX idx_comorbidities_name ON comorbidities(comorbidity_name);
CREATE INDEX idx_comorbidities_category ON comorbidities(category);

-- 3.14. PATIENT_COMORBIDITIES indexes
CREATE INDEX idx_patient_comorbidities_patient ON patient_comorbidities(patient_id);
CREATE INDEX idx_patient_comorbidities_comorbidity ON patient_comorbidities(comorbidity_id);
CREATE INDEX idx_patient_comorbidities_active ON patient_comorbidities(patient_id) WHERE is_active = TRUE;

-- 3.15. MEDICAL_HISTORY indexes
CREATE INDEX idx_medical_history_patient ON medical_history(patient_id);
CREATE INDEX idx_medical_history_type ON medical_history(entry_type);
CREATE INDEX idx_medical_history_status ON medical_history(status);

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

CREATE TRIGGER update_smoking_history_updated_at BEFORE UPDATE ON smoking_history 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lifestyle_habits_updated_at BEFORE UPDATE ON lifestyle_habits 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_medical_history_updated_at BEFORE UPDATE ON medical_history 
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

-- Function to calculate IMC (Body Mass Index)
CREATE OR REPLACE FUNCTION calculate_imc(weight_kg DECIMAL, height_cm DECIMAL)
RETURNS DECIMAL AS $$
BEGIN
    IF height_cm <= 0 THEN
        RETURN NULL;
    END IF;
    RETURN weight_kg / ((height_cm/100) * (height_cm/100));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- 6. INITIAL DATA
-- ============================================

-- 6.1. Insert essential roles
INSERT INTO roles (role_name, description_role) VALUES 
('PATIENT', 'System patient user'),
('DOCTOR', 'Authorized medical professional'),
('ADMINISTRATOR', 'System administrator');

-- 6.2. Insert comorbidities master data
INSERT INTO comorbidities (comorbidity_code, comorbidity_name, category) VALUES
('DIAB', 'DIABETES', 'METABOLIC'),
('HYP', 'HYPERTENSION', 'CARDIOVASCULAR'),
('COPD', 'CHRONIC OBSTRUCTIVE PULMONARY DISEASE', 'RESPIRATORY'),
('ASTH', 'ASTHMA', 'RESPIRATORY'),
('CAD', 'CORONARY ARTERY DISEASE', 'CARDIOVASCULAR'),
('OBES', 'OBESITY', 'METABOLIC'),
('CKD', 'CHRONIC KIDNEY DISEASE', 'RENAL'),
('CIRR', 'CIRRHOSIS', 'HEPATIC'),
('HIV', 'HIV/AIDS', 'INFECTIOUS'),
('AUTO', 'AUTOIMMUNE DISEASE', 'IMMUNOLOGICAL'),
('NONE', 'NO COMORBIDITIES', 'GENERAL');

-- ============================================
-- 7. USEFUL VIEWS FOR THE MVP
-- ============================================

-- 7.1. View: Active patients with their assigned doctors
CREATE OR REPLACE VIEW active_patients_with_doctors AS
SELECT 
    p.patient_id,
    CONCAT(p.patient_name, ' ', p.patient_last_name) AS patient_full_name,
    p.date_of_birth,
    calculate_age(p.date_of_birth) AS age,
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
-- NOTA: Esta vista necesita columnas calculadas que no existen en la tabla
-- Vamos a crear una vista auxiliar para calcular estos valores
CREATE OR REPLACE VIEW vw_smoking_calculations AS
SELECT 
    smoking_id,
    patient_id,
    smoking_date,
    smoking_status,
    cigarettes_per_day,
    start_date,
    quit_date,
    is_current_status,
    created_at,
    updated_at,
    -- Cálculo de años fumando
    CASE
        WHEN smoking_status = 'NEVER' THEN 0
        WHEN smoking_status = 'CURRENT_SMOKER' AND start_date IS NOT NULL THEN 
            EXTRACT(YEAR FROM AGE(CURRENT_DATE, start_date))
        WHEN smoking_status = 'FORMER_SMOKER' AND start_date IS NOT NULL THEN 
            EXTRACT(YEAR FROM AGE(COALESCE(quit_date, CURRENT_DATE), start_date))
        ELSE 0
    END AS years_smoking,
    -- Cálculo de pack-years (pack = 20 cigarrillos)
    CASE
        WHEN smoking_status = 'NEVER' THEN 0.0
        WHEN smoking_status = 'CURRENT_SMOKER' AND start_date IS NOT NULL THEN 
            ROUND((cigarettes_per_day / 20.0) * EXTRACT(YEAR FROM AGE(CURRENT_DATE, start_date)), 2)
        WHEN smoking_status = 'FORMER_SMOKER' AND start_date IS NOT NULL AND quit_date IS NOT NULL THEN 
            ROUND((cigarettes_per_day / 20.0) * EXTRACT(YEAR FROM AGE(quit_date, start_date)), 2)
        ELSE 0.0
    END AS pack_years,
    -- Años desde que dejó de fumar
    CASE
        WHEN smoking_status = 'FORMER_SMOKER' AND quit_date IS NOT NULL THEN 
            EXTRACT(YEAR FROM AGE(CURRENT_DATE, quit_date))
        ELSE NULL
    END AS years_since_quitting
FROM smoking_history
WHERE is_current_status = TRUE;

-- Ahora actualizamos smoking_risk_patients para usar la vista de cálculos
CREATE OR REPLACE VIEW smoking_risk_patients AS
SELECT 
    p.patient_id,
    CONCAT(p.patient_name, ' ', p.patient_last_name) AS patient_full_name,
    p.date_of_birth,
    calculate_age(p.date_of_birth) AS age,
    p.gender,
    sc.smoking_status,
    sc.years_smoking,
    sc.pack_years,
    sc.cigarettes_per_day,
    CASE 
        WHEN sc.pack_years > 30 THEN 'HIGH'
        WHEN sc.pack_years > 15 THEN 'MODERATE'
        WHEN sc.pack_years > 0 THEN 'LOW'
        ELSE 'NONE'
    END AS smoking_risk_level
FROM patient p
LEFT JOIN vw_smoking_calculations sc ON p.patient_id = sc.patient_id
ORDER BY sc.pack_years DESC NULLS LAST;

-- 7.5. View: Former smokers for monitoring and follow-up
CREATE OR REPLACE VIEW former_smokers_monitoring AS
SELECT 
    p.patient_id,
    CONCAT(p.patient_name, ' ', p.patient_last_name) AS patient_full_name,
    sc.quit_date,
    sc.years_since_quitting,
    sc.pack_years,
    p.city,
    p.area_residence
FROM patient p
JOIN vw_smoking_calculations sc ON p.patient_id = sc.patient_id
WHERE sc.smoking_status = 'FORMER_SMOKER'
ORDER BY sc.quit_date DESC;

-- 7.6. View: Patients with symptoms and their latest test
CREATE OR REPLACE VIEW patients_clinical_summary AS
SELECT 
    p.patient_id,
    CONCAT(p.patient_name, ' ', p.patient_last_name) AS patient_name,
    p.date_of_birth,
    calculate_age(p.date_of_birth) AS age,
    p.gender,
    -- Latest symptoms
    MAX(s.report_date) AS last_symptom_date,
    BOOL_OR(s.chest_pain) AS has_chest_pain,
    BOOL_OR(s.shortness_of_breath) AS has_shortness_of_breath,
    BOOL_OR(s.chronic_cough) AS has_chronic_cough,
    BOOL_OR(s.hemoptysis) AS has_hemoptysis,
    -- Smoking status from calculations
    sc.smoking_status,
    sc.pack_years,
    -- Latest test
    dt.stage_of_cancer AS latest_stage,
    dt.test_date AS latest_test_date,
    dt.metastasis AS has_metastasis,
    -- Comorbidities count
    COUNT(DISTINCT pc.comorbidity_id) FILTER (WHERE pc.is_active = TRUE) AS active_comorbidity_count
FROM patient p
LEFT JOIN symptom s ON p.patient_id = s.patient_id
LEFT JOIN vw_smoking_calculations sc ON p.patient_id = sc.patient_id
LEFT JOIN diagnostic_test dt ON p.patient_id = dt.patient_id 
    AND dt.test_date = (SELECT MAX(test_date) FROM diagnostic_test WHERE patient_id = p.patient_id)
LEFT JOIN patient_comorbidities pc ON p.patient_id = pc.patient_id
GROUP BY p.patient_id, p.patient_name, p.patient_last_name, p.date_of_birth, p.gender, 
         sc.smoking_status, sc.pack_years,
         dt.stage_of_cancer, dt.test_date, dt.metastasis;

-- 7.7. View: Patients with lung cancer by stage
CREATE OR REPLACE VIEW lung_cancer_patients_by_stage AS
SELECT 
    stage_of_cancer,
    COUNT(DISTINCT patient_id) AS patient_count,
    ROUND(AVG(tumor_size_cm), 2) AS avg_tumor_size,
    SUM(CASE WHEN metastasis = TRUE THEN 1 ELSE 0 END) AS metastasis_count
FROM diagnostic_test
WHERE stage_of_cancer IS NOT NULL
GROUP BY stage_of_cancer
ORDER BY 
    CASE stage_of_cancer
        WHEN 'IA' THEN 1
        WHEN 'IB' THEN 2
        WHEN 'IIA' THEN 3
        WHEN 'IIB' THEN 4
        WHEN 'IIIA' THEN 5
        WHEN 'IIIB' THEN 6
        WHEN 'IIIC' THEN 7
        WHEN 'IVA' THEN 8
        WHEN 'IVB' THEN 9
        ELSE 10
    END;

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
COMMENT ON TABLE medical_history IS 'Patient medical history including conditions, allergies, medications';
COMMENT ON TABLE lifestyle_habits IS 'Patient lifestyle habits including alcohol, exercise, diet, sleep';
COMMENT ON TABLE symptom IS 'Reported symptoms by patients';
COMMENT ON TABLE diagnostic_test IS 'Medical diagnostic test results and cancer staging';
COMMENT ON TABLE comorbidities IS 'Master table of possible comorbidities';
COMMENT ON TABLE patient_comorbidities IS 'Many-to-many relationship between patients and comorbidities';

COMMENT ON COLUMN patient.height_cm IS 'Height in centimeters (range: 50-250 cm)';
COMMENT ON COLUMN patient.weight_kg IS 'Weight in kilograms (range: 2-300 kg)';
COMMENT ON COLUMN patient.country IS 'Country of residence, default Chile for MVP context';
COMMENT ON COLUMN doctor.medical_license IS 'Unique medical license (e.g., 12345-M)';
COMMENT ON COLUMN doctor.email_institutional IS 'Institutional email of the doctor';
COMMENT ON COLUMN smoking_history.is_current_status IS 'Indicates if this is the current smoking status';
COMMENT ON COLUMN diagnostic_test.lung_function IS 'Lung function test result (FEV1 percentage)';
COMMENT ON COLUMN diagnostic_test.stage_of_cancer IS 'TNM staging system for lung cancer';

-- ============================================
-- 9. DATABASE SUMMARY
-- ============================================

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
    RAISE NOTICE 'LUNG LIFE DATABASE SETUP COMPLETE v4.3';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Tables created: %', table_count;
    RAISE NOTICE 'Views created: %', view_count;
    RAISE NOTICE 'Indexes created: %', index_count;
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Fixed issues:';
    RAISE NOTICE '1. Removed invalid WHERE clauses from table constraints';
    RAISE NOTICE '2. Added missing doctor table before relation_patient_doctor';
    RAISE NOTICE '3. Added vw_smoking_calculations view for computed columns';
    RAISE NOTICE '4. Added partial unique indexes for current records';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Database ready for MVP development!';
    RAISE NOTICE '============================================';
END $$;

-- ============================================
-- 10. IMPORTANT NOTES FOR MVP DEVELOPMENT
-- ============================================

/*
PHASED IMPLEMENTATION RECOMMENDATION:

PHASE 1 (Core System):
   - roles, users, user_auth
   - patient, doctor, relation_patient_doctor

PHASE 2 (Risk Factors Collection):
   - risk_factors, smoking_history
   - symptom, comorbidities, patient_comorbidities
   - medical_history, lifestyle_habits

PHASE 3 (Diagnostic Data):
   - diagnostic_test

PHASE 4 (ML Integration):
   - Add ml_predictions table for model results

SECURITY NOTES:
   - Always hash passwords at application level
   - Use HTTPS for all API calls
   - Implement rate limiting for authentication endpoints
   - Regularly run cleanup_expired_tokens() function

PERFORMANCE TIPS:
   - The indexes are optimized for common query patterns
   - Views pre-calculate frequently needed data
   - Consider partitioning large tables by date in production

NEXT STEPS:
   1. Create API endpoints for each table
   2. Implement authentication middleware
   3. Build frontend components for data entry
   4. Integrate ML model for risk prediction

FIXED ISSUES IN THIS VERSION:
   1. Removed CONSTRAINT ... WHERE syntax which is invalid in PostgreSQL
   2. Replaced with CREATE UNIQUE INDEX ... WHERE (partial unique indexes)
   3. Fixed table creation order (doctor before relation_patient_doctor)
   4. Added missing tables to DROP statements
   5. Added vw_smoking_calculations view for computed smoking metrics
*/

-- ============================================
-- END OF SCRIPT
-- ============================================