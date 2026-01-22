-- Fix missing patient records for users with PATIENT role (role_id = 1)
-- Run this in psql or any PostgreSQL client

DO $$
DECLARE
    orphan_user RECORD;
    created_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Starting fix for missing patient records...';
    
    -- Loop through users with PATIENT role that don't have a patient record
    FOR orphan_user IN 
        SELECT u.user_id, u.email, u.created_at, u.updated_at 
        FROM users u 
        LEFT JOIN patient p ON u.user_id = p.user_id 
        WHERE u.role_id = 1 AND p.patient_id IS NULL
    LOOP
        RAISE NOTICE 'Creating patient for user_id: %, email: %', orphan_user.user_id, orphan_user.email;
        
        INSERT INTO patient (user_id, patient_name, patient_last_name, country, created_at, updated_at)
        VALUES (orphan_user.user_id, '', '', 'Chile', orphan_user.created_at, orphan_user.updated_at);
        
        created_count := created_count + 1;
    END LOOP;
    
    RAISE NOTICE 'Done! Created % patient records.', created_count;
END $$;

-- Verify the fix
SELECT 
    u.user_id, 
    u.email, 
    u.role_id,
    p.patient_id,
    CASE WHEN p.patient_id IS NULL THEN 'MISSING' ELSE 'OK' END AS status
FROM users u 
LEFT JOIN patient p ON u.user_id = p.user_id 
WHERE u.role_id = 1
ORDER BY u.user_id;
