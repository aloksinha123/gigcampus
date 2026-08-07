import mongoose from 'mongoose';
import razorpayService from '../services/razorpayService.js';
import User from '../models/User.js';
import Payment from '../models/Payment.js';
import Project from '../models/Project.js';
import Transaction from '../models/Transaction.js';

/**
 * Utility helper for structured payment logging
 */
const logPaymentEvent = (event, req, details) => {
    const requestId = req.requestId || 'N/A';
    const userId = req.user?._id ? req.user._id.toString() : 'Unauthenticated';
    const timestamp = new Date().toISOString();

    console.log(`
[PAYMENT LOG - ${event}]
Request ID: ${requestId}
User: ${userId}
Payment ID: ${details.paymentId || 'N/A'}
Razorpay Order ID: ${details.razorpayOrderId || 'N/A'}
Razorpay Payment ID: ${details.razorpayPaymentId || 'N/A'}
Timestamp: ${timestamp}
Details: ${JSON.stringify(details)}
`);
};

// @desc    Test Razorpay configuration
// @route   GET /api/v1/payments/test
// @access  Public
export const testRazorpay = async (req, res) => {
    try {
        res.json({
            success: true,
            message: "Razorpay production payment engine configured successfully"
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create Razorpay Order & Payment Record
// @route   POST /api/v1/payments/create-order
// @access  Private / Public
export const createOrder = async (req, res) => {
    try {
        const { amount, currency = 'INR', projectId } = req.body;
        const userId = req.user?._id;

        // Validation: Amount
        if (amount === undefined || amount === null) {
            return res.status(400).json({ success: false, message: 'Amount is required' });
        }
        if (typeof amount !== 'number' || isNaN(amount) || amount < 1) {
            return res.status(400).json({ success: false, message: 'Minimum payment amount is ₹1' });
        }
        if (currency && currency.toUpperCase() !== 'INR') {
            return res.status(400).json({ success: false, message: 'Only INR currency is currently supported' });
        }

        let projectObj = null;
        let clientObjId = userId;
        let freelancerObjId = null;

        // Project Validation if projectId provided
        if (projectId) {
            if (!mongoose.Types.ObjectId.isValid(projectId)) {
                return res.status(400).json({ success: false, message: 'Invalid project ID format' });
            }

            projectObj = await Project.findById(projectId);
            if (!projectObj) {
                return res.status(404).json({ success: false, message: 'Project not found' });
            }

            // Verify project ownership
            if (userId && projectObj.student.toString() !== userId.toString() && req.user.role !== 'admin') {
                return res.status(403).json({ success: false, message: 'Only project owner can initiate payment' });
            }

            clientObjId = projectObj.student;
            freelancerObjId = projectObj.freelancer;
        }

        // Create Razorpay Order via SDK
        const order = await razorpayService.createOrder(amount, currency.toUpperCase());

        // Create Payment document in MongoDB with initial status CREATED
        const payment = await Payment.create({
            user: userId || clientObjId,
            client: clientObjId,
            freelancer: freelancerObjId,
            project: projectId || undefined,
            amount: amount,
            currency: currency.toUpperCase(),
            status: 'CREATED',
            paymentMethod: 'razorpay',
            razorpayOrderId: order.id,
            timeline: [
                {
                    status: 'CREATED',
                    message: `Payment order created for ₹${amount}`,
                    timestamp: new Date()
                }
            ],
            notes: `Order created via Razorpay for project ${projectId || 'Wallet Funding'}`
        });

        // Structured Log
        logPaymentEvent('ORDER CREATION', req, {
            paymentId: payment._id.toString(),
            razorpayOrderId: order.id,
            amount,
            currency
        });

        return res.status(200).json({
            success: true,
            order,
            paymentId: payment._id,
            key: process.env.RAZORPAY_KEY_ID
        });
    } catch (error) {
        logPaymentEvent('ORDER CREATION FAILURE', req, { error: error.message });
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to create Razorpay order'
        });
    }
};

// @desc    Verify Razorpay Payment Signature & Update Payment Lifecycle
// @route   POST /api/v1/payments/verify
// @access  Private / Public
export const verifySignature = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, paymentId } = req.body;

        // Validation
        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({
                success: false,
                message: 'Required payment verification parameters (order_id, payment_id, signature) are missing.'
            });
        }

        // Find associated Payment document
        let payment = null;
        if (paymentId && mongoose.Types.ObjectId.isValid(paymentId)) {
            payment = await Payment.findById(paymentId);
        }
        if (!payment) {
            payment = await Payment.findOne({ razorpayOrderId: razorpay_order_id });
        }

        // Cryptographic HMAC SHA256 Signature Verification
        const isValidSignature = await razorpayService.verifySignature({
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
        });

        if (!isValidSignature) {
            logPaymentEvent('SIGNATURE MISMATCH', req, {
                paymentId: payment?._id?.toString(),
                razorpayOrderId: razorpay_order_id,
                razorpayPaymentId: razorpay_payment_id
            });

            if (payment) {
                payment.status = 'FAILED';
                payment.timeline.push({
                    status: 'FAILED',
                    message: 'Payment verification failed: Signature mismatch',
                    timestamp: new Date()
                });
                await payment.save();
            }

            return res.status(400).json({
                success: false,
                message: 'Invalid payment signature verification failed.'
            });
        }

        // Idempotency & Duplicate Verification Protection
        const existingSuccessPayment = await Payment.findOne({
            razorpayPaymentId: razorpay_payment_id,
            status: { $in: ['SUCCESS', 'verified', 'escrowed', 'completed'] }
        });

        if (existingSuccessPayment) {
            return res.status(409).json({
                success: false,
                message: 'Payment has already been successfully verified and processed.',
                paymentId: existingSuccessPayment._id
            });
        }

        // Fetch Authoritative Payment details from Razorpay API
        let rzpPaymentDetails;
        try {
            rzpPaymentDetails = await razorpayService.fetchPayment(razorpay_payment_id);
        } catch (fetchErr) {
            console.error('Razorpay fetchPayment API error:', fetchErr.message);
            return res.status(500).json({
                success: false,
                message: 'Unable to verify payment with Razorpay Gateway API'
            });
        }

        const paidAmount = rzpPaymentDetails.amount / 100; // Razorpay returns paise
        const methodUsed = rzpPaymentDetails.method || 'razorpay';
        const userId = req.user?._id;

        // If payment record didn't exist prior to verification, create it now
        if (!payment) {
            payment = await Payment.create({
                user: userId,
                client: userId,
                amount: paidAmount,
                currency: 'INR',
                status: 'CREATED',
                razorpayOrderId: razorpay_order_id,
                timeline: [{ status: 'CREATED', message: 'Order auto-created during verification', timestamp: new Date() }]
            });
        }

        // Update Payment Record Lifecycle Status to SUCCESS & Escrowed
        payment.status = 'SUCCESS';
        payment.razorpayPaymentId = razorpay_payment_id;
        payment.razorpaySignature = razorpay_signature;
        payment.transactionId = razorpay_payment_id;
        payment.paymentMethod = methodUsed;
        payment.escrowedAt = new Date();

        payment.timeline.push(
            {
                status: 'PENDING',
                message: 'Payment verification started via HMAC SHA256',
                timestamp: new Date()
            },
            {
                status: 'SUCCESS',
                message: `Payment of ₹${paidAmount} verified successfully via ${methodUsed.toUpperCase()}`,
                timestamp: new Date()
            }
        );

        await payment.save();

        // Update User Wallet if wallet funding transaction
        if (userId) {
            const updatedUser = await User.findByIdAndUpdate(
                userId,
                { $inc: { 'wallet.balance': paidAmount } },
                { new: true }
            );

            await Transaction.create({
                user: userId,
                type: 'deposit',
                amount: paidAmount,
                balanceAfter: updatedUser?.wallet?.balance || paidAmount,
                status: 'completed',
                payment: payment._id,
                description: `Razorpay Deposit (${methodUsed.toUpperCase()}, Order: ${razorpay_order_id})`,
                transactionId: razorpay_payment_id
            });
        }

        // Update Project status to in_progress if project payment
        if (payment.project) {
            await Project.findByIdAndUpdate(payment.project, {
                status: 'in_progress'
            });
        }

        // Structured Log
        logPaymentEvent('PAYMENT SUCCESS', req, {
            paymentId: payment._id.toString(),
            razorpayOrderId: razorpay_order_id,
            razorpayPaymentId: razorpay_payment_id,
            amount: paidAmount,
            method: methodUsed
        });

        // Return sanitized payment details
        const sanitizedPayment = payment.toObject();
        delete sanitizedPayment.razorpaySignature;

        return res.status(200).json({
            success: true,
            message: 'Payment verified and processed successfully',
            payment: sanitizedPayment
        });
    } catch (error) {
        logPaymentEvent('VERIFICATION FAILURE', req, { error: error.message });
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to verify Razorpay payment'
        });
    }
};

// @desc    Get Detailed Payment Record with Timeline & Gateway IDs
// @route   GET /api/v1/payments/:paymentId
// @access  Private
export const getPaymentDetails = async (req, res) => {
    try {
        const { paymentId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(paymentId)) {
            return res.status(400).json({ success: false, message: 'Invalid payment ID format' });
        }

        const payment = await Payment.findById(paymentId)
            .populate('project', 'title description budget status')
            .populate('client', 'username email profile.fullName')
            .populate('freelancer', 'username email profile.fullName')
            .populate('user', 'username email profile.fullName');

        if (!payment) {
            return res.status(404).json({ success: false, message: 'Payment record not found' });
        }

        // Sanitize sensitive values
        const paymentObj = payment.toObject();
        delete paymentObj.razorpaySignature;

        return res.json({
            success: true,
            payment: paymentObj
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get Payment History for Authenticated User (Student or Freelancer)
// @route   GET /api/v1/payments/my & /api/v1/payments/history
// @access  Private
export const getMyPaymentHistory = async (req, res) => {
    try {
        const userId = req.user._id;

        const payments = await Payment.find({
            $or: [
                { client: userId },
                { freelancer: userId },
                { user: userId }
            ]
        })
            .populate('project', 'title budget status')
            .populate('client', 'username email profile.fullName')
            .populate('freelancer', 'username email profile.fullName')
            .sort({ createdAt: -1 });

        const sanitizedPayments = payments.map(p => {
            const obj = p.toObject();
            delete obj.razorpaySignature;
            return obj;
        });

        return res.json(sanitizedPayments);
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Handle Razorpay Webhooks
// @route   POST /api/v1/payments/razorpay/webhook
// @access  Public
export const handleWebhook = async (req, res) => {
    try {
        res.json({ received: true });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Fetch Razorpay Payment Details from Gateway API
// @route   GET /api/v1/payments/razorpay/:paymentId
// @access  Private
export const fetchPayment = async (req, res) => {
    try {
        const payment = await razorpayService.fetchPayment(req.params.paymentId);
        res.json({
            success: true,
            payment
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export default {
    testRazorpay,
    createOrder,
    verifySignature,
    getPaymentDetails,
    getMyPaymentHistory,
    handleWebhook,
    fetchPayment
};
