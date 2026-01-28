-- ============================================
-- INSERT FAMOUS TV/MOVIE DOCTORS
-- Based on: House MD, Grey's Anatomy, Dr. Strange
-- Password for all: Doctor123!
-- ============================================

-- Password hash for 'Doctor123!' generated with bcrypt (10 rounds)

DO $$
DECLARE
    v_house_user_id INTEGER;
    v_grey_user_id INTEGER;
    v_strange_user_id INTEGER;
    v_password_hash VARCHAR(255) := '$2b$10$CDM9CkJg.eY/6HcfCTmyUemf1aQ.28ckqDY8Yyri.SyN7qZPcoVWy';
BEGIN
    -- ============================================
    -- 1. DR. GREGORY HOUSE (House M.D.)
    -- ============================================
    INSERT INTO users (email, email_verified, role_id, is_active, accept_terms, accept_privacy)
    VALUES ('gregory.house@princetonplainsboro.edu', TRUE, 2, TRUE, TRUE, TRUE)
    RETURNING user_id INTO v_house_user_id;

    INSERT INTO user_auth (user_id, password_hash)
    VALUES (v_house_user_id, v_password_hash);

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
        v_house_user_id,
        'Gregory',
        'House',
        '1959-06-11',
        'MALE',
        'Diagnostico Medico / Nefrologia',
        'NJ-MED-1991-0042',
        'Princeton-Plainsboro Teaching Hospital',
        '+1-609-555-0101',
        'g.house@ppth.org'
    );

    RAISE NOTICE 'Dr. Gregory House created with user_id: %', v_house_user_id;

    -- ============================================
    -- 2. DR. MEREDITH GREY (Grey's Anatomy)
    -- ============================================
    INSERT INTO users (email, email_verified, role_id, is_active, accept_terms, accept_privacy)
    VALUES ('meredith.grey@seattlegrace.edu', TRUE, 2, TRUE, TRUE, TRUE)
    RETURNING user_id INTO v_grey_user_id;

    INSERT INTO user_auth (user_id, password_hash)
    VALUES (v_grey_user_id, v_password_hash);

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
        v_grey_user_id,
        'Meredith',
        'Grey',
        '1978-11-03',
        'FEMALE',
        'Cirugia General / Cirugia de Trauma',
        'WA-MED-2005-1247',
        'Grey Sloan Memorial Hospital',
        '+1-206-555-0202',
        'm.grey@greysloan.org'
    );

    RAISE NOTICE 'Dr. Meredith Grey created with user_id: %', v_grey_user_id;

    -- ============================================
    -- 3. DR. STEPHEN STRANGE (Marvel's Doctor Strange)
    -- ============================================
    INSERT INTO users (email, email_verified, role_id, is_active, accept_terms, accept_privacy)
    VALUES ('stephen.strange@metrohealth.edu', TRUE, 2, TRUE, TRUE, TRUE)
    RETURNING user_id INTO v_strange_user_id;

    INSERT INTO user_auth (user_id, password_hash)
    VALUES (v_strange_user_id, v_password_hash);

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
        v_strange_user_id,
        'Stephen',
        'Strange',
        '1970-11-18',
        'MALE',
        'Neurocirugia',
        'NY-MED-1998-8821',
        'Metro-General Hospital, New York',
        '+1-212-555-0303',
        's.strange@metrogeneral.org'
    );

    RAISE NOTICE 'Dr. Stephen Strange created with user_id: %', v_strange_user_id;

    RAISE NOTICE '========================================';
    RAISE NOTICE 'All 3 famous doctors created successfully!';
    RAISE NOTICE 'Login credentials:';
    RAISE NOTICE '  - gregory.house@princetonplainsboro.edu / Doctor123!';
    RAISE NOTICE '  - meredith.grey@seattlegrace.edu / Doctor123!';
    RAISE NOTICE '  - stephen.strange@metrohealth.edu / Doctor123!';
    RAISE NOTICE '========================================';

END $$;

-- Verification query
SELECT 
    u.user_id,
    u.email,
    r.role_name,
    d.doctor_name || ' ' || d.doctor_last_name AS full_name,
    d.specialty,
    d.hospital_institution
FROM users u
JOIN roles r ON u.role_id = r.role_id
JOIN doctor d ON u.user_id = d.user_id
WHERE u.email IN (
    'gregory.house@princetonplainsboro.edu',
    'meredith.grey@seattlegrace.edu',
    'stephen.strange@metrohealth.edu'
);
