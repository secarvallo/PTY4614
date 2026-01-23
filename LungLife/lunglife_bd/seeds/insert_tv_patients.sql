-- ============================================
-- INSERT TV SERIES PATIENTS
-- Inspired by: House MD, Grey's Anatomy, The Good Doctor, ER
-- Password for all: Doctor123!
-- ============================================

-- Password hash for 'Patient123!' generated with bcrypt (10 rounds)
-- Using same format as Doctor123! hash

DO $$
DECLARE
    v_user_id INTEGER;
    v_patient_id INTEGER;
    v_password_hash VARCHAR(255) := '$2b$10$CDM9CkJg.eY/6HcfCTmyUemf1aQ.28ckqDY8Yyri.SyN7qZPcoVWy';
BEGIN

    -- ============================================
    -- 1. MARK GREENE (inspired by ER)
    -- Male, 58 years, former smoker
    -- ============================================
    INSERT INTO users (email, email_verified, role_id, is_active, accept_terms, accept_privacy)
    VALUES ('mark.greene@email.com', TRUE, 1, TRUE, TRUE, TRUE)
    RETURNING user_id INTO v_user_id;

    INSERT INTO user_auth (user_id, password_hash)
    VALUES (v_user_id, v_password_hash);

    INSERT INTO patient (
        user_id, patient_name, patient_last_name, date_of_birth, gender,
        height_cm, weight_kg, phone, country, city, area_residence,
        occupation, emergency_contact_name, emergency_contact_phone
    ) VALUES (
        v_user_id, 'Mark', 'Greene', '1967-08-15', 'MALE',
        180.00, 82.00, '+56-9-1234-5001', 'Chile', 'Santiago', 'URBAN',
        'Profesor Jubilado', 'Elizabeth Greene', '+56-9-8765-4001'
    ) RETURNING patient_id INTO v_patient_id;

    -- Smoking history: Former smoker
    INSERT INTO smoking_history (patient_id, smoking_status, cigarettes_per_day, start_date, quit_date)
    VALUES (v_patient_id, 'FORMER_SMOKER', 15, '1985-01-01', '2010-06-15');

    RAISE NOTICE 'Patient Mark Greene created with ID: %', v_patient_id;

    -- ============================================
    -- 2. MEREDITH WELLS (inspired by Grey's Anatomy)
    -- Female, 42 years, never smoker
    -- ============================================
    INSERT INTO users (email, email_verified, role_id, is_active, accept_terms, accept_privacy)
    VALUES ('meredith.wells@email.com', TRUE, 1, TRUE, TRUE, TRUE)
    RETURNING user_id INTO v_user_id;

    INSERT INTO user_auth (user_id, password_hash)
    VALUES (v_user_id, v_password_hash);

    INSERT INTO patient (
        user_id, patient_name, patient_last_name, date_of_birth, gender,
        height_cm, weight_kg, phone, country, city, area_residence,
        occupation, emergency_contact_name, emergency_contact_phone
    ) VALUES (
        v_user_id, 'Meredith', 'Wells', '1983-11-22', 'FEMALE',
        165.00, 58.00, '+56-9-1234-5002', 'Chile', 'Valparaíso', 'URBAN',
        'Investigadora Científica', 'Derek Wells', '+56-9-8765-4002'
    ) RETURNING patient_id INTO v_patient_id;

    -- Smoking history: Never smoker
    INSERT INTO smoking_history (patient_id, smoking_status, cigarettes_per_day)
    VALUES (v_patient_id, 'NEVER', 0);

    -- Symptoms
    INSERT INTO symptom (patient_id, chronic_cough, fatigue)
    VALUES (v_patient_id, TRUE, TRUE);

    RAISE NOTICE 'Patient Meredith Wells created with ID: %', v_patient_id;

    -- ============================================
    -- 3. JOHN CARTER (inspired by ER)
    -- Male, 52 years, current smoker
    -- ============================================
    INSERT INTO users (email, email_verified, role_id, is_active, accept_terms, accept_privacy)
    VALUES ('john.carter@email.com', TRUE, 1, TRUE, TRUE, TRUE)
    RETURNING user_id INTO v_user_id;

    INSERT INTO user_auth (user_id, password_hash)
    VALUES (v_user_id, v_password_hash);

    INSERT INTO patient (
        user_id, patient_name, patient_last_name, date_of_birth, gender,
        height_cm, weight_kg, phone, country, city, area_residence,
        occupation, emergency_contact_name, emergency_contact_phone
    ) VALUES (
        v_user_id, 'John', 'Carter', '1973-06-04', 'MALE',
        185.00, 78.00, '+56-9-1234-5003', 'Chile', 'Concepción', 'URBAN',
        'Empresario', 'Susan Carter', '+56-9-8765-4003'
    ) RETURNING patient_id INTO v_patient_id;

    -- Smoking history: Current smoker - HIGH RISK
    INSERT INTO smoking_history (patient_id, smoking_status, cigarettes_per_day, start_date)
    VALUES (v_patient_id, 'CURRENT_SMOKER', 20, '1991-03-01');

    -- Symptoms
    INSERT INTO symptom (patient_id, shortness_of_breath, chronic_cough)
    VALUES (v_patient_id, TRUE, TRUE);

    RAISE NOTICE 'Patient John Carter created with ID: %', v_patient_id;

    -- ============================================
    -- 4. CRISTINA YANG (inspired by Grey's Anatomy)
    -- Female, 45 years, never smoker
    -- ============================================
    INSERT INTO users (email, email_verified, role_id, is_active, accept_terms, accept_privacy)
    VALUES ('cristina.yang@email.com', TRUE, 1, TRUE, TRUE, TRUE)
    RETURNING user_id INTO v_user_id;

    INSERT INTO user_auth (user_id, password_hash)
    VALUES (v_user_id, v_password_hash);

    INSERT INTO patient (
        user_id, patient_name, patient_last_name, date_of_birth, gender,
        height_cm, weight_kg, phone, country, city, area_residence,
        occupation, emergency_contact_name, emergency_contact_phone
    ) VALUES (
        v_user_id, 'Cristina', 'Yang', '1980-09-10', 'FEMALE',
        160.00, 52.00, '+56-9-1234-5004', 'Chile', 'Santiago', 'URBAN',
        'Ingeniera en Biotecnología', 'Helen Yang', '+56-9-8765-4004'
    ) RETURNING patient_id INTO v_patient_id;

    -- Smoking history: Never smoker
    INSERT INTO smoking_history (patient_id, smoking_status, cigarettes_per_day)
    VALUES (v_patient_id, 'NEVER', 0);

    RAISE NOTICE 'Patient Cristina Yang created with ID: %', v_patient_id;

    -- ============================================
    -- 5. SHAUN MURPHY (inspired by The Good Doctor)
    -- Male, 32 years, never smoker
    -- ============================================
    INSERT INTO users (email, email_verified, role_id, is_active, accept_terms, accept_privacy)
    VALUES ('shaun.murphy@email.com', TRUE, 1, TRUE, TRUE, TRUE)
    RETURNING user_id INTO v_user_id;

    INSERT INTO user_auth (user_id, password_hash)
    VALUES (v_user_id, v_password_hash);

    INSERT INTO patient (
        user_id, patient_name, patient_last_name, date_of_birth, gender,
        height_cm, weight_kg, phone, country, city, area_residence,
        occupation, emergency_contact_name, emergency_contact_phone
    ) VALUES (
        v_user_id, 'Shaun', 'Murphy', '1993-04-18', 'MALE',
        175.00, 70.00, '+56-9-1234-5005', 'Chile', 'Temuco', 'SUBURBAN',
        'Técnico en Computación', 'Aaron Murphy', '+56-9-8765-4005'
    ) RETURNING patient_id INTO v_patient_id;

    -- Smoking history: Never smoker
    INSERT INTO smoking_history (patient_id, smoking_status, cigarettes_per_day)
    VALUES (v_patient_id, 'NEVER', 0);

    RAISE NOTICE 'Patient Shaun Murphy created with ID: %', v_patient_id;

    -- ============================================
    -- 6. REBECCA POPE (inspired by House MD)
    -- Female, 55 years, former smoker
    -- ============================================
    INSERT INTO users (email, email_verified, role_id, is_active, accept_terms, accept_privacy)
    VALUES ('rebecca.pope@email.com', TRUE, 1, TRUE, TRUE, TRUE)
    RETURNING user_id INTO v_user_id;

    INSERT INTO user_auth (user_id, password_hash)
    VALUES (v_user_id, v_password_hash);

    INSERT INTO patient (
        user_id, patient_name, patient_last_name, date_of_birth, gender,
        height_cm, weight_kg, phone, country, city, area_residence,
        occupation, emergency_contact_name, emergency_contact_phone
    ) VALUES (
        v_user_id, 'Rebecca', 'Pope', '1970-12-03', 'FEMALE',
        168.00, 65.00, '+56-9-1234-5006', 'Chile', 'Antofagasta', 'URBAN',
        'Abogada', 'Michael Pope', '+56-9-8765-4006'
    ) RETURNING patient_id INTO v_patient_id;

    -- Smoking history: Former smoker
    INSERT INTO smoking_history (patient_id, smoking_status, cigarettes_per_day, start_date, quit_date)
    VALUES (v_patient_id, 'FORMER_SMOKER', 10, '1988-05-01', '2015-01-01');

    -- Symptoms
    INSERT INTO symptom (patient_id, chest_pain, fatigue)
    VALUES (v_patient_id, TRUE, TRUE);

    -- Risk factors
    INSERT INTO risk_factors (patient_id, family_history_cancer, toxin_exposure, physical_activity_level)
    VALUES (v_patient_id, TRUE, FALSE, 'LOW');

    RAISE NOTICE 'Patient Rebecca Pope created with ID: %', v_patient_id;

    -- ============================================
    -- 7. ALEX KAREV (inspired by Grey's Anatomy)
    -- Male, 40 years, former smoker
    -- ============================================
    INSERT INTO users (email, email_verified, role_id, is_active, accept_terms, accept_privacy)
    VALUES ('alex.karev@email.com', TRUE, 1, TRUE, TRUE, TRUE)
    RETURNING user_id INTO v_user_id;

    INSERT INTO user_auth (user_id, password_hash)
    VALUES (v_user_id, v_password_hash);

    INSERT INTO patient (
        user_id, patient_name, patient_last_name, date_of_birth, gender,
        height_cm, weight_kg, phone, country, city, area_residence,
        occupation, emergency_contact_name, emergency_contact_phone
    ) VALUES (
        v_user_id, 'Alex', 'Karev', '1985-02-28', 'MALE',
        178.00, 85.00, '+56-9-1234-5007', 'Chile', 'Viña del Mar', 'URBAN',
        'Mecánico Industrial', 'Izzie Karev', '+56-9-8765-4007'
    ) RETURNING patient_id INTO v_patient_id;

    -- Smoking history: Former smoker
    INSERT INTO smoking_history (patient_id, smoking_status, cigarettes_per_day, start_date, quit_date)
    VALUES (v_patient_id, 'FORMER_SMOKER', 12, '2003-01-01', '2020-03-15');

    RAISE NOTICE 'Patient Alex Karev created with ID: %', v_patient_id;

    -- ============================================
    -- 8. CAROL HATHAWAY (inspired by ER)
    -- Female, 50 years, never smoker
    -- ============================================
    INSERT INTO users (email, email_verified, role_id, is_active, accept_terms, accept_privacy)
    VALUES ('carol.hathaway@email.com', TRUE, 1, TRUE, TRUE, TRUE)
    RETURNING user_id INTO v_user_id;

    INSERT INTO user_auth (user_id, password_hash)
    VALUES (v_user_id, v_password_hash);

    INSERT INTO patient (
        user_id, patient_name, patient_last_name, date_of_birth, gender,
        height_cm, weight_kg, phone, country, city, area_residence,
        occupation, emergency_contact_name, emergency_contact_phone
    ) VALUES (
        v_user_id, 'Carol', 'Hathaway', '1975-07-14', 'FEMALE',
        163.00, 60.00, '+56-9-1234-5008', 'Chile', 'La Serena', 'SUBURBAN',
        'Enfermera Jubilada', 'Doug Hathaway', '+56-9-8765-4008'
    ) RETURNING patient_id INTO v_patient_id;

    -- Smoking history: Never smoker
    INSERT INTO smoking_history (patient_id, smoking_status, cigarettes_per_day)
    VALUES (v_patient_id, 'NEVER', 0);

    -- Symptoms (mild)
    INSERT INTO symptom (patient_id, fatigue, weight_loss)
    VALUES (v_patient_id, TRUE, TRUE);

    RAISE NOTICE 'Patient Carol Hathaway created with ID: %', v_patient_id;

    -- ============================================
    -- 9. ROBERTO SANCHEZ (inspired by Scrubs)
    -- Male, 65 years, current smoker - HIGH RISK
    -- ============================================
    INSERT INTO users (email, email_verified, role_id, is_active, accept_terms, accept_privacy)
    VALUES ('roberto.sanchez@email.com', TRUE, 1, TRUE, TRUE, TRUE)
    RETURNING user_id INTO v_user_id;

    INSERT INTO user_auth (user_id, password_hash)
    VALUES (v_user_id, v_password_hash);

    INSERT INTO patient (
        user_id, patient_name, patient_last_name, date_of_birth, gender,
        height_cm, weight_kg, phone, country, city, area_residence,
        occupation, emergency_contact_name, emergency_contact_phone
    ) VALUES (
        v_user_id, 'Roberto', 'Sanchez', '1960-05-20', 'MALE',
        172.00, 90.00, '+56-9-1234-5009', 'Chile', 'Calama', 'URBAN',
        'Minero Jubilado', 'María Sanchez', '+56-9-8765-4009'
    ) RETURNING patient_id INTO v_patient_id;

    -- Smoking history: Current smoker - VERY HIGH RISK (40+ pack-years)
    INSERT INTO smoking_history (patient_id, smoking_status, cigarettes_per_day, start_date)
    VALUES (v_patient_id, 'CURRENT_SMOKER', 25, '1978-01-01');

    -- Symptoms - Multiple concerning symptoms
    INSERT INTO symptom (patient_id, chest_pain, shortness_of_breath, chronic_cough, hemoptysis)
    VALUES (v_patient_id, TRUE, TRUE, TRUE, TRUE);

    -- Risk factors - HIGH RISK PATIENT
    INSERT INTO risk_factors (patient_id, family_history_cancer, toxin_exposure, physical_activity_level, dietary_habits)
    VALUES (v_patient_id, TRUE, TRUE, 'LOW', 'POOR');

    -- Occupational exposure (mining)
    INSERT INTO occupational_exposure (patient_id, exposure_type, exposure_description, years_exposed, risk_contribution)
    VALUES (v_patient_id, 'Minería - Polvo de sílice', 'Exposición prolongada a polvo de sílice en minas de cobre', 35, 'HIGH');

    RAISE NOTICE 'Patient Roberto Sanchez created with ID: % (HIGH RISK)', v_patient_id;

    -- ============================================
    -- 10. ELENA TORRES (inspired by various medical dramas)
    -- Female, 48 years, former smoker
    -- ============================================
    INSERT INTO users (email, email_verified, role_id, is_active, accept_terms, accept_privacy)
    VALUES ('elena.torres@email.com', TRUE, 1, TRUE, TRUE, TRUE)
    RETURNING user_id INTO v_user_id;

    INSERT INTO user_auth (user_id, password_hash)
    VALUES (v_user_id, v_password_hash);

    INSERT INTO patient (
        user_id, patient_name, patient_last_name, date_of_birth, gender,
        height_cm, weight_kg, phone, country, city, area_residence,
        occupation, emergency_contact_name, emergency_contact_phone
    ) VALUES (
        v_user_id, 'Elena', 'Torres', '1977-03-25', 'FEMALE',
        170.00, 68.00, '+56-9-1234-5010', 'Chile', 'Puerto Montt', 'SUBURBAN',
        'Arquitecta', 'Carlos Torres', '+56-9-8765-4010'
    ) RETURNING patient_id INTO v_patient_id;

    -- Smoking history: Former smoker
    INSERT INTO smoking_history (patient_id, smoking_status, cigarettes_per_day, start_date, quit_date)
    VALUES (v_patient_id, 'FORMER_SMOKER', 8, '1995-06-01', '2018-09-01');

    -- Symptoms
    INSERT INTO symptom (patient_id, chronic_cough, shortness_of_breath)
    VALUES (v_patient_id, TRUE, TRUE);

    -- Risk factors
    INSERT INTO risk_factors (patient_id, family_history_cancer, physical_activity_level, dietary_habits)
    VALUES (v_patient_id, FALSE, 'MODERATE', 'GOOD');

    RAISE NOTICE 'Patient Elena Torres created with ID: %', v_patient_id;

    -- ============================================
    -- SUMMARY
    -- ============================================
    RAISE NOTICE '========================================';
    RAISE NOTICE 'All 10 TV-inspired patients created successfully!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Login credentials for all patients:';
    RAISE NOTICE '  Password: Doctor123!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Patient emails:';
    RAISE NOTICE '  1. mark.greene@email.com (Former smoker)';
    RAISE NOTICE '  2. meredith.wells@email.com (Never smoker)';
    RAISE NOTICE '  3. john.carter@email.com (Current smoker - HIGH RISK)';
    RAISE NOTICE '  4. cristina.yang@email.com (Never smoker)';
    RAISE NOTICE '  5. shaun.murphy@email.com (Never smoker)';
    RAISE NOTICE '  6. rebecca.pope@email.com (Former smoker)';
    RAISE NOTICE '  7. alex.karev@email.com (Former smoker)';
    RAISE NOTICE '  8. carol.hathaway@email.com (Never smoker)';
    RAISE NOTICE '  9. roberto.sanchez@email.com (Current smoker - CRITICAL RISK)';
    RAISE NOTICE ' 10. elena.torres@email.com (Former smoker)';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Risk Summary:';
    RAISE NOTICE '  - Never smokers: 4 patients';
    RAISE NOTICE '  - Former smokers: 4 patients';
    RAISE NOTICE '  - Current smokers: 2 patients (HIGH/CRITICAL RISK)';
    RAISE NOTICE '========================================';

END $$;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- List all patients with smoking status
SELECT 
    p.patient_id,
    u.email,
    p.patient_name || ' ' || p.patient_last_name AS full_name,
    p.gender,
    EXTRACT(YEAR FROM AGE(p.date_of_birth)) AS age,
    p.city,
    p.occupation,
    sh.smoking_status,
    sh.cigarettes_per_day,
    CASE 
        WHEN sh.smoking_status = 'CURRENT_SMOKER' AND sh.start_date IS NOT NULL THEN
            ROUND((sh.cigarettes_per_day / 20.0) * EXTRACT(YEAR FROM AGE(CURRENT_DATE, sh.start_date)), 1)
        WHEN sh.smoking_status = 'FORMER_SMOKER' AND sh.start_date IS NOT NULL AND sh.quit_date IS NOT NULL THEN
            ROUND((sh.cigarettes_per_day / 20.0) * EXTRACT(YEAR FROM AGE(sh.quit_date, sh.start_date)), 1)
        ELSE 0
    END AS pack_years
FROM patient p
JOIN users u ON p.user_id = u.user_id
LEFT JOIN smoking_history sh ON p.patient_id = sh.patient_id AND sh.is_current_status = TRUE
WHERE u.email LIKE '%@email.com'
ORDER BY pack_years DESC NULLS LAST;

-- List high-risk patients (symptoms + smoking)
SELECT 
    p.patient_id,
    p.patient_name || ' ' || p.patient_last_name AS full_name,
    sh.smoking_status,
    s.chest_pain,
    s.chronic_cough,
    s.hemoptysis,
    s.shortness_of_breath
FROM patient p
JOIN smoking_history sh ON p.patient_id = sh.patient_id AND sh.is_current_status = TRUE
LEFT JOIN symptom s ON p.patient_id = s.patient_id
WHERE sh.smoking_status IN ('CURRENT_SMOKER', 'FORMER_SMOKER')
AND (s.chest_pain = TRUE OR s.chronic_cough = TRUE OR s.hemoptysis = TRUE);
