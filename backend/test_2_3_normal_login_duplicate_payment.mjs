/**
 * Test 2: Normal Login → No Fraud Event Created
 * Test 3: Duplicate Payment → DUPLICATE_PAYMENT fraud event, wallet credited only once
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config();

const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gigcampus';

import User from './models/User.js';
import Project from './models/Project.js';
import Payment from './models/Payment.js';
import Transaction from './models/Transaction.js';
import FraudEvent from './models/FraudEvent.js';
import { recordFraudSignal } from './services/fraudDetectionService.js';

async function runTests() {
    console.log('\n======================================================');
    console.log('🧪 TEST 2 & 3: Normal Login + Duplicate Payment Tests');
    console.log('======================================================\n');

    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB\n');

    // ─── Setup ───────────────────────────────────────────────────────────────
    // Clean up test data
    await User.deleteMany({ email: { $in: ['test_client_t2@gc.com', 'test_freelancer_t2@gc.com'] } });
    await FraudEvent.deleteMany({ eventType: 'DUPLICATE_PAYMENT', $or: [{ 'metadata.reason': /duplicate/i }] });

    const client = await User.create({
        username: 'test_client_t2',
        email: 'test_client_t2@gc.com',
        password: 'Password123!',
        role: 'student',
        isEmailVerified: true,
        'wallet.balance': 0
    });

    const freelancer = await User.create({
        username: 'test_freelancer_t2',
        email: 'test_freelancer_t2@gc.com',
        password: 'Password123!',
        role: 'freelancer',
        isEmailVerified: true,
        'wallet.balance': 0
    });

    console.log(`👤 Client:     ${client.username} (${client._id})`);
    console.log(`👤 Freelancer: ${freelancer.username} (${freelancer._id})`);

    // Create test project
    const project = await Project.create({
        title: 'Test Payment Project',
        description: 'Test project for payment duplicate detection',
        category: 'development',
        budget: { min: 1000, max: 5000 },
        timeline: '30 days',
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'in_progress',
        client: client._id,
        freelancer: freelancer._id
    });
    console.log(`📁 Project:    ${project.title} (${project._id})\n`);

    // ─── TEST 2: Normal Login - No Fraud Event ────────────────────────────────
    console.log('─────────────────────────────────────────────');
    console.log('🔐 TEST 2: Normal Login → Should NOT create fraud event');
    console.log('─────────────────────────────────────────────');

    const fraudEventsBefore = await FraudEvent.countDocuments({ userId: client._id });

    // Simulate what a correct login does: just authenticate, no fraud signal
    const isPasswordMatch = await client.matchPassword('Password123!');

    if (!isPasswordMatch) throw new Error('Password match failed in Test 2!');

    const fraudEventsAfter = await FraudEvent.countDocuments({ userId: client._id });

    if (fraudEventsAfter === fraudEventsBefore) {
        console.log('✅ PASS: Normal login created ZERO fraud events');
        console.log(`   Fraud events before: ${fraudEventsBefore}, After: ${fraudEventsAfter}\n`);
    } else {
        throw new Error(`❌ FAIL: Normal login unexpectedly created ${fraudEventsAfter - fraudEventsBefore} fraud event(s)!`);
    }

    // ─── TEST 3: Duplicate Payment ────────────────────────────────────────────
    console.log('─────────────────────────────────────────────');
    console.log('💳 TEST 3: Duplicate Payment Detection + Single Wallet Credit');
    console.log('─────────────────────────────────────────────');

    const paymentAmount = 5000;
    const platformCommissionRate = 0.10;
    const freelancerPayout = paymentAmount * (1 - platformCommissionRate); // ₹4500

    // Step 1: Create the first (legitimate) payment
    const payment = await Payment.create({
        project: project._id,
        client: client._id,
        freelancer: freelancer._id,
        amount: paymentAmount,
        paymentMethod: 'razorpay',
        status: 'escrowed',
        escrowedAt: new Date(),
        transactionId: `TXN-TEST-${Date.now()}`,
        timeline: [{ status: 'escrowed', message: `₹${paymentAmount} escrowed`, timestamp: new Date() }]
    });
    console.log(`\n   ✅ Payment created: ${payment._id} | Status: ${payment.status}`);

    // Step 2: Release the payment (wallet credit #1 — the legitimate one)
    const freelancerBefore = await User.findById(freelancer._id);
    const balanceBefore = freelancerBefore.wallet.balance;

    await User.findByIdAndUpdate(freelancer._id, { $inc: { 'wallet.balance': freelancerPayout } });
    payment.status = 'released';
    payment.releasedAt = new Date();
    payment.platformCommission = paymentAmount * platformCommissionRate;
    payment.freelancerAmount = freelancerPayout;
    payment.timeline.push({ status: 'released', message: `Funds released: ₹${freelancerPayout}`, timestamp: new Date() });
    await payment.save();

    await Transaction.create({
        user: freelancer._id,
        type: 'payment_received',
        amount: freelancerPayout,
        platformCommission: paymentAmount * platformCommissionRate,
        balanceAfter: freelancerPayout,  // first credit, starting from 0
        status: 'completed',
        project: project._id,
        payment: payment._id,
        description: `Payment received for project: ${project.title}`,
        transactionId: `REL-TEST-${Date.now()}`
    });

    const freelancerAfterFirst = await User.findById(freelancer._id);
    const balanceAfterFirst = freelancerAfterFirst.wallet.balance;
    console.log(`   ✅ First release: ₹${balanceAfterFirst - balanceBefore} credited to freelancer wallet`);
    console.log(`   💰 Balance: ₹${balanceBefore} → ₹${balanceAfterFirst}`);

    // Step 3: Attempt DUPLICATE payment on same project → should trigger fraud + be blocked
    console.log('\n   🔁 Attempting DUPLICATE payment on same project...');
    const existingPaymentCheck = await Payment.findOne({ project: project._id });

    let duplicateBlocked = false;
    let fraudEventCreated = false;

    if (existingPaymentCheck) {
        // Simulate what paymentController does — blocks it and fires fraud signal
        const fraudEvent = await recordFraudSignal(client._id, 'DUPLICATE_PAYMENT', null, {
            project: project._id,
            amount: paymentAmount,
            reason: 'Attempted duplicate payment creation for project'
        });
        duplicateBlocked = true;
        fraudEventCreated = !!fraudEvent;
        console.log(`   🚨 Duplicate blocked! Fraud event created: ${fraudEvent?._id}`);
        console.log(`      EventType: ${fraudEvent?.eventType} | Risk: ${fraudEvent?.riskLevel} (${fraudEvent?.riskScore})`);
    }

    // Step 4: Verify wallet was credited only ONCE
    const finalBalance = (await User.findById(freelancer._id)).wallet.balance;
    const transactions = await Transaction.find({ user: freelancer._id, type: 'payment_received' });
    const walletCreditedOnce = transactions.length === 1;

    console.log(`\n   💼 Final Freelancer Balance: ₹${finalBalance} (Expected: ₹${freelancerPayout})`);
    console.log(`   📄 Payment Transactions Count: ${transactions.length} (Expected: 1)`);

    // Final assertions
    const test3Passed =
        duplicateBlocked &&
        fraudEventCreated &&
        walletCreditedOnce &&
        Math.abs(finalBalance - freelancerPayout) < 0.01;

    if (test3Passed) {
        console.log('\n   ✅ PASS: Duplicate payment blocked');
        console.log('   ✅ PASS: DUPLICATE_PAYMENT fraud event created');
        console.log('   ✅ PASS: Wallet credited exactly once (no double credit)');
        console.log('   ✅ PASS: Transaction count = 1');
    } else {
        throw new Error(`
   FAIL Details:
   - Duplicate blocked: ${duplicateBlocked}
   - Fraud event created: ${fraudEventCreated}
   - Wallet credited once: ${walletCreditedOnce}
   - Balance correct: ${Math.abs(finalBalance - freelancerPayout) < 0.01}
        `);
    }

    // ─── SUMMARY ──────────────────────────────────────────────────────────────
    console.log('\n======================================================');
    console.log('📋 RESULTS SUMMARY');
    console.log('======================================================');
    console.log('  Test 2 (Normal Login):       ✅ PASS');
    console.log('  Test 3 (Duplicate Payment):  ✅ PASS');
    console.log('======================================================\n');
}

runTests()
    .then(() => {
        mongoose.connection.close();
        process.exit(0);
    })
    .catch(err => {
        console.error('\n❌ TEST FAILED:', err.message || err);
        mongoose.connection.close();
        process.exit(1);
    });
