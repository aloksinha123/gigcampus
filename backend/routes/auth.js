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

/**
 * @openapi
 * /auth/register:
 *   post:
 *     summary: Register a new public user account (student or freelancer only)
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, email, password]
 *             properties:
 *               username: { type: string, example: 'john_doe' }
 *               email: { type: string, example: 'john@example.com' }
 *               password: { type: string, example: 'Password@123' }
 *               role: { type: string, enum: [student, freelancer], default: student, example: 'freelancer', description: 'Only student and freelancer are accepted. Admin accounts must be provisioned out-of-band.' }
 *     responses:
 *       201:
 *         description: User registered successfully. Email verification link sent.
 *       400:
 *         description: User already exists or invalid data.
 *         content: { application/json: { schema: { $ref: '#/components/schemas/ApiError' } } }
 */
router.post('/register', register);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Authenticate user & receive JWT token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, example: 'john@example.com' }
 *               password: { type: string, example: 'Password@123' }
 *     responses:
 *       200:
 *         description: Login successful. Returns user profile & JWT token.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token: { type: string, example: 'eyJhbGciOiJIUzI1Ni...' }
 *                 user: { $ref: '#/components/schemas/User' }
 *       401:
 *         description: Invalid email or password.
 *       403:
 *         description: Email verification required.
 *       429:
 *         description: Account temporarily locked due to failed login attempts or rate limiting.
 */
router.post('/login', login);

/**
 * @openapi
 * /auth/verify-email/{token}:
 *   get:
 *     summary: Verify user email address via token
 *     tags: [Authentication]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Email verified successfully.
 *       400:
 *         description: Invalid token.
 *       410:
 *         description: Token expired.
 */
router.get('/verify-email/:token', verifyEmail);

/**
 * @openapi
 * /auth/resend-verification:
 *   post:
 *     summary: Resend email verification link
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, example: 'john@example.com' }
 *     responses:
 *       200:
 *         description: Verification link resent.
 *       404:
 *         description: User not found.
 */
router.post('/resend-verification', resendVerification);

/**
 * @openapi
 * /auth/forgot-password:
 *   post:
 *     summary: Request password reset link (anti-enumeration response)
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, example: 'user@example.com' }
 *     responses:
 *       200:
 *         description: Generic success response whether email exists or not.
 */
router.post('/forgot-password', forgotPassword);

/**
 * @openapi
 * /auth/reset-password/{token}:
 *   put:
 *     summary: Set a new password using reset token
 *     tags: [Authentication]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [password, confirmPassword]
 *             properties:
 *               password: { type: string, example: 'NewPassword@123' }
 *               confirmPassword: { type: string, example: 'NewPassword@123' }
 *     responses:
 *       200:
 *         description: Password updated successfully.
 *       400:
 *         description: Invalid token or passwords do not match.
 *       410:
 *         description: Reset token expired (15-minute limit).
 */
router.put('/reset-password/:token', resetPassword);

/**
 * @openapi
 * /auth/sessions:
 *   get:
 *     summary: Get all active login sessions for current user
 *     tags: [Sessions]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List of active sessions.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Session' }
 *       401:
 *         description: Unauthorized.
 */
router.get('/sessions', protect, getSessions);

/**
 * @openapi
 * /auth/sessions/{sessionId}:
 *   delete:
 *     summary: Terminate a specific active session
 *     tags: [Sessions]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Session terminated.
 *       403:
 *         description: Forbidden. Cannot terminate another user's session.
 *       404:
 *         description: Session not found.
 */
router.delete('/sessions/:sessionId', protect, terminateSession);

/**
 * @openapi
 * /auth/sessions:
 *   delete:
 *     summary: Terminate all other sessions except current device
 *     tags: [Sessions]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: All other sessions logged out.
 */
router.delete('/sessions', protect, terminateAllOtherSessions);

/**
 * @openapi
 * /auth/me:
 *   get:
 *     summary: Get authenticated user profile data
 *     tags: [Authentication]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: User profile data.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/User' }
 *       401:
 *         description: Not authorized.
 */
router.get('/me', protect, getMe);

/**
 * @openapi
 * /auth/profile:
 *   put:
 *     summary: Update user profile details
 *     tags: [Authentication]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName: { type: string }
 *               bio: { type: string }
 *               skills: { type: array, items: { type: string } }
 *               university: { type: string }
 *               hourlyRate: { type: number }
 *     responses:
 *       200:
 *         description: Profile updated successfully.
 */
router.put('/profile', protect, updateProfile);

export default router;
