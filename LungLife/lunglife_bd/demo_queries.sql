-- ============================================================================
-- LUNG LIFE: VISION DEL SISTEMA (DASHBOARD TÉCNICO)
-- ============================================================================
-- Estas consultas están diseñadas para contar la historia del sistema durante
-- la presentación, mostrando la interconexión de todas las capas.

-- ----------------------------------------------------------------------------
-- PERSPECTIVA 1: GOBERNANZA, SEGURIDAD Y ACCESO (Layer 1: Security)
-- ----------------------------------------------------------------------------
-- Objetivo: Mostrar la robustez del sistema de autenticación y RBAC.
-- Esta consulta consolida el estado de seguridad de los usuarios activos.
WITH UserSecurity AS (
    SELECT 
        u.email,
        r.role_name as rol,
        ua.two_fa_enabled as mfa,
        ua.failed_login_attempts as fallos,
        u.last_login as ultimo_acceso,
        (SELECT COUNT(*) FROM refresh_tokens WHERE user_id = u.user_id AND is_revoked = false) as sesiones_activas
    FROM users u
    JOIN roles r ON u.role_id = r.role_id
    JOIN user_auth ua ON u.user_id = ua.user_id
    WHERE u.is_active = true
)
SELECT * FROM UserSecurity 
ORDER BY sesiones_activas DESC, ultimo_acceso DESC;


-- ----------------------------------------------------------------------------
-- PERSPECTIVA 2: EL CICLO DE VIDA CLÍNICO DEL PACIENTE (Layer 2: Clinical Data)
-- ----------------------------------------------------------------------------
-- Objetivo: Mostrar cómo el sistema consolida múltiples fuentes de datos 
-- (historial, síntomas, factores) en una vista única para el médico.
SELECT 
    p.patient_name || ' ' || p.patient_last_name AS paciente,
    p.city,
    sh.smoking_status as tabaquismo,
    sh.cigarettes_per_day || ' cig/día' as intensidad,
    CASE 
        WHEN s.chest_pain OR s.hemoptysis OR s.chronic_cough THEN '⚠️ SÍNTOMAS PRESENTES'
        ELSE '✅ ASINTOMÁTICO'
    END as estado_sintomatico,
    rf.imc,
    rf.physical_activity_level as actividad
FROM patient p
LEFT JOIN smoking_history sh ON p.patient_id = sh.patient_id AND sh.is_current_status = true
LEFT JOIN symptom s ON p.patient_id = s.patient_id
LEFT JOIN risk_factors rf ON p.patient_id = rf.patient_id
WHERE p.user_id IS NOT NULL
LIMIT 10;


-- ----------------------------------------------------------------------------
-- PERSPECTIVA 3: ORQUESTACIÓN DE INTELIGENCIA ARTIFICIAL (Layer 3: AI/ML)
-- ----------------------------------------------------------------------------
-- Objetivo: Demostrar la integración del microservicio de Python con la BD. 
-- Muestra la evolución del riesgo y la confianza del modelo en tiempo real.
SELECT 
    p.patient_name as paciente,
    m.risk_level as nivel,
    m.risk_score as puntaje,
    ROUND(m.confidence * 100, 1) || '%' as confianza,
    m.model_version as version,
    -- Análisis de varianza respecto a la última predicción del mismo paciente
    ROUND(m.risk_score - LAG(m.risk_score) OVER (PARTITION BY m.patient_id ORDER BY m.prediction_date), 2) as delta_riesgo,
    m.prediction_date::TIMESTAMP(0) as fecha_ejecucion
FROM ml_predictions m
JOIN patient p ON m.patient_id = p.patient_id
ORDER BY m.prediction_date DESC;


-- ----------------------------------------------------------------------------
-- PERSPECTIVA 4: IMPACTO Y GESTIÓN MÉDICA (Decision Support)
-- ----------------------------------------------------------------------------
-- Objetivo: Mostrar el sistema como una herramienta de apoyo a la decisión clínica.
-- Cruza la IA con la asignación de médicos para priorizar la atención.
SELECT 
    d.doctor_name || ' ' || d.doctor_last_name AS medico_tratante,
    d.specialty,
    COUNT(rpd.patient_id) as total_pacientes,
    -- Contamos cuántos de sus pacientes tienen riesgo 'High' según la IA
    COUNT(CASE WHEN m.risk_level = 'High' THEN 1 END) as pacientes_criticos_ia,
    ROUND(AVG(m.risk_score), 2) as score_promedio_cartera
FROM doctor d
JOIN relation_patient_doctor rpd ON d.doctor_id = rpd.doctor_id
JOIN ml_predictions m ON rpd.patient_id = m.patient_id
WHERE rpd.active = true AND m.is_current = true
GROUP BY d.doctor_id, d.doctor_name, d.doctor_last_name, d.specialty
ORDER BY pacientes_criticos_ia DESC;


-- ----------------------------------------------------------------------------
-- PERSPECTIVA 5: INTEGRIDAD Y SALUD DE LOS DATOS (System Health)
-- ----------------------------------------------------------------------------
-- Objetivo: Demostrar rigor técnico en la calidad del dato.
-- Identifica inconsistencias que podrían afectar el rendimiento del modelo.
SELECT 
    'Pacientes sin Historial Tabaquismo' as hallazgo, COUNT(*) as cantidad FROM patient p 
    LEFT JOIN smoking_history sh ON p.patient_id = sh.patient_id WHERE sh.patient_id IS NULL
UNION ALL
SELECT 
    'Predicciones con Baja Confianza (< 50%)', COUNT(*) FROM ml_predictions WHERE confidence < 0.5
UNION ALL
SELECT 
    'Usuarios sin Perfil Creado (Incompletos)', COUNT(*) FROM users u 
    LEFT JOIN patient p ON u.user_id = p.user_id 
    LEFT JOIN doctor d ON u.user_id = d.user_id 
    WHERE p.user_id IS NULL AND d.user_id IS NULL AND u.role_id != (SELECT role_id FROM roles WHERE role_name = 'ADMINISTRATOR');
