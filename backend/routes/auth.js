import express from 'express';
import {
    register,
    login,
    verifyEmail,
    resendVerification,
    forgotPassword,
    resetPassword,
    getMe,
    updateProfile
} from '../controllers/authController.js';
import {
    getSessions,
    terminateSession,
    terminateAllOtherSessions
} from '../controllers/sessionController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/verify-email/:token', verifyEmail);
router.post('/resend-verification', resendVerification);

router.post('/forgot-password', forgotPassword);
router.put('/reset-password/:token', resetPassword);

// Session Management Routes (Protected)
router.get('/sessions', protect, getSessions);
router.delete('/sessions/:sessionId', protect, terminateSession);
router.delete('/sessions', protect, terminateAllOtherSessions);

router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);

export default router;