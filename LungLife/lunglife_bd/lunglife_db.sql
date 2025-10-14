-- 🗃️ Script de Base de Datos PostgreSQL para LungLife Enhanced Auth
-- Ejecutar en orden para crear la estructura completa

-- Crear base de datos
CREATE DATABASE lunglife_db;

-- Conectar a la base de datos
\c lunglife_db;

-- Tabla principal de usuarios con campos mejorados
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    apellido VARCHAR(255),
    phone VARCHAR(20),
    fecha_nacimiento DATE,

    -- Campos de seguridad
    email_verified BOOLEAN DEFAULT FALSE,
    two_fa_enabled BOOLEAN DEFAULT FALSE,
    two_fa_secret VARCHAR(255), -- Para Google Authenticator/TOTP
    backup_codes TEXT[], -- Códigos de respaldo 2FA

    -- Control de acceso
    is_active BOOLEAN DEFAULT TRUE,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP NULL,

    -- Recuperación de contraseña
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP,
    password_changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    last_login_ip INET,
    login_count INTEGER DEFAULT 0,

    -- Campos de aceptación - CRÍTICOS PARA COMPLIANCE
    accept_terms BOOLEAN DEFAULT FALSE NOT NULL,     -- OBLIGATORIO: Términos y condiciones
    accept_privacy BOOLEAN DEFAULT FALSE NOT NULL,   -- OBLIGATORIO: Política de privacidad  
    marketing_consent BOOLEAN DEFAULT FALSE          -- OPCIONAL: Marketing/comunicaciones
);

-- Tabla de tokens JWT activos (para revocación)
CREATE TABLE user_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    token_type VARCHAR(20) DEFAULT 'access', -- 'access', 'refresh'
    device_info JSONB,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_used TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    revoked BOOLEAN DEFAULT FALSE,
    revoked_at TIMESTAMP
);

-- Tabla de códigos 2FA temporales
CREATE TABLE two_fa_codes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    code VARCHAR(10) NOT NULL,
    code_hash VARCHAR(255) NOT NULL, -- Hash del código para seguridad
    method VARCHAR(20) DEFAULT 'email', -- 'email', 'sms', 'totp', 'backup'
    session_id VARCHAR(255) UNIQUE NOT NULL,
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de verificaciones de email
CREATE TABLE email_verifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    verification_token VARCHAR(255) NOT NULL UNIQUE,
    verification_type VARCHAR(20) DEFAULT 'registration', -- 'registration', 'email_change'
    expires_at TIMESTAMP NOT NULL,
    verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMP,
    attempts INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de intentos de login (para análisis de seguridad)
CREATE TABLE login_attempts (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    ip_address INET NOT NULL,
    user_agent TEXT,
    success BOOLEAN NOT NULL,
    failure_reason VARCHAR(100),
    two_fa_used BOOLEAN DEFAULT FALSE,
    session_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de sesiones activas
CREATE TABLE user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) NOT NULL UNIQUE,
    device_name VARCHAR(100),
    device_type VARCHAR(50), -- 'mobile', 'desktop', 'tablet'
    browser VARCHAR(100),
    os VARCHAR(100),
    ip_address INET,
    location_country VARCHAR(50),
    location_city VARCHAR(100),
    is_current BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL
);

-- Tabla de configuraciones de seguridad por usuario
CREATE TABLE user_security_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,

    -- Configuraciones 2FA
    totp_enabled BOOLEAN DEFAULT FALSE,
    email_2fa_enabled BOOLEAN DEFAULT TRUE,
    sms_2fa_enabled BOOLEAN DEFAULT FALSE,
    backup_codes_generated BOOLEAN DEFAULT FALSE,

    -- Configuraciones de contraseña
    password_expiry_days INTEGER DEFAULT 90,
    require_password_change BOOLEAN DEFAULT FALSE,

    -- Notificaciones de seguridad
    notify_new_device BOOLEAN DEFAULT TRUE,
    notify_location_change BOOLEAN DEFAULT TRUE,
    notify_password_change BOOLEAN DEFAULT TRUE,

    -- Configuraciones de sesión
    max_concurrent_sessions INTEGER DEFAULT 3,
    session_timeout_minutes INTEGER DEFAULT 60,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ÍNDICES para optimización de consultas

-- Índices básicos
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_email_verified ON users(email_verified);
CREATE INDEX idx_users_active ON users(is_active);
CREATE INDEX idx_users_locked ON users(locked_until);

-- Índices para tokens
CREATE INDEX idx_tokens_user_id ON user_tokens(user_id);
CREATE INDEX idx_tokens_expires ON user_tokens(expires_at);
CREATE INDEX idx_tokens_type ON user_tokens(token_type);
CREATE INDEX idx_tokens_revoked ON user_tokens(revoked);

-- Índices para 2FA
CREATE INDEX idx_2fa_codes_user_id ON two_fa_codes(user_id);
CREATE INDEX idx_2fa_codes_session ON two_fa_codes(session_id);
CREATE INDEX idx_2fa_codes_expires ON two_fa_codes(expires_at);
CREATE INDEX idx_2fa_codes_used ON two_fa_codes(used);

-- Índices para verificaciones de email
CREATE INDEX idx_email_verifications_token ON email_verifications(verification_token);
CREATE INDEX idx_email_verifications_user ON email_verifications(user_id);
CREATE INDEX idx_email_verifications_expires ON email_verifications(expires_at);

-- Índices para intentos de login
CREATE INDEX idx_login_attempts_email ON login_attempts(email);
CREATE INDEX idx_login_attempts_ip ON login_attempts(ip_address);
CREATE INDEX idx_login_attempts_created ON login_attempts(created_at);
CREATE INDEX idx_login_attempts_success ON login_attempts(success);

-- Índices para sesiones
CREATE INDEX idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_sessions_expires ON user_sessions(expires_at);
CREATE INDEX idx_sessions_current ON user_sessions(is_current);

-- TRIGGERS para actualizar timestamps automáticamente

-- Trigger para actualizar updated_at en users
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_security_settings_updated_at
    BEFORE UPDATE ON user_security_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- FUNCIONES ALMACENADAS para operaciones comunes

-- Función para limpiar tokens expirados
CREATE OR REPLACE FUNCTION clean_expired_tokens()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM user_tokens
    WHERE expires_at < CURRENT_TIMESTAMP
    OR revoked = TRUE;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Función para limpiar códigos 2FA expirados
CREATE OR REPLACE FUNCTION clean_expired_2fa_codes()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM two_fa_codes
    WHERE expires_at < CURRENT_TIMESTAMP
    OR used = TRUE;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Función para verificar si un usuario está bloqueado
CREATE OR REPLACE FUNCTION is_user_locked(user_email VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
    user_record RECORD;
BEGIN
    SELECT locked_until, failed_login_attempts
    INTO user_record
    FROM users
    WHERE email = user_email;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- Si está bloqueado y el tiempo aún no ha expirado
    IF user_record.locked_until IS NOT NULL
       AND user_record.locked_until > CURRENT_TIMESTAMP THEN
        RETURN TRUE;
    END IF;

    -- Si el bloqueo expiró, desbloquearlo
    IF user_record.locked_until IS NOT NULL
       AND user_record.locked_until <= CURRENT_TIMESTAMP THEN
        UPDATE users
        SET locked_until = NULL,
            failed_login_attempts = 0
        WHERE email = user_email;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- DATOS INICIALES para testing

-- Crear configuración de seguridad por defecto para nuevos usuarios
CREATE OR REPLACE FUNCTION create_default_security_settings()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_security_settings (user_id)
    VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_user_security_settings
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION create_default_security_settings();

-- Usuario de prueba (contraseña: LungLife2024!)
INSERT INTO users (email, password_hash, nombre, email_verified) VALUES
('admin@lunglife.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/lewP92rHSDkxB8xzK', 'Administrador', true);

-- Programar limpieza automática (requiere extensión pg_cron)
-- SELECT cron.schedule('clean-expired-tokens', '0 2 * * *', 'SELECT clean_expired_tokens();');
-- SELECT cron.schedule('clean-expired-2fa', '0 3 * * *', 'SELECT clean_expired_2fa_codes();');

-- Vistas útiles para consultas frecuentes

-- Vista de usuarios activos con información de seguridad
CREATE VIEW active_users_security AS
SELECT
    u.id,
    u.email,
    u.nombre,
    u.email_verified,
    u.two_fa_enabled,
    u.last_login,
    u.login_count,
    u.failed_login_attempts,
    u.locked_until,
    uss.totp_enabled,
    uss.email_2fa_enabled,
    uss.max_concurrent_sessions
FROM users u
LEFT JOIN user_security_settings uss ON u.id = uss.user_id
WHERE u.is_active = TRUE;

-- Vista de sesiones activas
CREATE VIEW active_sessions AS
SELECT
    us.id,
    us.user_id,
    u.email,
    u.nombre,
    us.device_name,
    us.device_type,
    us.browser,
    us.ip_address,
    us.location_city,
    us.location_country,
    us.last_activity,
    us.expires_at
FROM user_sessions us
JOIN users u ON us.user_id = u.id
WHERE us.expires_at > CURRENT_TIMESTAMP;

-- Tabla de logs de auditoría para compliance y monitoreo de seguridad
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    email VARCHAR(255),
    event_type VARCHAR(50) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    device_info JSONB,
    metadata JSONB,
    success BOOLEAN NOT NULL DEFAULT TRUE,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para optimizar consultas de auditoría
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_email ON audit_logs(email);

COMMIT;


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