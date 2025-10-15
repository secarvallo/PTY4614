# Tests Directory

Esta carpeta contiene la estructura de pruebas para el backend de LungLife, siguiendo la misma organización que la carpeta `src/`.

## Estructura

```
tests/
├── core/                           # Pruebas para la capa núcleo
│   └── services/                   # Pruebas unitarias de servicios
│       ├── authentication.service.spec.ts
│       └── logger.service.spec.ts
└── controllers/                    # Pruebas de integración para controladores
    └── auth.controller.spec.ts
```

## Estado Actual

✅ **Estructura creada**: Directorios y archivos de prueba básicos  
⏳ **Configuración pendiente**: Framework de testing (Jest/Mocha)  
⏳ **Implementación pendiente**: Lógica de las pruebas  

## Próximos Pasos

### 1. Configurar Framework de Testing

Instalar Jest y sus dependencias:

```bash
npm install --save-dev jest @types/jest ts-jest
```

### 2. Configurar Jest

Crear `jest.config.js` en la raíz del proyecto:

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
  ],
};
```

### 3. Agregar Scripts de Testing

En `package.json`:

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

### 4. Implementar Pruebas

Los archivos de prueba ya están estructurados con casos de prueba comentados listos para implementar.

## Tipos de Pruebas

- **Unitarias**: Servicios individuales (`core/services/`)
- **Integración**: Controladores con endpoints (`controllers/`)
- **E2E**: Pendiente de implementar

## Beneficios

- **Calidad del código**: Detección temprana de errores
- **Refactoring seguro**: Cambios con confianza
- **Documentación viva**: Las pruebas documentan el comportamiento esperado
- **CI/CD**: Integración con pipelines de despliegue