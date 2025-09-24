#!/bin/bash

# Script para crear estructura de directorios del proyecto backend
# Autor: Script generado para lunglife_backend

echo "🚀 Creando estructura de directorios para lunglife_backend..."

# Crear directorio principal del proyecto
PROJECT_NAME="lunglife_backend"

# Verificar si el directorio ya existe
if [ -d "$PROJECT_NAME" ]; then
    echo "⚠️  El directorio $PROJECT_NAME ya existe."
    read -p "¿Deseas continuar y sobrescribir? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Operación cancelada."
        exit 1
    fi
fi

# Crear directorio principal
mkdir -p "$PROJECT_NAME"
cd "$PROJECT_NAME"

# Crear estructura de directorios
echo "📁 Creando directorios..."

# Directorio src con subdirectorios
mkdir -p src/{controllers,routes,config,middleware,models}

# Archivos de configuración en la raíz
touch package.json
touch .env
touch tsconfig.json

echo "✅ Estructura de directorios creada exitosamente!"
echo ""
echo "📋 Estructura generada:"
echo "lunglife_backend/"
echo "├── src/"
echo "│   ├── controllers/    # Lógica de negocio"
echo "│   ├── routes/         # Rutas API"
echo "│   ├── config/         # Configuración"
echo "│   ├── middleware/     # Middlewares"
echo "│   └── models/         # Modelos de datos"
echo "├── package.json"
echo "├── .env"
echo "└── tsconfig.json"
echo ""

# Opcional: Crear algunos archivos base
read -p "¿Deseas crear archivos base de ejemplo? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "📝 Creando archivos base..."

    # Crear archivo principal
    cat > src/app.js << 'EOF'
// Archivo principal de la aplicación
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares básicos
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ruta de prueba
app.get('/', (req, res) => {
    res.json({ message: 'LungLife Backend API funcionando correctamente' });
});

app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en puerto ${PORT}`);
});

module.exports = app;
EOF

    # Crear package.json básico
    cat > package.json << 'EOF'
{
  "name": "lunglife_backend",
  "version": "1.0.0",
  "description": "Backend para aplicación LungLife",
  "main": "src/app.js",
  "scripts": {
    "start": "node src/app.js",
    "dev": "nodemon src/app.js",
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "keywords": ["nodejs", "express", "api", "backend"],
  "author": "",
  "license": "ISC",
  "dependencies": {
    "express": "^4.18.2"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
EOF

    # Crear archivo .env de ejemplo
    cat > .env << 'EOF'
# Variables de entorno
NODE_ENV=development
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=lunglife_db
DB_USER=your_username
DB_PASSWORD=your_password
EOF

    # Crear tsconfig.json básico
    cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
EOF

    # Crear archivos de ejemplo en subdirectorios
    echo "// Controladores de la aplicación" > src/controllers/index.js
    echo "// Rutas de la API" > src/routes/index.js
    echo "// Configuración de la aplicación" > src/config/index.js
    echo "// Middlewares personalizados" > src/middleware/index.js
    echo "// Modelos de datos" > src/models/index.js

    echo "✅ Archivos base creados exitosamente!"
fi

echo ""
echo "🎉 ¡Proyecto $PROJECT_NAME listo!"
echo "💡 Próximos pasos:"
echo "   1. cd $PROJECT_NAME"
echo "   2. npm install (para instalar dependencias)"
echo "   3. npm run dev (para ejecutar en modo desarrollo)"
echo ""


# Navega a donde tienes tu proyecto Ionic
cd proyectos

# Crea carpeta para el backend
mkdir lunglife_backend
cd lunglife_backend

# Inicializa proyecto Node.js
npm init -y

# Instala dependencias principales
npm install express pg bcrypt jsonwebtoken cors dotenv

# Instala dependencias de desarrollo
npm install -D @types/node @types/express typescript ts-node nodemon

# Crea estructura de carpetas
mkdir src src/controllers src/routes src/config src/middleware src/models

# Instalar PostgreSQL driver
npm install pg

# Si usas TypeScript, instalar tipos
npm install --save-dev @types/pg

# Instalar dotenv para variables de entorno
npm install dotenv