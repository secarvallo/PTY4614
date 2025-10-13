-- 🔧 Script de corrección para agregar campos de aceptación faltantes
-- Ejecutar en la base de datos lunglife_db

-- Agregar los campos de aceptación que faltan en la tabla users
ALTER TABLE users ADD COLUMN IF NOT EXISTS accept_terms BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS accept_privacy BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS marketing_consent BOOLEAN DEFAULT FALSE;

-- Agregar índices para mejorar el rendimiento en consultas de compliance
CREATE INDEX IF NOT EXISTS idx_users_accept_terms ON users(accept_terms);
CREATE INDEX IF NOT EXISTS idx_users_accept_privacy ON users(accept_privacy);
CREATE INDEX IF NOT EXISTS idx_users_marketing_consent ON users(marketing_consent);

-- Verificar la estructura actualizada
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('accept_terms', 'accept_privacy', 'marketing_consent')
ORDER BY column_name;

-- Comentarios para documentar los nuevos campos
COMMENT ON COLUMN users.accept_terms IS 'Campo obligatorio: El usuario ha aceptado los términos y condiciones';
COMMENT ON COLUMN users.accept_privacy IS 'Campo obligatorio: El usuario ha aceptado las políticas de privacidad';  
COMMENT ON COLUMN users.marketing_consent IS 'Campo opcional: Consentimiento para recibir comunicaciones de marketing';