/** @type {import('jest').Config} */
module.exports = {
  // Usar ts-jest para manejar TypeScript
  preset: 'ts-jest',
  
  // Entorno de ejecución
  testEnvironment: 'node',
  
  // Directorios raíz para buscar archivos
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  
  // Patrones de archivos de prueba
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  
  // Cobertura de código
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
    '!src/**/*.interface.ts'
  ],
  
  // Directorio para reportes de cobertura
  coverageDirectory: 'coverage',
  
  // Reportes de cobertura
  coverageReporters: [
    'text',
    'html',
    'lcov'
  ],
  
  // Limpiar mocks automáticamente entre tests
  clearMocks: true,
  
  // Configuración de ts-jest
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: './tests/tsconfig.json'
    }]
  },
  
  // Extensiones de archivos
  moduleFileExtensions: [
    'ts',
    'js',
    'json'
  ],
  
  // Setup files para configuración global
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  
  // Verbose output
  verbose: true
};