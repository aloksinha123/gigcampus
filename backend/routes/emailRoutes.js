import express from 'express';
import { sendTestEmail } from '../controllers/emailController.js';

const router = express.Router();

/**
 * @openapi
 * /email/test:
 *   post:
 *     summary: Trigger test Nodemailer email dispatch
 *     tags: [Admin]
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
 */
router.post('/test', sendTestEmail);

export default router;
