
-- =============================================================================
-- LUNGLIFE - SEED DATA
-- Datos iniciales para desarrollo y testing
-- =============================================================================

-- Usuario administrador inicial (password: Admin123!)
INSERT INTO users (id, email, password_hash, first_name, last_name, role, institution, license_number)
VALUES (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'admin@lunglife.cl',
    '$2b$10$rQXzZwHvVmNlQIjXvhKqoOJfXvhKqoOJfXvhKqoO',  -- Hash bcrypt
    'Admin',
    'LungLife',
    'admin',
    'LungLife Research Center',
    NULL
);

-- Médico de prueba (password: Doctor123!)
INSERT INTO users (id, email, password_hash, first_name, last_name, role, institution, license_number)
VALUES (
    'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    'doctor@hospital.cl',
    '$2b$10$xYzAbCdEfGhIjKlMnOpQrStUvWxYzAbCdEfGhIjK',
    'María',
    'González',
    'physician',
    'Hospital Regional Antofagasta',
    'MED-12345'
);

-- Investigador de prueba (password: Research123!)
INSERT INTO users (id, email, password_hash, first_name, last_name, role, institution, license_number)
VALUES (
    'c3d4e5f6-a7b8-9012-cdef-123456789012',
    'researcher@university.cl',
    '$2b$10$AbCdEfGhIjKlMnOpQrStUvWxYzAbCdEfGhIjKlMn',
    'Carlos',
    'Rodríguez',
    'researcher',
    'Universidad de Chile',
    NULL
);

-- Paciente de prueba (datos encriptados en producción)
-- Nota: En producción usar pgp_sym_encrypt() para campos sensibles
INSERT INTO patients (id, created_by, birth_date, gender, region, commune)
VALUES (
    'd4e5f6a7-b8c9-0123-def0-234567890123',
    'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    '1965-03-15',
    'M',
    'Antofagasta',
    'Antofagasta'
);

-- Predicción de prueba
INSERT INTO predictions (
    id, patient_id, created_by, 
    prediction, probability, risk_level, confidence, requires_review,
    recommendation, input_data, risk_factors, model_version, inference_time
) VALUES (
    'e5f6a7b8-c9d0-1234-ef01-345678901234',
    'd4e5f6a7-b8c9-0123-def0-234567890123',
    'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    'Early',
    0.3500,
    'medium',
    0.8500,
    true,
    'Se recomienda seguimiento con tomografía de baja dosis en 6 meses.',
    '{
        "age": 58,
        "gender": "M",
        "smoking_status": "Former",
        "pack_years": 25,
        "family_history": true,
        "chronic_disease": "Chronic Bronchitis",
        "exposure": "Yes",
        "region": "Antofagasta"
    }'::JSONB,
    '[
        {"factor": "pack_years", "impact": 0.25, "value": 25},
        {"factor": "age", "impact": 0.18, "value": 58},
        {"factor": "exposure", "impact": 0.15, "value": "Yes"}
    ]'::JSONB,
    '1.0.0',
    45
);

-- Log de auditoría de ejemplo
INSERT INTO audit_logs (
    user_id, prediction_id, action, resource_type, resource_id,
    response_status, ip_address, user_agent, duration_ms
) VALUES (
    'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    'e5f6a7b8-c9d0-1234-ef01-345678901234',
    'CREATE_PREDICTION',
    'prediction',
    'e5f6a7b8-c9d0-1234-ef01-345678901234',
    201,
    '192.168.1.100',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    145
);
