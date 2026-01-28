import { Router } from 'express';
import { AuthMiddleware } from '../middleware';

/**
 * Profile Routes (Legacy)
 * Note: Use /api/profile/me from user-profile.routes.ts for profile access
 */

const router = Router();

router.use(AuthMiddleware.authenticateToken);

// Redirect to user-profile endpoints
router.get('/', (req, res) => {
  res.status(301).json({ 
    success: false, 
    message: 'Use /api/profile/me instead'
  });
});

export default router;
