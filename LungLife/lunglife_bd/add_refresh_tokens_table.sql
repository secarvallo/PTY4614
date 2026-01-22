-- =====================================================
-- LUNGLIFE - REFRESH TOKENS TABLE
-- =====================================================
-- Creates table for managing refresh tokens
-- Enables secure logout and token revocation
-- Date: January 2026
-- =====================================================

-- Refresh tokens table for secure session management
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Token Information
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    jti VARCHAR(255) NOT NULL UNIQUE, -- JWT ID for token identification
    
    -- Device and Security Info
    user_agent VARCHAR(500),
    ip_address VARCHAR(45), -- IPv6 compatible
    device_fingerprint VARCHAR(255),
    
    -- Token Lifecycle
    issued_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    revoked_at TIMESTAMP,
    
    -- Revocation Info
    is_revoked BOOLEAN DEFAULT FALSE,
    revocation_reason VARCHAR(100), -- 'logout', 'security', 'expired', 'replaced'
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_jti ON refresh_tokens(jti);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_is_revoked ON refresh_tokens(is_revoked);

-- Composite index for active token lookups
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_active ON refresh_tokens(user_id, is_revoked, expires_at)
    WHERE is_revoked = FALSE;

-- Update trigger for updated_at
CREATE TRIGGER update_refresh_tokens_updated_at 
    BEFORE UPDATE ON refresh_tokens 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions (only if user exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_user WHERE usename = 'lunglife_app') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON refresh_tokens TO lunglife_app;
        GRANT USAGE, SELECT ON SEQUENCE refresh_tokens_id_seq TO lunglife_app;
        RAISE NOTICE 'Permissions granted to lunglife_app user for refresh_tokens';
    ELSE
        RAISE NOTICE 'lunglife_app user does not exist, skipping permission grants';
    END IF;
END $$;

-- Add comments for documentation
COMMENT ON TABLE refresh_tokens IS 'Stores refresh tokens for secure session management and logout functionality';
COMMENT ON COLUMN refresh_tokens.token_hash IS 'SHA-256 hash of the refresh token for secure storage';
COMMENT ON COLUMN refresh_tokens.jti IS 'JWT ID (unique identifier) from the token payload';
COMMENT ON COLUMN refresh_tokens.is_revoked IS 'Whether the token has been revoked (logout, security, etc.)';
COMMENT ON COLUMN refresh_tokens.revocation_reason IS 'Reason for token revocation for audit purposes';
