-- ============================================
-- ML PREDICTIONS TABLE FOR RISK SCORING
-- LungLife Database v5.0 Extension
-- ============================================

-- Table: ml_predictions (ML Model Risk Predictions)
-- Stores risk assessment predictions from the ML model
CREATE TABLE IF NOT EXISTS ml_predictions (
    prediction_id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patient(patient_id) ON DELETE CASCADE,
    -- Risk Score (0-100%)
    risk_score DECIMAL(5,2) NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
    -- Risk Level Category
    risk_level VARCHAR(20) NOT NULL CHECK (risk_level IN ('LOW', 'MODERATE', 'HIGH', 'CRITICAL')),
    -- Confidence of the prediction (0-100%)
    confidence DECIMAL(5,2) CHECK (confidence >= 0 AND confidence <= 100),
    -- Model version used
    model_version VARCHAR(50) DEFAULT 'v1.0',
    -- Input features snapshot (JSON for reproducibility)
    input_features JSONB,
    -- Assessment details
    assessment_type VARCHAR(50) DEFAULT 'AUTOMATED' CHECK (assessment_type IN ('AUTOMATED', 'MANUAL_OVERRIDE', 'RECALCULATED')),
    -- Doctor who reviewed (optional)
    reviewed_by_doctor_id INTEGER REFERENCES doctor(doctor_id),
    reviewed_at TIMESTAMP,
    -- Timestamps
    prediction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Flag for current/active prediction
    is_current BOOLEAN DEFAULT TRUE
);

-- Table: occupational_exposure (Occupational Risk Factors)
-- Stores work-related exposure information
CREATE TABLE IF NOT EXISTS occupational_exposure (
    exposure_id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patient(patient_id) ON DELETE CASCADE,
    -- Exposure type
    exposure_type VARCHAR(100) NOT NULL,
    exposure_description TEXT,
    -- Duration
    years_exposed INTEGER CHECK (years_exposed >= 0),
    -- Risk level for this exposure
    risk_contribution VARCHAR(20) CHECK (risk_contribution IN ('LOW', 'MODERATE', 'HIGH')),
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ml_predictions_patient ON ml_predictions(patient_id);
CREATE INDEX IF NOT EXISTS idx_ml_predictions_current ON ml_predictions(patient_id, is_current) WHERE is_current = TRUE;
CREATE INDEX IF NOT EXISTS idx_ml_predictions_date ON ml_predictions(prediction_date DESC);
CREATE INDEX IF NOT EXISTS idx_occupational_exposure_patient ON occupational_exposure(patient_id);

-- View: Current Risk Assessment per Patient
CREATE OR REPLACE VIEW vw_patient_current_risk AS
SELECT 
    p.patient_id,
    p.user_id,
    p.patient_name,
    p.patient_last_name,
    p.date_of_birth,
    p.gender,
    EXTRACT(YEAR FROM AGE(p.date_of_birth)) as age,
    ml.prediction_id,
    ml.risk_score,
    ml.risk_level,
    ml.confidence,
    ml.prediction_date,
    ml.model_version
FROM patient p
LEFT JOIN ml_predictions ml ON p.patient_id = ml.patient_id AND ml.is_current = TRUE;

-- Function to set new prediction as current and mark previous as non-current
CREATE OR REPLACE FUNCTION set_current_prediction()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_current = TRUE THEN
        UPDATE ml_predictions 
        SET is_current = FALSE, updated_at = NOW()
        WHERE patient_id = NEW.patient_id 
          AND prediction_id != NEW.prediction_id 
          AND is_current = TRUE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to manage current prediction
DROP TRIGGER IF EXISTS trg_set_current_prediction ON ml_predictions;
CREATE TRIGGER trg_set_current_prediction
AFTER INSERT OR UPDATE OF is_current ON ml_predictions
FOR EACH ROW
EXECUTE FUNCTION set_current_prediction();

-- Sample data for testing (optional)
-- INSERT INTO ml_predictions (patient_id, risk_score, risk_level, confidence, input_features)
-- VALUES 
--     (1, 84.5, 'CRITICAL', 92.3, '{"smoking_years": 35, "age": 64, "exposure": "mining"}'),
--     (2, 45.2, 'MODERATE', 88.1, '{"smoking_years": 10, "age": 45, "exposure": null}');

COMMENT ON TABLE ml_predictions IS 'Stores ML model predictions for lung cancer risk assessment';
COMMENT ON TABLE occupational_exposure IS 'Stores occupational exposure risk factors for patients';
