/**
 * Razorpay verifySignature hardening tests
 *
 * Tests the three new validations added to razorpayController.verifySignature:
 * 1. Order ID mismatch is rejected
 * 2. Non-captured payment is rejected
 * 3. Amount mismatch is rejected (for existing Payment records)
 * 4. Valid captured payment still succeeds
 * 5. Duplicate protection still works
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

import User from './models/User.js';
import Payment from './models/Payment.js';
import Transaction from './models/Transaction.js';

const mongoURI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/gigcampus';
const TEST_EMAIL = 'rzp_verify_test@gigcampus.com';
const secret = process.env.RAZORPAY_KEY_SECRET || 'test_secret';

let passed = 0;
let failed = 0;

function assert(condition, msg) {
    if (condition) {
        console.log(`  ✅ PASS: ${msg}`);
        passed++;
    } else {
        console.error(`  ❌ FAIL: ${msg}`);
        failed++;
    }
}

function mockReq(body, userId) {
    return {
        body,
        user: { _id: userId },
        requestId: 'test-rzp-001'
    };
}

function mockRes() {
    const res = {
        _status: null,
        _json: null,
        status(s) { res._status = s; return res; },
        json(d) { res._json = d; return res; }
    };
    return res;
}

function genSignature(orderId, paymentId) {
    return crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');
}

async function runTests() {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoURI);
    console.log('✅ Connected.\n');

    await User.deleteMany({ email: TEST_EMAIL });

    const user = await User.create({
        username: 'rzp_verify_user',
        email: TEST_EMAIL,
        password: 'TestPass123!',
        role: 'freelancer',
        isEmailVerified: true
    });
    const userId = user._id;
    const initialBalance = user.wallet?.balance || 0;
    console.log(`👤 Test user: ${user.username} | Initial wallet balance: ₹${initialBalance}\n`);

    // ── Mock razorpayService.fetchPayment ────────────────────────────────
    // We intercept the default export of razorpayService so the controller uses our mock.
    const razorpayService = (await import('./services/razorpayService.js')).default;
    const originalFetchPayment = razorpayService.fetchPayment;

    let mockFetchResult = null;
    let mockFetchError = null;
    razorpayService.fetchPayment = async (paymentId) => {
        if (mockFetchError) throw mockFetchError;
        return mockFetchResult;
    };

    // Import controller AFTER mocking the service
    const { verifySignature } = await import('./controllers/razorpayController.js');

    // ─── TEST 1: Order ID mismatch rejected ──────────────────────────────
    console.log('--- TEST 1: Order ID mismatch rejected ---');
    {
        const orderId = 'order_mismatch_001';
        const paymentId = 'pay_mismatch_001';
        const sig = genSignature(orderId, paymentId);

        // Razorpay returns a DIFFERENT order_id than what was submitted
        mockFetchResult = {
            id: paymentId,
            order_id: 'order_different_999',
            status: 'captured',
            amount: 50000,
            method: 'upi'
        };
        mockFetchError = null;

        const req = mockReq({
            razorpay_order_id: orderId,
            razorpay_payment_id: paymentId,
            razorpay_signature: sig
        }, userId);
        const res = mockRes();

        await verifySignature(req, res);

        assert(res._status === 400, 'Returns HTTP 400 on order_id mismatch');
        assert(res._json?.message?.includes('order ID mismatch'), 'Error mentions order ID mismatch');

        const afterUser = await User.findById(userId);
        const afterBalance = afterUser.wallet?.balance || 0;
        assert(afterBalance === initialBalance, `Wallet unchanged (still ₹${afterBalance})`);
    }

    // ─── TEST 2: Non-captured payment rejected ───────────────────────────
    console.log('\n--- TEST 2: Non-captured payment rejected ---');
    {
        const orderId = 'order_not_captured';
        const paymentId = 'pay_not_captured';
        const sig = genSignature(orderId, paymentId);

        mockFetchResult = {
            id: paymentId,
            order_id: orderId,
            status: 'authorized',
            amount: 30000,
            method: 'card'
        };
        mockFetchError = null;

        const req = mockReq({
            razorpay_order_id: orderId,
            razorpay_payment_id: paymentId,
            razorpay_signature: sig
        }, userId);
        const res = mockRes();

        await verifySignature(req, res);

        assert(res._status === 400, 'Returns HTTP 400 for non-captured payment');
        assert(res._json?.message?.includes('not completed'), 'Error mentions payment not completed');
        assert(res._json?.message?.includes('authorized'), 'Error includes actual status');

        const afterUser = await User.findById(userId);
        const afterBalance = afterUser.wallet?.balance || 0;
        assert(afterBalance === initialBalance, `Wallet unchanged (still ₹${afterBalance})`);
    }

    // ─── TEST 3: Amount mismatch rejected (existing Payment record) ──────
    console.log('\n--- TEST 3: Amount mismatch rejected ---');
    {
        const orderId = 'order_amt_mismatch';
        const paymentId = 'pay_amt_mismatch';
        const sig = genSignature(orderId, paymentId);

        // Create a Payment record with amount 100
        const existingPayment = await Payment.create({
            user: userId,
            client: userId,
            amount: 100,
            currency: 'INR',
            status: 'CREATED',
            razorpayOrderId: orderId,
            paymentMethod: 'razorpay'
        });

        // Razorpay returns amount 200 (different from stored 100)
        mockFetchResult = {
            id: paymentId,
            order_id: orderId,
            status: 'captured',
            amount: 20000,
            method: 'netbanking'
        };
        mockFetchError = null;

        const req = mockReq({
            razorpay_order_id: orderId,
            razorpay_payment_id: paymentId,
            razorpay_signature: sig
        }, userId);
        const res = mockRes();

        await verifySignature(req, res);

        assert(res._status === 400, 'Returns HTTP 400 on amount mismatch');
        assert(res._json?.message?.includes('amount mismatch'), 'Error mentions amount mismatch');
        assert(res._json?.message?.includes('₹100'), 'Error includes stored amount');
        assert(res._json?.message?.includes('₹200'), 'Error includes fetched amount');

        const afterUser = await User.findById(userId);
        const afterBalance = afterUser.wallet?.balance || 0;
        assert(afterBalance === initialBalance, `Wallet unchanged (still ₹${afterBalance})`);

        // Verify Payment record was NOT updated to SUCCESS
        const afterPayment = await Payment.findById(existingPayment._id);
        assert(afterPayment.status === 'CREATED', `Payment status unchanged (still ${afterPayment.status})`);

        await Payment.findByIdAndDelete(existingPayment._id);
    }

    // ─── TEST 4: Valid captured payment succeeds ──────────────────────────
    console.log('\n--- TEST 4: Valid captured payment succeeds ---');
    {
        const orderId = 'order_valid_001';
        const paymentId = 'pay_valid_001';
        const sig = genSignature(orderId, paymentId);

        mockFetchResult = {
            id: paymentId,
            order_id: orderId,
            status: 'captured',
            amount: 15000,
            method: 'upi'
        };
        mockFetchError = null;

        const req = mockReq({
            razorpay_order_id: orderId,
            razorpay_payment_id: paymentId,
            razorpay_signature: sig
        }, userId);
        const res = mockRes();

        await verifySignature(req, res);

        assert(res._status === 200, 'Returns HTTP 200 for valid captured payment');
        assert(res._json?.success === true, 'Response success is true');

        const afterUser = await User.findById(userId);
        const afterBalance = afterUser.wallet?.balance || 0;
        assert(afterBalance === initialBalance + 150, `Wallet credited correctly (now ₹${afterBalance}, expected ₹${initialBalance + 150})`);

        // Verify Payment record was created as SUCCESS
        const createdPayment = await Payment.findOne({ razorpayPaymentId: paymentId });
        assert(createdPayment !== null, 'Payment record created');
        assert(createdPayment?.status === 'SUCCESS', `Payment status is SUCCESS (got ${createdPayment?.status})`);
        assert(createdPayment?.razorpayOrderId === orderId, 'Payment record has correct order_id');
        assert(createdPayment?.amount === 150, `Payment amount is correct (got ${createdPayment?.amount})`);

        // Verify Transaction record
        const txn = await Transaction.findOne({ transactionId: paymentId });
        assert(txn !== null, 'Transaction record created');
        assert(txn?.amount === 150, `Transaction amount is correct (got ${txn?.amount})`);

        // Cleanup
        if (createdPayment) await Payment.findByIdAndDelete(createdPayment._id);
        if (txn) await Transaction.findByIdAndDelete(txn._id);

        // Reset wallet balance for next tests
        await User.findByIdAndUpdate(userId, { 'wallet.balance': initialBalance });
    }

    // ─── TEST 5: Duplicate protection still works ────────────────────────
    console.log('\n--- TEST 5: Duplicate protection still works ---');
    {
        const orderId = 'order_dup_001';
        const paymentId = 'pay_dup_001';
        const sig = genSignature(orderId, paymentId);

        // Pre-create a SUCCESS Payment record (simulates prior successful verification)
        const priorPayment = await Payment.create({
            user: userId,
            client: userId,
            amount: 200,
            currency: 'INR',
            status: 'SUCCESS',
            razorpayOrderId: orderId,
            razorpayPaymentId: paymentId,
            razorpaySignature: 'prior_sig',
            paymentMethod: 'upi',
            escrowedAt: new Date()
        });

        mockFetchResult = {
            id: paymentId,
            order_id: orderId,
            status: 'captured',
            amount: 20000,
            method: 'upi'
        };
        mockFetchError = null;

        const req = mockReq({
            razorpay_order_id: orderId,
            razorpay_payment_id: paymentId,
            razorpay_signature: sig
        }, userId);
        const res = mockRes();

        await verifySignature(req, res);

        assert(res._status === 409, `Returns HTTP 409 for duplicate (got ${res._status})`);
        assert(res._json?.message?.includes('already been successfully verified'), 'Error mentions duplicate');

        const afterUser = await User.findById(userId);
        const afterBalance = afterUser.wallet?.balance || 0;
        assert(afterBalance === initialBalance, `Wallet unchanged (still ₹${afterBalance})`);

        await Payment.findByIdAndDelete(priorPayment._id);
    }

    // ─── SUMMARY ─────────────────────────────────────────────────────────
    console.log('\n' + '═'.repeat(60));
    console.log(`📊 Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
    console.log('═'.repeat(60));

    razorpayService.fetchPayment = originalFetchPayment;

    await User.deleteMany({ email: TEST_EMAIL });
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB.');
    process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
    console.error('💥 Test runner error:', err);
    process.exit(1);
});
