import express from 'express';
import { sendTestEmail } from '../controllers/emailController.js';
import { protect, admin } from '../middleware/auth.js';

const router = express.Router();

/**
 * @openapi
 * /email/test:
 *   post:
 *     summary: Trigger test Nodemailer email dispatch
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, example: 'test@example.com' }
 *     responses:
 *       200:
 *         description: Test email dispatched successfully.
 *       401:
 *         description: Not authorized, no token.
 *       403:
 *         description: Not authorized as admin.
 */
router.post('/test', protect, admin, sendTestEmail);

export default router;
