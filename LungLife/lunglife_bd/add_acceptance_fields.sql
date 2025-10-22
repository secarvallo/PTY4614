-- Script de Migración para Agregar Campos de Aceptación
-- Agregar columnas faltantes a la tabla users

-- Conectar a la base de datos
\c lunglife_db;

-- Agregar columnas de campos de aceptación si no existen
DO $$
BEGIN
    -- Agregar accept_terms si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'accept_terms') THEN
        ALTER TABLE users ADD COLUMN accept_terms BOOLEAN DEFAULT FALSE NOT NULL;
        RAISE NOTICE 'Added column accept_terms to users table';
    END IF;
    
    -- Agregar accept_privacy si no existe  
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'accept_privacy') THEN
        ALTER TABLE users ADD COLUMN accept_privacy BOOLEAN DEFAULT FALSE NOT NULL;
        RAISE NOTICE 'Added column accept_privacy to users table';
    END IF;
    
    -- Agregar marketing_consent si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'marketing_consent') THEN
        ALTER TABLE users ADD COLUMN marketing_consent BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added column marketing_consent to users table';
    END IF;
    
    RAISE NOTICE 'Migration completed successfully!';
END $$;

-- Verificar la estructura de la tabla
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND column_name IN ('accept_terms', 'accept_privacy', 'marketing_consent')
ORDER BY ordinal_position;