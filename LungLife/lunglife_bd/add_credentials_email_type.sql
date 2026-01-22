-- ============================================
-- ADD CREDENTIALS TYPE TO EMAIL_VERIFICATIONS
-- Permite registrar el envío de credenciales por email
-- ============================================

-- 1. Eliminar constraint existente
ALTER TABLE email_verifications 
DROP CONSTRAINT IF EXISTS email_verifications_verification_type_check;

-- 2. Agregar nuevo constraint con tipo CREDENTIALS
ALTER TABLE email_verifications 
ADD CONSTRAINT email_verifications_verification_type_check 
CHECK (verification_type IN ('SIGNUP', 'CHANGE', 'RECOVERY', 'CREDENTIALS'));

-- 3. Verificar el cambio
SELECT conname, pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'email_verifications'::regclass 
  AND contype = 'c';

-- Nota: Los registros de tipo CREDENTIALS no requieren verification_token único
-- ya que solo registran el envío de credenciales, no una verificación pendiente.
