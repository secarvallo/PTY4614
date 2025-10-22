/**
 * 🧪 Script de Prueba - Registro de Usuario
 * Prueba directa de la funcionalidad de registro con conexión a la base de datos
 */

import axios from 'axios';

const API_BASE_URL = 'http://localhost:3002/api';

async function testUserRegistration() {
    console.log('🧪 Testing User Registration API...');
    console.log(`📍 API Base URL: ${API_BASE_URL}`);

    // Test data for registration
    const testUser = {
        email: `test.user.${Date.now()}@example.com`,
        password: 'TestPassword123!',
        nombre: 'Test',
        apellido: 'User',
        phone: '+56912345678',
        fecha_nacimiento: '1990-01-01',
        acceptTerms: true,
        acceptPrivacy: true,
        marketingConsent: false
    };

    try {
        console.log('🔍 Step 1: Testing Health Check...');
        const healthResponse = await axios.get(`${API_BASE_URL}/health`);
        console.log('✅ Health Check:', healthResponse.data);

        console.log('\n🔍 Step 2: Testing User Registration...');
        console.log('📝 Registration data:', {
            email: testUser.email,
            nombre: testUser.nombre,
            apellido: testUser.apellido,
            acceptTerms: testUser.acceptTerms,
            acceptPrivacy: testUser.acceptPrivacy
        });

        const registrationResponse = await axios.post(`${API_BASE_URL}/auth/register`, testUser);
        console.log('✅ Registration successful:', registrationResponse.data);

        console.log('\n🔍 Step 3: Testing Login with new user...');
        const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
            email: testUser.email,
            password: testUser.password
        });
        console.log('✅ Login successful:', {
            success: loginResponse.data.success,
            user: loginResponse.data.user?.email,
            hasTokens: !!(loginResponse.data.accessToken && loginResponse.data.refreshToken)
        });

        console.log('\n🎉 All tests passed! Database connection and registration are working correctly.');

    } catch (error: any) {
        console.error('❌ Test failed:', {
            message: error.message,
            status: error.response?.status,
            data: error.response?.data,
            code: error.code
        });

        if (error.code === 'ECONNREFUSED') {
            console.error('💡 Solution: Make sure the backend server is running on http://localhost:3002');
        } else if (error.response?.status === 400) {
            console.error('💡 Solution: Check the request data format');
        } else if (error.response?.status === 500) {
            console.error('💡 Solution: Check database connection and server logs');
        }

        process.exit(1);
    }
}

// Execute test
testUserRegistration()
    .then(() => {
        console.log('\n🎯 Test completed successfully!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Test execution failed:', error);
        process.exit(1);
    });