/**
 * 🔐 Test Script for 2FA Functionality
 * Script para probar la implementación de 2FA
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:3000/api';

// Test credentials (ajustar según tus datos de prueba)
const TEST_USER = {
  email: 'test@lunglife.com',
  password: 'TestPassword123!'
};

async function test2FA() {
  console.log('🚀 Iniciando pruebas de 2FA...\n');

  try {
    // Paso 1: Login para obtener token
    console.log('📝 Paso 1: Login de usuario...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, TEST_USER);
    
    if (!loginResponse.data.success) {
      console.error('❌ Error en login:', loginResponse.data.error);
      return;
    }

    const token = loginResponse.data.data.tokens.accessToken;
    console.log('✅ Login exitoso, token obtenido');

    // Headers con token
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    // Paso 2: Setup 2FA
    console.log('\n🔐 Paso 2: Configurar 2FA...');
    const setupResponse = await axios.post(
      `${BASE_URL}/auth/2fa/setup`,
      {},
      { headers }
    );

    if (!setupResponse.data.success) {
      console.error('❌ Error en setup 2FA:', setupResponse.data.error);
      return;
    }

    console.log('✅ 2FA setup exitoso!');
    console.log('📱 Manual Entry Key:', setupResponse.data.data.manual_entry_key);
    console.log('🔑 Backup Codes:', setupResponse.data.data.backup_codes);
    console.log('📊 QR Code generado (base64)');

    // Paso 3: Simular verificación (necesitarás ingresar el código manualmente)
    console.log('\n⏳ Para continuar con la verificación:');
    console.log('1. Abre Google Authenticator (o similar)');
    console.log('2. Agrega cuenta manualmente con la clave:', setupResponse.data.data.manual_entry_key);
    console.log('3. Ingresa el código de 6 dígitos cuando esté listo');
    
    console.log('\n📋 Endpoint para verificar: POST /api/auth/2fa/verify');
    console.log('📋 Body: { "code": "123456" }');
    console.log('📋 Headers: Authorization: Bearer', token);

    console.log('\n📋 Endpoint para desactivar: POST /api/auth/2fa/disable');
    console.log('📋 Body: { "password": "TestPassword123!" }');

    console.log('\n🎉 Prueba de 2FA completada con éxito!');

  } catch (error: any) {
    console.error('❌ Error en prueba de 2FA:', error.response?.data || error.message);
  }
}

// Función para verificar manualmente un código
async function verifyCode(token: string, code: string) {
  try {
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    const response = await axios.post(
      `${BASE_URL}/auth/2fa/verify`,
      { code },
      { headers }
    );

    if (response.data.success) {
      console.log('✅ 2FA verificado y activado exitosamente!');
    } else {
      console.log('❌ Error en verificación:', response.data.error);
    }
  } catch (error: any) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

// Función para desactivar 2FA
async function disable2FA(token: string, password: string) {
  try {
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    const response = await axios.post(
      `${BASE_URL}/auth/2fa/disable`,
      { password },
      { headers }
    );

    if (response.data.success) {
      console.log('✅ 2FA desactivado exitosamente!');
    } else {
      console.log('❌ Error desactivando 2FA:', response.data.error);
    }
  } catch (error: any) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

// Ejecutar prueba
if (require.main === module) {
  test2FA();
}

export { test2FA, verifyCode, disable2FA };