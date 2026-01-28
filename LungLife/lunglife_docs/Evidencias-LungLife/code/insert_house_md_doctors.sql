-- ============================================
-- INSERT HOUSE MD FEMALE DOCTORS
-- Based on: House M.D. TV Series
-- Password for all: Doctor123!
-- ============================================

-- Password hash for 'Doctor123!' generated with bcrypt (10 rounds)

DO $$
DECLARE
    v_cuddy_user_id INTEGER;
    v_cameron_user_id INTEGER;
    v_thirteen_user_id INTEGER;
    v_password_hash VARCHAR(255) := '$2b$10$CDM9CkJg.eY/6HcfCTmyUemf1aQ.28ckqDY8Yyri.SyN7qZPcoVWy';
BEGIN
    -- ============================================
    -- 1. DRA. LISA CUDDY (Dean of Medicine)
    -- ============================================
    INSERT INTO users (email, email_verified, role_id, is_active, accept_terms, accept_privacy)
    VALUES ('lisa.cuddy@princetonplainsboro.edu', TRUE, 2, TRUE, TRUE, TRUE)
    RETURNING user_id INTO v_cuddy_user_id;

    INSERT INTO user_auth (user_id, password_hash)
    VALUES (v_cuddy_user_id, v_password_hash);

    INSERT INTO doctor (
        user_id, 
        doctor_name, 
        doctor_last_name, 
        date_of_birth,
        gender,
        specialty, 
        medical_license, 
        hospital_institution, 
        phone,
        email_institutional
    ) VALUES (
        v_cuddy_user_id,
        'Lisa',
        'Cuddy',
        '1968-10-17',
        'FEMALE',
        'Endocrinologia / Administracion Hospitalaria',
        'NJ-MED-1993-0156',
        'Princeton-Plainsboro Teaching Hospital',
        '+1-609-555-0001',
        'l.cuddy@ppth.org'
    );

    RAISE NOTICE 'Dra. Lisa Cuddy created with user_id: %', v_cuddy_user_id;

    -- ============================================
    -- 2. DRA. ALLISON CAMERON (Immunologist)
    -- ============================================
    INSERT INTO users (email, email_verified, role_id, is_active, accept_terms, accept_privacy)
    VALUES ('allison.cameron@princetonplainsboro.edu', TRUE, 2, TRUE, TRUE, TRUE)
    RETURNING user_id INTO v_cameron_user_id;

    INSERT INTO user_auth (user_id, password_hash)
    VALUES (v_cameron_user_id, v_password_hash);

    INSERT INTO doctor (
        user_id, 
        doctor_name, 
        doctor_last_name, 
        date_of_birth,
        gender,
        specialty, 
        medical_license, 
        hospital_institution, 
        phone,
        email_institutional
    ) VALUES (
        v_cameron_user_id,
        'Allison',
        'Cameron',
        '1979-07-21',
        'FEMALE',
        'Inmunologia',
        'NJ-MED-2004-0789',
        'Princeton-Plainsboro Teaching Hospital',
        '+1-609-555-0002',
        'a.cameron@ppth.org'
    );

    RAISE NOTICE 'Dra. Allison Cameron created with user_id: %', v_cameron_user_id;

    -- ============================================
    -- 3. DRA. REMY HADLEY "THIRTEEN" (Internal Medicine)
    -- ============================================
    INSERT INTO users (email, email_verified, role_id, is_active, accept_terms, accept_privacy)
    VALUES ('remy.hadley@princetonplainsboro.edu', TRUE, 2, TRUE, TRUE, TRUE)
    RETURNING user_id INTO v_thirteen_user_id;

    INSERT INTO user_auth (user_id, password_hash)
    VALUES (v_thirteen_user_id, v_password_hash);

    INSERT INTO doctor (
        user_id, 
        doctor_name, 
        doctor_last_name, 
        date_of_birth,
        gender,
        specialty, 
        medical_license, 
        hospital_institution, 
        phone,
        email_institutional
    ) VALUES (
        v_thirteen_user_id,
        'Remy',
        'Hadley',
        '1983-03-15',
        'FEMALE',
        'Medicina Interna',
        'NJ-MED-2007-1342',
        'Princeton-Plainsboro Teaching Hospital',
        '+1-609-555-0003',
        'r.hadley@ppth.org'
    );

    RAISE NOTICE 'Dra. Remy Hadley (Thirteen) created with user_id: %', v_thirteen_user_id;

    RAISE NOTICE '========================================';
    RAISE NOTICE 'All 3 House MD female doctors created successfully!';
    RAISE NOTICE 'Login credentials:';
    RAISE NOTICE '  - lisa.cuddy@princetonplainsboro.edu / Doctor123!';
    RAISE NOTICE '  - allison.cameron@princetonplainsboro.edu / Doctor123!';
    RAISE NOTICE '  - remy.hadley@princetonplainsboro.edu / Doctor123!';
    RAISE NOTICE '========================================';

END $$;

-- Verification query
SELECT 
    u.user_id,
    u.email,
    r.role_name,
    d.doctor_name || ' ' || d.doctor_last_name AS full_name,
    d.gender,
    d.specialty,
    d.hospital_institution
FROM users u
JOIN roles r ON u.role_id = r.role_id
JOIN doctor d ON u.user_id = d.user_id
WHERE u.email IN (
    'lisa.cuddy@princetonplainsboro.edu',
    'allison.cameron@princetonplainsboro.edu',
    'remy.hadley@princetonplainsboro.edu'
);
