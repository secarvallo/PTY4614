/**
 * 🔧 Database Connection Test Script
 * Prueba la conectividad con la base de datos
 */

import { config } from '../src/core/config/config';
import { DatabaseServiceFactory } from '../src/core/factories/database.factory';

async function testDatabaseConnection() {
    console.log('🔍 Testing database connection...');
    console.log('📋 Configuration:');
    
    const dbConfig = config.getDatabaseConfig();
    console.log(`   Host: ${dbConfig.host}`);
    console.log(`   Port: ${dbConfig.port}`);
    console.log(`   Database: ${dbConfig.database}`);
    console.log(`   User: ${dbConfig.user}`);
    console.log(`   Password: ${dbConfig.password ? '***CONFIGURED***' : 'NOT SET'}`);

    try {
        const factory = DatabaseServiceFactory.getInstance();
        const connection = await factory.getConnection();
        
        console.log('✅ Database connection successful!');
        
        // Test user repository
        const userRepo = await factory.getUserRepository();
        console.log('✅ User repository created successfully!');
        
        // Test a simple query
        const result: any = await connection.query('SELECT COUNT(*) as user_count FROM users');
        console.log(`✅ Query test successful! Users in DB: ${result[0]?.user_count || 'unknown'}`);
        
        // Test 2FA fields
        const twoFATest: any = await connection.query(`
            SELECT 
                COUNT(*) FILTER (WHERE two_fa_enabled = true) as enabled_2fa_users,
                COUNT(*) as total_users
            FROM users
        `);
        console.log(`✅ 2FA Status: ${twoFATest[0]?.enabled_2fa_users || 0}/${twoFATest[0]?.total_users || 0} users have 2FA enabled`);
        
        await factory.closeConnection();
        console.log('✅ Connection closed successfully!');
        
    } catch (error) {
        console.error('❌ Database connection failed:', error);
        process.exit(1);
    }
}

// Execute test
testDatabaseConnection()
    .then(() => {
        console.log('🎉 Database test completed successfully!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Database test failed:', error);
        process.exit(1);
    });