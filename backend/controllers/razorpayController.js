import mongoose from 'mongoose';
import razorpayService from '../services/razorpayService.js';
import User from '../models/User.js';
import Payment from '../models/Payment.js';
import Project from '../models/Project.js';
import Transaction from '../models/Transaction.js';
import WebhookLog from '../models/WebhookLog.js';
import { sendPaymentSuccessEmail, sendPaymentFailedEmail } from '../services/emailService.js';
import { recordFraudSignal } from '../services/fraudDetectionService.js';

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

        // Check for rapid payment attempts (e.g. 3+ orders in 10 minutes)
        if (clientObjId) {
            const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000);
            const recentOrdersCount = await Payment.countDocuments({
                client: clientObjId,
                createdAt: { $gte: tenMinsAgo }
            });
            if (recentOrdersCount >= 3) {
                await recordFraudSignal(clientObjId, 'RAPID_PAYMENT_ATTEMPTS', req, {
                    attemptsCount: recentOrdersCount + 1,
                    timeWindow: '10 mins'
                });
            }
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

            const userToReport = payment ? (payment.user || payment.client) : (req.user?._id || null);
            await recordFraudSignal(userToReport, 'DUPLICATE_PAYMENT', req, {
                razorpayOrderId: razorpay_order_id,
                razorpayPaymentId: razorpay_payment_id,
                reason: 'Signature verification mismatch'
            });

            if (payment) {
                payment.status = 'FAILED';
                payment.timeline.push({
                    status: 'FAILED',
                    message: 'Payment verification failed: Signature mismatch',
                    timestamp: new Date()
                });
                await payment.save();

                // Trigger payment failed email (non-blocking)
                try {
                    const clientUser = await User.findById(payment.user || payment.client);
                    if (clientUser && clientUser.email) {
                        await sendPaymentFailedEmail({
                            recipientEmail: clientUser.email,
                            recipientName: clientUser.username,
                            amount: payment.amount,
                            orderId: razorpay_order_id,
                            failureReason: 'Signature verification mismatch.',
                            requestId: `fail-sig-${razorpay_order_id}`
                        });
                    }
                } catch (emailErr) {
                    console.error('⚠️ Payment failed email dispatch failed:', emailErr.message);
                }
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

        // ── Validation 1: Verify fetched payment belongs to the submitted order ──
        if (rzpPaymentDetails.order_id !== razorpay_order_id) {
            logPaymentEvent('ORDER_ID_MISMATCH', req, {
                razorpayOrderId: razorpay_order_id,
                fetchedOrderId: rzpPaymentDetails.order_id,
                razorpayPaymentId: razorpay_payment_id
            });
            return res.status(400).json({
                success: false,
                message: 'Payment order ID mismatch. Payment does not belong to this order.'
            });
        }

        // ── Validation 2: Verify payment is captured before crediting ──
        if (rzpPaymentDetails.status !== 'captured') {
            logPaymentEvent('PAYMENT_NOT_CAPTURED', req, {
                razorpayOrderId: razorpay_order_id,
                razorpayPaymentId: razorpay_payment_id,
                fetchedStatus: rzpPaymentDetails.status
            });
            return res.status(400).json({
                success: false,
                message: `Payment not completed. Status: ${rzpPaymentDetails.status}`
            });
        }

        // ── Validation 3: For existing Payment record, verify authoritative amount matches ──
        if (payment && payment.amount !== undefined && paidAmount !== payment.amount) {
            logPaymentEvent('AMOUNT_MISMATCH', req, {
                razorpayOrderId: razorpay_order_id,
                razorpayPaymentId: razorpay_payment_id,
                storedAmount: payment.amount,
                fetchedAmount: paidAmount
            });
            return res.status(400).json({
                success: false,
                message: `Payment amount mismatch. Expected ₹${payment.amount}, got ₹${paidAmount}`
            });
        }

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

        // Trigger payment success email (non-blocking)
        try {
            const clientUser = await User.findById(payment.client || payment.user || userId);
            if (clientUser && clientUser.email) {
                await sendPaymentSuccessEmail({
                    recipientEmail: clientUser.email,
                    recipientName: clientUser.username,
                    amount: paidAmount,
                    transactionId: razorpay_payment_id,
                    paymentType: payment.project ? 'escrow_funding' : 'wallet_funding',
                    description: payment.project ? `Escrow funding for project ID: ${payment.project}` : 'Wallet deposit funding',
                    requestId: `success-pay-${razorpay_payment_id}`
                });
            }
        } catch (emailErr) {
            console.error('⚠️ Payment success email dispatch failed:', emailErr.message);
        }

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

// @desc    Production-Grade Razorpay Webhook Handler
// @route   POST /api/v1/payments/webhook & POST /api/v1/payments/razorpay/webhook
// @access  Public (Signature Verified)
export const handleWebhook = async (req, res) => {
    const requestId = req.requestId || 'N/A';
    const signature = req.headers['x-razorpay-signature'];
    const timestamp = new Date().toISOString();

    console.log(`
[WEBHOOK LOG - RECEIVED]
Request ID: ${requestId}
Timestamp: ${timestamp}
Headers Signature: ${signature ? 'Present' : 'Missing'}
`);

    // 1. Webhook Signature Verification
    const isVerified = razorpayService.verifyWebhookSignature(req.body, signature);
    if (!isVerified) {
        console.error(`
[WEBHOOK LOG - SIGNATURE MISMATCH]
Request ID: ${requestId}
Timestamp: ${timestamp}
Status: Invalid Webhook Signature
`);
        return res.status(400).json({
            success: false,
            message: 'Invalid Razorpay Webhook Signature'
        });
    }

    console.log(`
[WEBHOOK LOG - SIGNATURE VERIFIED]
Request ID: ${requestId}
Timestamp: ${timestamp}
Status: Signature Verified Successfully
`);

    try {
        const body = req.body || {};
        const eventId = body.event_id || req.headers['x-razorpay-event-id'] || `evt_${Date.now()}`;
        const eventType = body.event || 'unknown';
        const payload = body.payload || {};

        const paymentEntity = payload.payment?.entity || {};
        const orderEntity = payload.order?.entity || {};
        const refundEntity = payload.refund?.entity || {};

        const razorpayOrderId = paymentEntity.order_id || orderEntity.id || payload.order_id;
        const razorpayPaymentId = paymentEntity.id || refundEntity.payment_id || payload.payment_id;

        // 2. Idempotency Check - Prevent Duplicate Webhook Processing
        const existingLog = await WebhookLog.findOne({ eventId });
        if (existingLog && existingLog.processed) {
            console.log(`
[WEBHOOK LOG - DUPLICATE IGNORED]
Request ID: ${requestId}
Event ID: ${eventId}
Event Type: ${eventType}
Timestamp: ${timestamp}
Status: Duplicate Event Ignored
`);
            return res.status(200).json({
                success: true,
                message: 'Duplicate webhook event ignored'
            });
        }

        // 3. Find Associated Payment Document
        let payment = null;
        if (razorpayOrderId) {
            payment = await Payment.findOne({ razorpayOrderId });
        }
        if (!payment && razorpayPaymentId) {
            payment = await Payment.findOne({ razorpayPaymentId });
        }

        let newStatus = null;
        let timelineMessage = '';

        // 4. Handle Supported Event Types
        switch (eventType) {
            case 'payment.authorized':
                newStatus = 'PENDING';
                timelineMessage = `Payment authorized by bank/gateway (${paymentEntity.method || 'Razorpay'})`;
                break;

            case 'payment.captured':
            case 'order.paid':
                newStatus = 'SUCCESS';
                timelineMessage = `Payment captured successfully via Webhook (${paymentEntity.method || 'Razorpay'})`;
                break;

            case 'payment.failed':
                newStatus = 'FAILED';
                timelineMessage = `Payment failed at gateway: ${paymentEntity.error_description || 'Gateway error'}`;
                if (payment) {
                    const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000);
                    Payment.countDocuments({
                        client: payment.client,
                        status: 'FAILED',
                        updatedAt: { $gte: tenMinsAgo }
                    }).then(failedCount => {
                        if (failedCount + 1 >= 3) {
                            recordFraudSignal(payment.client, 'PAYMENT_FAILURE_BURST', null, {
                                reason: '3+ failed payments within 10 minutes',
                                lastError: paymentEntity.error_description || 'Gateway error'
                            });
                        }
                    }).catch(err => console.error('Failed to query payment failure logs:', err.message));
                }
                break;

            case 'refund.created':
                newStatus = 'PENDING';
                timelineMessage = `Refund initiated via Razorpay Webhook (Amount: ₹${(refundEntity.amount || 0) / 100})`;
                break;

            case 'refund.processed':
                newStatus = 'REFUNDED';
                timelineMessage = `Refund processed by Razorpay (Amount: ₹${(refundEntity.amount || 0) / 100})`;
                break;

            default:
                timelineMessage = `Webhook event received: ${eventType}`;
                break;
        }

        // 5. Update Payment Status & Timeline in MongoDB
        if (payment && newStatus) {
            payment.status = newStatus;
            if (razorpayPaymentId && !payment.razorpayPaymentId) {
                payment.razorpayPaymentId = razorpayPaymentId;
            }
            if (newStatus === 'SUCCESS') {
                payment.escrowedAt = payment.escrowedAt || new Date();
            }
            if (newStatus === 'REFUNDED') {
                payment.refundedAt = payment.refundedAt || new Date();
            }

            payment.timeline.push({
                status: newStatus,
                message: timelineMessage,
                timestamp: new Date()
            });

            await payment.save();
        }

        // 6. Save Webhook Log for Idempotency Audit
        await WebhookLog.create({
            eventId,
            eventType,
            paymentId: payment?._id,
            razorpayOrderId,
            razorpayPaymentId,
            verified: true,
            processed: true,
            receivedTime: new Date(),
            notes: timelineMessage
        });

        console.log(`
[WEBHOOK LOG - DATABASE UPDATED]
Request ID: ${requestId}
Payment ID: ${payment?._id || 'N/A'}
Event ID: ${eventId}
Event Type: ${eventType}
Updated Status: ${newStatus || 'Unchanged'}
Timestamp: ${timestamp}
`);

        return res.status(200).json({
            success: true,
            message: 'Webhook processed successfully',
            eventId,
            eventType,
            paymentStatus: payment?.status || 'N/A'
        });
    } catch (error) {
        console.error(`
[WEBHOOK LOG - ERROR]
Request ID: ${requestId}
Timestamp: ${timestamp}
Error: ${error.message}
`);
        return res.status(500).json({
            success: false,
            message: error.message || 'Webhook processing failed'
        });
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
