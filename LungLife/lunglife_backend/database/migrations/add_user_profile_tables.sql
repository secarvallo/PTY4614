-- =====================================================
-- LUNGLIFE - USER PROFILE SCHEMA EXTENSION
-- =====================================================
-- Adds role-based user profiles and risk prediction tables
-- Compatible with existing lunglife_db schema
-- Date: November 10, 2025
-- =====================================================

-- Add role column to existing users table (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'role') THEN
        ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'patient';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'profile_completed') THEN
        ALTER TABLE users ADD COLUMN profile_completed BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'specialty') THEN
        ALTER TABLE users ADD COLUMN specialty VARCHAR(100) NULL; -- For health professionals
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'license_number') THEN
        ALTER TABLE users ADD COLUMN license_number VARCHAR(50) NULL; -- For health professionals
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'institution') THEN
        ALTER TABLE users ADD COLUMN institution VARCHAR(255) NULL; -- For professionals/admins
    END IF;
END $$;

-- User profiles extended information
CREATE TABLE IF NOT EXISTS user_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Personal Information
    date_of_birth DATE,
    gender VARCHAR(20),
    height_cm INTEGER,
    weight_kg DECIMAL(5,2),
    
    -- Smoking History (Critical for lung cancer risk)
    smoking_status VARCHAR(20) CHECK (smoking_status IN ('never', 'former', 'current')),
    smoking_start_age INTEGER,
    smoking_quit_age INTEGER,
    cigarettes_per_day INTEGER,
    pack_years DECIMAL(5,2), -- Calculated field: (cigarettes/day / 20) * years smoked
    
    -- Environmental Factors
    occupational_exposure TEXT[], -- Array of exposure types
    family_history_lung_cancer BOOLEAN DEFAULT FALSE,
    previous_lung_disease BOOLEAN DEFAULT FALSE,
    radiation_exposure BOOLEAN DEFAULT FALSE,
    
    -- Location & Demographics
    country VARCHAR(100),
    city VARCHAR(100),
    air_quality_index INTEGER,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id)
);

-- Risk predictions and assessments
CREATE TABLE IF NOT EXISTS risk_assessments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Risk Calculation
    risk_score DECIMAL(5,3) NOT NULL, -- 0.000 to 1.000 (0% to 100%)
    risk_category VARCHAR(20) CHECK (risk_category IN ('low', 'moderate', 'high', 'very_high')),
    
    -- Model Information
    model_version VARCHAR(20) NOT NULL,
    calculation_method VARCHAR(50) NOT NULL, -- 'plco_model', 'liverpool_model', etc.
    
    -- Assessment Details
    assessed_by INTEGER REFERENCES users(id), -- Health professional who performed assessment
    assessment_notes TEXT,
    recommendations TEXT,
    
    -- Timestamps
    assessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    valid_until TIMESTAMP, -- When reassessment is needed
    
    -- Factors used in calculation (JSON for flexibility)
    factors_used JSONB,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Health metrics tracking
CREATE TABLE IF NOT EXISTS health_metrics (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Measured Values
    metric_type VARCHAR(50) NOT NULL, -- 'spirometry', 'blood_pressure', 'oxygen_saturation'
    metric_value DECIMAL(10,3) NOT NULL,
    metric_unit VARCHAR(20) NOT NULL,
    
    -- Source Information
    measured_by VARCHAR(50), -- 'self_reported', 'device', 'professional'
    device_id VARCHAR(100), -- IoT device identifier
    
    -- Measurement Info
    measured_at TIMESTAMP NOT NULL,
    notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for health_metrics table for efficient queries
CREATE INDEX IF NOT EXISTS idx_health_metrics_user_type ON health_metrics (user_id, metric_type);
CREATE INDEX IF NOT EXISTS idx_health_metrics_measured_at ON health_metrics (measured_at);

-- Role permissions matrix
CREATE TABLE IF NOT EXISTS role_permissions (
    id SERIAL PRIMARY KEY,
    role_name VARCHAR(20) NOT NULL,
    permission VARCHAR(100) NOT NULL,
    resource VARCHAR(100) NOT NULL,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(role_name, permission, resource)
);

-- Insert default role permissions
INSERT INTO role_permissions (role_name, permission, resource) VALUES
-- Patient permissions
('patient', 'read', 'own_profile'),
('patient', 'update', 'own_profile'),
('patient', 'read', 'own_assessments'),
('patient', 'create', 'health_metrics'),
('patient', 'read', 'own_metrics'),

-- Health professional permissions
('health_professional', 'read', 'patient_profiles'),
('health_professional', 'update', 'patient_profiles'),
('health_professional', 'create', 'risk_assessments'),
('health_professional', 'read', 'all_assessments'),
('health_professional', 'update', 'risk_assessments'),
('health_professional', 'read', 'patient_metrics'),

-- Admin permissions
('admin', 'read', 'all_users'),
('admin', 'update', 'all_users'),
('admin', 'delete', 'users'),
('admin', 'read', 'system_metrics'),
('admin', 'manage', 'roles'),
('admin', 'read', 'audit_logs'),

-- Researcher permissions (additional role)
('researcher', 'read', 'anonymized_data'),
('researcher', 'export', 'aggregated_metrics');

-- Update triggers for automated timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_profiles_updated_at 
    BEFORE UPDATE ON user_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_risk_assessments_updated_at 
    BEFORE UPDATE ON risk_assessments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_user_id ON risk_assessments(user_id);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_assessed_by ON risk_assessments(assessed_by);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Add check constraints
ALTER TABLE users ADD CONSTRAINT check_valid_role 
    CHECK (role IN ('patient', 'health_professional', 'admin', 'researcher'));

-- Create view for user profile summary
CREATE OR REPLACE VIEW user_profile_summary AS
SELECT 
    u.id,
    u.email,
    u.nombre as first_name,
    u.apellido as last_name,
    u.role,
    u.profile_completed,
    up.smoking_status,
    up.pack_years,
    ra.risk_score,
    ra.risk_category,
    ra.assessed_at as last_assessment,
    COUNT(hm.id) as total_metrics
FROM users u
LEFT JOIN user_profiles up ON u.id = up.user_id
LEFT JOIN risk_assessments ra ON u.id = ra.user_id 
    AND ra.assessed_at = (
        SELECT MAX(assessed_at) 
        FROM risk_assessments ra2 
        WHERE ra2.user_id = u.id
    )
LEFT JOIN health_metrics hm ON u.id = hm.user_id
    AND hm.measured_at > CURRENT_DATE - INTERVAL '30 days'
GROUP BY u.id, u.email, u.nombre, u.apellido, u.role, u.profile_completed,
         up.smoking_status, up.pack_years, ra.risk_score, ra.risk_category, ra.assessed_at;

-- Grant appropriate permissions (only if user exists)
DO $$
BEGIN
    -- Check if lunglife_app user exists before granting permissions
    IF EXISTS (SELECT 1 FROM pg_user WHERE usename = 'lunglife_app') THEN
        GRANT SELECT, INSERT, UPDATE ON user_profiles TO lunglife_app;
        GRANT SELECT, INSERT, UPDATE ON risk_assessments TO lunglife_app;
        GRANT SELECT, INSERT, UPDATE ON health_metrics TO lunglife_app;
        GRANT SELECT ON role_permissions TO lunglife_app;
        GRANT SELECT ON user_profile_summary TO lunglife_app;
        RAISE NOTICE 'Permissions granted to lunglife_app user';
    ELSE
        RAISE NOTICE 'lunglife_app user does not exist, skipping permission grants';
    END IF;
END $$;

-- Add comments for documentation
COMMENT ON TABLE user_profiles IS 'Extended user profile information including health and risk factors';
COMMENT ON TABLE risk_assessments IS 'Lung cancer risk assessments and predictions';
COMMENT ON TABLE health_metrics IS 'Time-series health measurements and IoT device data';
COMMENT ON TABLE role_permissions IS 'Role-based access control matrix';