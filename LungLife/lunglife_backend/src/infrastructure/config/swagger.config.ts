/**
 * Swagger Configuration
 * Configuración para la documentación automática de la API
 */

import swaggerJsdoc from 'swagger-jsdoc';
import { Express } from 'express';
import swaggerUi from 'swagger-ui-express';
import path from 'path';

const swaggerOptions: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'LungLife Backend API',
      version: '1.0.0',
      description: `
        LungLife Backend API - Sistema de monitoreo pulmonar
        
        ## Arquitectura
        - **Clean Architecture** con separación de capas
        - **Domain-Driven Design** para el modelado del dominio
        - **SOLID Principles** aplicados consistentemente
        
        ## Autenticación
        Utiliza JWT (JSON Web Tokens) para autenticación:
        - Bearer token en header: \`Authorization: Bearer <token>\`
        
        ## Endpoints Principales
        - **Auth**: Autenticación y gestión de usuarios
        - **Health**: Monitoreo del estado del sistema
        
        ## Códigos de Respuesta
        - **200**: Éxito
        - **400**: Error de validación
        - **401**: No autorizado
        - **403**: Acceso denegado
        - **404**: Recurso no encontrado
        - **500**: Error interno del servidor
      `,
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      },
      contact: {
        name: 'LungLife Development Team',
        email: 'dev@lunglife.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000/api',
        description: 'Servidor de desarrollo'
      },
      {
        url: 'https://api.lunglife.com/api',
        description: 'Servidor de producción'
      }
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token obtenido del endpoint /auth/login'
        }
      },
      schemas: {
        ErrorResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            error: {
              type: 'string',
              example: 'Error message'
            },
            errorCode: {
              type: 'string',
              example: 'ERROR_CODE'
            },
            timestamp: {
              type: 'string',
              format: 'date-time'
            }
          },
          required: ['success', 'error', 'errorCode']
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            data: {
              type: 'object',
              description: 'Response data'
            },
            message: {
              type: 'string',
              example: 'Operation completed successfully'
            }
          },
          required: ['success']
        }
      }
    },
    security: [
      {
        BearerAuth: []
      }
    ],
    tags: [
      {
        name: 'Auth',
        description: 'Endpoints de autenticación y gestión de usuarios'
      },
      {
        name: 'Health',
        description: 'Endpoints de monitoreo del estado del sistema'
      }
    ]
  },
  apis: [
    path.join(__dirname, '../routes/*.ts'),
    path.join(__dirname, '../controllers/*.ts')
  ]
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

/**
 * Configurar Swagger UI para la aplicación
 */
export const setupSwagger = (app: Express): void => {
  // Swagger UI
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customCss: `
      .swagger-ui .topbar { display: none; }
      .swagger-ui .info .title { color: #2c5aa0; }
    `,
    customSiteTitle: 'LungLife API Documentation',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      showCommonExtensions: true
    }
  }));

  // JSON endpoint para el spec
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  console.log(`📚 Swagger UI available at: http://localhost:${process.env.PORT || 3000}/api-docs`);
  console.log(`📄 OpenAPI Spec available at: http://localhost:${process.env.PORT || 3000}/api-docs.json`);
};

export { swaggerSpec };