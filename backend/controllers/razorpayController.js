import mongoose from 'mongoose';
import razorpayService from '../services/razorpayService.js';
import User from '../models/User.js';
import Payment from '../models/Payment.js';
import Transaction from '../models/Transaction.js';

// @desc    Test Razorpay configuration
// @route   GET /api/payments/test
// @access  Public
export const testRazorpay = async (req, res) => {
    try {
        res.json({
            success: true,
            message: "Razorpay configured successfully"
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create Razorpay Order
// @route   POST /api/payments/create-order
// @access  Public / Private
export const createOrder = async (req, res) => {
    try {
        const { amount } = req.body;

        // Validation
        if (amount === undefined || amount === null) {
            return res.status(400).json({ message: 'Amount is required' });
        }

        if (typeof amount !== 'number' || isNaN(amount)) {
            return res.status(400).json({ message: 'Amount must be a number' });
        }

        if (amount < 1) {
            return res.status(400).json({ message: 'Minimum amount is ₹1' });
        }

        // Create order via Razorpay service
        const order = await razorpayService.createOrder(amount);

        return res.status(200).json({
            success: true,
            order,
            key: process.env.RAZORPAY_KEY_ID
        });
    } catch (error) {
        return res.status(500).json({
            message: error.message || 'Failed to create Razorpay order'
        });
    }
};

// @desc    Verify Razorpay Payment Signature & Credit Wallet
// @route   POST /api/payments/verify
// @access  Public / Private
export const verifySignature = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        // Step 1: Validation - Return HTTP 400 if any required field is missing
        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({
                success: false,
                message: 'Required payment verification parameters are missing.'
            });
        }

        // Step 2: Cryptographic Signature Verification (HMAC SHA256)
        const isValid = await razorpayService.verifySignature({
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
        });

        if (!isValid) {
            return res.status(400).json({
                success: false,
                message: 'Invalid payment signature.'
            });
        }

        // Step 3: Idempotency Check (Prevent duplicate processing)
        const existingTxn = await Transaction.findOne({ transactionId: razorpay_payment_id });
        const existingPayment = await Payment.findOne({
            $or: [
                { transactionId: razorpay_payment_id },
                { razorpayPaymentId: razorpay_payment_id }
            ]
        });

        if (existingTxn || existingPayment) {
            return res.status(409).json({
                success: false,
                message: 'Payment has already been processed.'
            });
        }

        // Step 4: Strict Security Check - Fetch payment details from Razorpay API. NO FALLBACK TO FRONTEND AMOUNT!
        let rzpPayment;
        try {
            rzpPayment = await razorpayService.fetchPayment(razorpay_payment_id);
        } catch (fetchErr) {
            console.error('Razorpay fetchPayment API Error:', fetchErr.message);
            return res.status(500).json({
                success: false,
                message: 'Unable to verify payment amount with Razorpay.'
            });
        }

        if (!rzpPayment || !rzpPayment.amount) {
            return res.status(500).json({
                success: false,
                message: 'Unable to verify payment amount with Razorpay.'
            });
        }

        // Calculate authoritative deposit amount in Rupees (Razorpay returns paise) & actual method used
        const depositAmount = rzpPayment.amount / 100;
        const paymentMethodUsed = rzpPayment.method || 'razorpay';

        const userId = req.user ? req.user._id : null;
        let updatedBalance = 0;
        let paymentId = razorpay_payment_id;
        let transactionId = razorpay_payment_id;

        // Step 5: MongoDB Session & Transaction Workflow
        let session = null;
        let useSession = false;

        try {
            session = await mongoose.startSession();
            session.startTransaction();
            useSession = true;
        } catch (sessionErr) {
            // Standalone local MongoDB without replica set fallback
            session = null;
            useSession = false;
        }

        try {
            const sessionOpt = useSession ? { session } : {};

            // 1. Create Payment Record (status: 'verified', paymentMethod: actual method returned by Razorpay)
            const paymentDocArr = await Payment.create([{
                user: userId || undefined,
                client: userId || undefined,
                amount: depositAmount,
                paymentMethod: paymentMethodUsed,
                status: 'verified',
                transactionId: razorpay_payment_id,
                razorpayOrderId: razorpay_order_id,
                razorpayPaymentId: razorpay_payment_id,
                razorpaySignature: razorpay_signature,
                notes: `Wallet funding via Razorpay Order: ${razorpay_order_id}`
            }], sessionOpt);

            const paymentDoc = Array.isArray(paymentDocArr) ? paymentDocArr[0] : paymentDocArr;
            paymentId = paymentDoc._id.toString();

            if (userId) {
                // 2. Perform Atomic Wallet Update ($inc) & Read Updated Balance
                const updatedUser = await User.findByIdAndUpdate(
                    userId,
                    { $inc: { 'wallet.balance': depositAmount } },
                    { new: true, ...sessionOpt }
                );
                updatedBalance = updatedUser?.wallet?.balance || depositAmount;

                // 3. Create Transaction Record (balanceAfter: updatedBalance)
                const txnDocArr = await Transaction.create([{
                    user: userId,
                    type: 'deposit',
                    amount: depositAmount,
                    balanceAfter: updatedBalance,
                    status: 'completed',
                    payment: paymentDoc._id,
                    description: `Wallet funding via Razorpay (${paymentMethodUsed.toUpperCase()}, Order: ${razorpay_order_id})`,
                    transactionId: razorpay_payment_id
                }], sessionOpt);

                const txnDoc = Array.isArray(txnDocArr) ? txnDocArr[0] : txnDocArr;
                transactionId = txnDoc.transactionId;
            }

            // Commit MongoDB Transaction if session is active
            if (useSession && session) {
                await session.commitTransaction();
                session.endSession();
            }
        } catch (dbError) {
            if (useSession && session) {
                await session.abortTransaction();
                session.endSession();
            }
            throw dbError;
        }

        // Return HTTP 200 Success Response
        return res.status(200).json({
            success: true,
            message: 'Wallet credited successfully.',
            walletBalance: updatedBalance,
            paymentId: paymentId,
            transactionId: transactionId
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to process payment and fund wallet.'
        });
    }
};

// @desc    Handle Razorpay Webhooks
// @route   POST /api/payments/razorpay/webhook
// @access  Public
export const handleWebhook = async (req, res) => {
    try {
        res.json({ received: true });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Fetch Razorpay Payment Details
// @route   GET /api/payments/razorpay/:paymentId
// @access  Private
export const fetchPayment = async (req, res) => {
    try {
        const payment = await razorpayService.fetchPayment(req.params.paymentId);
        res.json(payment);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export default {
    testRazorpay,
    createOrder,
    verifySignature,
    handleWebhook,
    fetchPayment
};
