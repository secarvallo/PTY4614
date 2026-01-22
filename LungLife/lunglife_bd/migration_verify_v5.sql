-- ============================================
-- MIGRATION: Verificar y actualizar esquema a v5.0
-- Ejecutar este script para asegurar compatibilidad
-- ============================================

-- 1. Verificar si las columnas de aceptación existen en users
DO $$
BEGIN
    -- accept_terms
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'accept_terms') THEN
        ALTER TABLE users ADD COLUMN accept_terms BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added column: accept_terms';
    END IF;

    -- accept_privacy
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'accept_privacy') THEN
        ALTER TABLE users ADD COLUMN accept_privacy BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added column: accept_privacy';
    END IF;

    -- marketing_consent
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'marketing_consent') THEN
        ALTER TABLE users ADD COLUMN marketing_consent BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added column: marketing_consent';
    END IF;

    -- login_count
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'login_count') THEN
        ALTER TABLE users ADD COLUMN login_count INTEGER DEFAULT 0;
        RAISE NOTICE 'Added column: login_count';
    END IF;

    -- last_login
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'last_login') THEN
        ALTER TABLE users ADD COLUMN last_login TIMESTAMP;
        RAISE NOTICE 'Added column: last_login';
    END IF;

    -- email_verified
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'email_verified') THEN
        ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added column: email_verified';
    END IF;

    -- is_active
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'is_active') THEN
        ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
        RAISE NOTICE 'Added column: is_active';
    END IF;
END $$;

-- 2. Verificar que la tabla user_auth existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                   WHERE table_name = 'user_auth') THEN
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
        RAISE NOTICE 'Created table: user_auth';
    END IF;
END $$;

-- 3. Verificar que la tabla roles existe y tiene datos
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'roles') THEN
        CREATE TABLE roles (
            role_id SERIAL PRIMARY KEY,
            role_name VARCHAR(50) UNIQUE NOT NULL,
            description_role TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        RAISE NOTICE 'Created table: roles';
    END IF;
END $$;

-- Insertar roles si no existen
INSERT INTO roles (role_id, role_name, description_role) 
VALUES 
    (1, 'PATIENT', 'System patient user'),
    (2, 'DOCTOR', 'Authorized medical professional'),
    (3, 'ADMINISTRATOR', 'System administrator')
ON CONFLICT (role_id) DO NOTHING;

-- 4. Hacer role_id nullable para permitir registro inicial
ALTER TABLE users ALTER COLUMN role_id DROP NOT NULL;

-- 5. Mostrar estado actual
SELECT 'USERS TABLE COLUMNS:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

SELECT 'USER_AUTH TABLE COLUMNS:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'user_auth' 
ORDER BY ordinal_position;

SELECT 'ROLES:' as info;
SELECT * FROM roles;

-- ============================================
-- FIN DEL SCRIPT DE MIGRACIÓN
-- ============================================
