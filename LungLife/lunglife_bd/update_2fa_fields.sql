-- 🔐 Script de Actualización para 2FA Enhanced
-- Agregar campos adicionales para funcionalidad 2FA completa

-- Agregar campos temporales para 2FA setup (solo si no existen)
DO $$ 
BEGIN
    -- Agregar two_fa_temp_secret si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'two_fa_temp_secret'
    ) THEN
        ALTER TABLE users ADD COLUMN two_fa_temp_secret VARCHAR(255);
    END IF;
    
    -- Agregar two_fa_backup_codes si no existe  
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'two_fa_backup_codes'
    ) THEN
        ALTER TABLE users ADD COLUMN two_fa_backup_codes TEXT[];
    END IF;
END $$;

-- Crear índices para mejorar performance (usando IF NOT EXISTS para evitar conflictos)
CREATE INDEX IF NOT EXISTS idx_users_two_fa_enabled ON users(two_fa_enabled);
CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email_verified);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_two_fa_temp_secret ON users(two_fa_temp_secret) WHERE two_fa_temp_secret IS NOT NULL;

-- Comentarios para documentación
COMMENT ON COLUMN users.two_fa_temp_secret IS 'Secreto temporal durante configuración 2FA, se elimina al verificar';
COMMENT ON COLUMN users.two_fa_backup_codes IS 'Códigos de respaldo para 2FA en formato JSON array';
COMMENT ON COLUMN users.two_fa_secret IS 'Secreto permanente para TOTP cuando 2FA está activo';
COMMENT ON COLUMN users.two_fa_enabled IS 'Indica si el usuario tiene 2FA activado';

-- Verificar estructura actualizada
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
    AND column_name LIKE '%two_fa%'
ORDER BY ordinal_position;