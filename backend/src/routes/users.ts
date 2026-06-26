import { Router } from 'express';
import { requireAuth } from '../middlewares/auth';
import {
  getMe,
  updateProfile,
} from '../controllers/authController';

const router = Router();

// Current logged-in user
router.get('/me', requireAuth, getMe);

// Update company profile
router.put('/profile', requireAuth, updateProfile);

export default router;