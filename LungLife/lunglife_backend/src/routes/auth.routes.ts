/**
 *  Auth Routes - Clean Architecture Implementation
 * Routes that support all frontend strategies and patterns
 */

import express from 'express';
import { AuthController } from '../controllers/auth.controller.v2';

const router = express.Router();

// Instantiate v2 controller (Clean Architecture)
const authController = new AuthController();

// ========== AUTHENTICATION ROUTES ==========

/**
 *  Login - Compatible with LoginStrategy
 * POST /api/auth/login
 */
router.post('/login', authController.login.bind(authController));

/**
 *  Register - Compatible with RegisterStrategy
 * POST /api/auth/register
 */
router.post('/register', authController.register.bind(authController));

/**
 *  Refresh Token - Compatible with TokenStrategy
 * POST /api/auth/refresh
 */
router.post('/refresh', authController.refresh.bind(authController));

/**
 *  Logout - Revoke refresh token
 * POST /api/auth/logout
 */
// Note: Logout endpoint not implemented in v2 architecture

// ========== PASSWORD RECOVERY ROUTES ==========

/**
 *  Forgot Password - Compatible with ForgotStrategy
 * POST /api/auth/forgot-password
 */
// Note: Password recovery endpoints are not part of minimal clean architecture

/**
 *  Reset Password - Compatible with ForgotStrategy
 * POST /api/auth/reset-password
 */
// Note: Password reset endpoint omitted

// ========== 2FA ROUTES ==========

/**
 *  Setup 2FA - Compatible with TwoFAStrategy
 * POST /api/auth/2fa/setup
 */
// Note: 2FA endpoints omitted in this minimal setup

/**
 *  Verify 2FA - Compatible with TwoFAStrategy
 * POST /api/auth/2fa/verify
 */
// Note: 2FA verify endpoint omitted

/**
 *  Disable 2FA - Compatible with TwoFAStrategy
 * POST /api/auth/2fa/disable
 */
// Note: 2FA disable endpoint omitted

// ========== USER PROFILE ROUTES ==========

/**
 * 👤 Get User Profile - For AuthFacadeService
 * GET /api/auth/user/profile
 */
// TODO: Implement getProfile method in AuthController
// router.get('/user/profile', AuthController.getProfile);

export default router;
