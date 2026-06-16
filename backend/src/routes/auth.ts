import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Email/password auth
router.post('/signup', AuthController.signup);
router.post('/login', AuthController.login);
router.post('/logout', AuthController.logout);

// OAuth
router.get('/google', AuthController.googleAuth);
router.get('/google/callback', AuthController.googleCallback);
router.get('/github', AuthController.githubAuth);
router.get('/github/callback', AuthController.githubCallback);

// Profile
router.get('/me', requireAuth, AuthController.me);

// Admin: reset any user's password (authenticated user only)
router.post('/admin/reset-password', requireAuth, AuthController.adminResetPassword);

// Email verification
router.post('/verify-email', AuthController.verifyEmail);
router.post('/forgot-password', AuthController.forgotPassword);
router.post('/reset-password', AuthController.resetPassword);

export default router;
