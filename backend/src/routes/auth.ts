import { Router } from 'express';

import {
  login,
  register,
  refreshToken,
  logout,
  changePassword,
  getMe,
  updateProfile,
  loginRateLimiter,
} from '../controllers/authController';

import { requireAuth } from '../middlewares/auth';

const router = Router();

router.post('/login', loginRateLimiter, login);
router.post('/register', register);
router.post('/refresh', refreshToken);
router.post('/logout', requireAuth, logout);

router.put('/change-password', requireAuth, changePassword);

router.get('/me', requireAuth, getMe);
router.put('/profile', requireAuth, updateProfile);

export default router;