// Script para generar un hash bcrypt válido
const bcrypt = require('bcrypt');

const password = 'Password123!';
const saltRounds = 10;

bcrypt.hash(password, saltRounds, function(err, hash) {
    if (err) {
        console.error('Error:', err);
        return;
    }
    console.log('Password:', password);
    console.log('Hash:', hash);
    console.log('\n-- SQL para actualizar:');
    console.log(`UPDATE user_auth SET password_hash = '${hash}', updated_at = NOW();`);
    
    // Verificar que el hash funciona
    bcrypt.compare(password, hash, function(err, result) {
        console.log('\nVerificación:', result ? 'CORRECTO ✓' : 'FALLIDO ✗');
    });
});
