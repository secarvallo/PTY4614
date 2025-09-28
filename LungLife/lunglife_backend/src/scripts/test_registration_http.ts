/**
 * Script para probar el endpoint HTTP de registro de usuario
 */
import axios from 'axios';
import { spawn } from 'child_process';
import { setTimeout } from 'timers/promises';

const API_BASE_URL = 'http://localhost:3002/api';

async function testRegistrationEndpoint() {
  console.log('🌐 Probando endpoint HTTP de registro...');

  try {
    // 1. Probar health check
    console.log('\n🏥 Probando health check...');
    try {
      const healthResponse = await axios.get(`${API_BASE_URL}/health`);
      console.log('✅ Health check exitoso:', healthResponse.data);
    } catch (error: any) {
      console.log('⚠️ Health check falló:', error.message);
      return;
    }

    // 2. Datos de usuario de prueba
    const timestamp = Date.now();
    const testUser = {
      email: `test.http.${timestamp}@lunglife.com`,
      password: 'TestPassword123!',
      firstName: 'Usuario',
      lastName: 'HTTP',
      acceptTerms: true
    };

    console.log('\n📝 Probando registro HTTP con datos:');
    console.log({
      email: testUser.email,
      firstName: testUser.firstName,
      lastName: testUser.lastName
    });

    // 3. Ejecutar registro
    const registrationResponse = await axios.post(`${API_BASE_URL}/auth/register`, testUser, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    console.log('✅ Registro HTTP exitoso!');
    console.log('📋 Respuesta del servidor:');
    console.log(JSON.stringify(registrationResponse.data, null, 2));

  } catch (error: any) {
    console.error('❌ Error en las pruebas HTTP:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Ejecutar las pruebas
testRegistrationEndpoint()
  .then(() => {
    console.log('🎉 Prueba de registro completada');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Error en las pruebas:', error);
    process.exit(1);
  });