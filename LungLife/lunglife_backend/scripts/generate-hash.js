const bcrypt = require('bcrypt');

async function main() {
    const password = 'Doctor123!';
    const currentHash = '$2b$10$CDM9CkJg.eY/6HcfCTmyUemf1aQ.28ckqDY8Yyri.SyN7qZPcoVWy';
    
    // Verificar si el hash actual es válido
    console.log('=== PASSWORD VERIFICATION ===');
    console.log('Password:', password);
    console.log('Current hash:', currentHash);
    
    try {
        const isMatch = await bcrypt.compare(password, currentHash);
        console.log('Hash matches password:', isMatch ? 'YES ✓' : 'NO ✗');
        
        if (!isMatch) {
            // Generar nuevo hash
            console.log('\n=== GENERATING NEW HASH ===');
            const newHash = await bcrypt.hash(password, 10);
            console.log('New valid hash:', newHash);
            
            // Verificar el nuevo hash
            const verifyNew = await bcrypt.compare(password, newHash);
            console.log('New hash verification:', verifyNew ? 'VALID ✓' : 'INVALID ✗');
            
            console.log('\n=== SQL UPDATE COMMAND ===');
            console.log(`UPDATE user_auth SET password_hash = '${newHash}' WHERE user_id > 0;`);
        }
    } catch (err) {
        console.error('Error:', err.message);
    }
}

main();
