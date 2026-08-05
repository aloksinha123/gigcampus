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

// Optional auth middleware to attach user if token exists
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

// GET /api/payments/test
router.get('/test', testRazorpay);

// POST /api/payments/create-order
router.post('/create-order', optionalAuth, createOrder);

// POST /api/payments/verify
router.post('/verify', optionalAuth, verifySignature);

// Gateway endpoints
router.post('/razorpay/order', protect, createOrder);
router.post('/razorpay/verify', protect, verifySignature);
router.post('/razorpay/webhook', handleWebhook);
router.get('/razorpay/:paymentId', protect, fetchPayment);

export default router;
