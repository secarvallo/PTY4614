
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
