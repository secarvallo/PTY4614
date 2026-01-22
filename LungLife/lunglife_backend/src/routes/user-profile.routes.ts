/**
 * User Profile Routes
 * Rutas simplificadas para perfil de usuario
 */

import { Router } from 'express';
import { userProfileController } from '../controllers/user-profile.controller';
import { AuthMiddleware } from '../core/middleware';

const router = Router();

// GET /api/profile/me - Obtener perfil del usuario autenticado
router.get('/me', 
  AuthMiddleware.authenticateToken,
  userProfileController.getMyProfile.bind(userProfileController)
);

// PUT /api/profile/me - Actualizar perfil del usuario autenticado
router.put('/me', 
  AuthMiddleware.authenticateToken,
  userProfileController.updateMyProfile.bind(userProfileController)
);

// GET /api/profile/:id - Obtener perfil por ID (admin o mismo usuario)
router.get('/:id', 
  AuthMiddleware.authenticateToken,
  userProfileController.getProfileById.bind(userProfileController)
);

export default router;
