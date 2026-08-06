import express from 'express';
import {
    register,
    login,
    verifyEmail,
    resendVerification,
    getMe,
    updateProfile
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/verify-email/:token', verifyEmail);
router.post('/resend-verification', resendVerification);

router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);

export default router;