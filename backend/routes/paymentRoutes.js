import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import {
    testRazorpay,
    createOrder,
    verifySignature,
    handleWebhook,
    fetchPayment
} from '../controllers/razorpayController.js';
import { protect } from '../middleware/auth.js';

const optionalAuth = async (req, res, next) => {
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            const token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = await User.findById(decoded.id).select('-password');
        } catch (error) {
            console.warn('Token validation failed in optionalAuth:', error.message);
        }
    }
    next();
};

const router = express.Router();

/**
 * @openapi
 * /payments/test:
 *   get:
 *     summary: Test Razorpay connection status
 *     tags: [Payments]
 *     responses:
 *       200:
 *         description: Razorpay gateway initialized.
 */
router.get('/test', testRazorpay);

/**
 * @openapi
 * /payments/create-order:
 *   post:
 *     summary: Create Razorpay Payment Order
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount]
 *             properties:
 *               amount: { type: number, example: 500 }
 *               currency: { type: string, example: 'INR' }
 *     responses:
 *       200:
 *         description: Razorpay order created.
 */
router.post('/create-order', optionalAuth, createOrder);

/**
 * @openapi
 * /payments/verify:
 *   post:
 *     summary: Verify Razorpay signature after payment completion
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [razorpay_order_id, razorpay_payment_id, razorpay_signature]
 *             properties:
 *               razorpay_order_id: { type: string }
 *               razorpay_payment_id: { type: string }
 *               razorpay_signature: { type: string }
 *     responses:
 *       200:
 *         description: Payment signature verified successfully.
 */
router.post('/verify', optionalAuth, verifySignature);

/**
 * @openapi
 * /payments/razorpay/order:
 *   post:
 *     summary: Create authenticated Razorpay payment order
 *     tags: [Payments]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount]
 *             properties:
 *               amount: { type: number, example: 1000 }
 *     responses:
 *       200:
 *         description: Order created.
 */
router.post('/razorpay/order', protect, createOrder);

/**
 * @openapi
 * /payments/razorpay/verify:
 *   post:
 *     summary: Verify Razorpay payment signature
 *     tags: [Payments]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Signature valid.
 */
router.post('/razorpay/verify', protect, verifySignature);

/**
 * @openapi
 * /payments/razorpay/webhook:
 *   post:
 *     summary: Razorpay Webhook listener endpoint
 *     tags: [Payments]
 *     responses:
 *       200:
 *         description: Webhook received.
 */
router.post('/razorpay/webhook', handleWebhook);

/**
 * @openapi
 * /payments/razorpay/{paymentId}:
 *   get:
 *     summary: Fetch Razorpay payment details by payment ID
 *     tags: [Payments]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Payment details.
 */
router.get('/razorpay/:paymentId', protect, fetchPayment);

export default router;
