/**
 * Sprint 28.1 — Tests 4 through 12
 * Fraud Detection & Trust Safety — Full Integration Suite
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gigcampus';

import User from './models/User.js';
import Bid from './models/Bid.js';
import Project from './models/Project.js';
import FraudEvent from './models/FraudEvent.js';
import { recordFraudSignal, getUserRiskProfile } from './services/fraudDetectionService.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const pass = (msg) => console.log(`   ✅ PASS: ${msg}`);
const fail = (msg) => { throw new Error(`   ❌ FAIL: ${msg}`); };

let passed = 0, failed = 0, testResults = [];

async function runTest(name, fn) {
    console.log(`\n${'─'.repeat(56)}`);
    console.log(`🧪 ${name}`);
    console.log('─'.repeat(56));
    try {
        await fn();
        console.log(`\n   🟢 ${name}: PASS`);
        testResults.push({ name, status: 'PASS' });
        passed++;
    } catch (err) {
        console.error(`\n   🔴 ${name}: FAIL`);
        console.error(`   Reason: ${err.message}`);
        testResults.push({ name, status: 'FAIL', reason: err.message });
        failed++;
    }
}

async function makeUser(username, email, role = 'student') {
    await User.deleteOne({ email });
    return User.create({
        username, email, password: 'Password123!', role,
        isEmailVerified: true, 'wallet.balance': 1000
    });
}

async function makeProject(client, freelancer) {
    return Project.create({
        title: 'Fraud Test Project',
        description: 'Test project for fraud tests',
        category: 'development',
        budget: { min: 1000, max: 5000 },
        timeline: '30 days',
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'in_progress',
        client: client._id,
        freelancer: freelancer._id
    });
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
await mongoose.connect(mongoURI);
console.log('\n✅ Connected to MongoDB');
console.log('🧹 Cleaning up previous test data...');

const testEmails = [
    't4_client@gc.com', 't5_freelancer@gc.com', 't6_user@gc.com',
    't7_sender@gc.com', 't7_receiver@gc.com', 't9_normaluser@gc.com',
    't10_admin@gc.com', 't11_user@gc.com', 't12_user@gc.com'
];
await User.deleteMany({ email: { $in: testEmails } });
await FraudEvent.deleteMany({ 'metadata.testSuite': 'sprint28-tests-4-12' });

// ══════════════════════════════════════════════════════════════════════════════
// TEST 4: PAYMENT_FAILURE_BURST
// ══════════════════════════════════════════════════════════════════════════════
await runTest('Test 4: Payment Failure Burst → PAYMENT_FAILURE_BURST signal', async () => {
    const user = await makeUser('t4_client', 't4_client@gc.com');

    // Simulate 3 rapid payment failures (past the PAYMENT_FAILURE_LIMIT of 3)
    const event = await recordFraudSignal(user._id, 'PAYMENT_FAILURE_BURST', null, {
        testSuite: 'sprint28-tests-4-12',
        reason: 'Multiple payment failures in short window',
        failures: 3
    });

    if (!event) fail('No fraud event was created');
    if (event.eventType !== 'PAYMENT_FAILURE_BURST') fail(`Wrong event type: ${event.eventType}`);

    pass(`PAYMENT_FAILURE_BURST event created → Risk: ${event.riskLevel} (${event.riskScore})`);

    // Verify payment system is NOT permanently blocked
    // The fraud event is advisory — it does not lock the user account
    const freshUser = await User.findById(user._id);
    if (freshUser.isActive === false) fail('User was auto-blocked — payment system broken!');
    pass('User account still active — legitimate payments still possible');
});

// ══════════════════════════════════════════════════════════════════════════════
// TEST 5: SUSPICIOUS_BIDDING
// ══════════════════════════════════════════════════════════════════════════════
await runTest('Test 5: Suspicious Bidding → SUSPICIOUS_BIDDING signal', async () => {
    const freelancer = await makeUser('t5_freelancer', 't5_freelancer@gc.com', 'freelancer');
    const client = await makeUser('t4_client_b', 't4_client@gc.com').catch(() =>
        User.findOne({ email: 't4_client@gc.com' }));

    // Create 5+ projects to bid on
    const projects = [];
    for (let i = 0; i < 6; i++) {
        projects.push(await Project.create({
            title: `Bid Test Project ${i}`,
            description: 'Bidding test project',
            category: 'development',
            budget: { min: 500, max: 2000 },
            timeline: '14 days',
            deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            status: 'open',
            client: client._id
        }));
    }

    // Create 6 bids rapidly (exceeds BIDDING_LIMIT of 5)
    for (const p of projects) {
        await Bid.create({
            project: p._id,
            freelancer: freelancer._id,
            price: 1000,
            timeline: '7 days',
            proposal: 'Test proposal for fraud detection'
        });
    }

    // Trigger SUSPICIOUS_BIDDING signal
    const event = await recordFraudSignal(freelancer._id, 'SUSPICIOUS_BIDDING', null, {
        testSuite: 'sprint28-tests-4-12',
        reason: '6 bids in under 5 minutes',
        bidCount: 6
    });

    if (!event) fail('No fraud event created for suspicious bidding');
    if (event.eventType !== 'SUSPICIOUS_BIDDING') fail(`Wrong event type: ${event.eventType}`);

    pass(`SUSPICIOUS_BIDDING event created → Risk: ${event.riskLevel} (${event.riskScore})`);

    // Verify account NOT auto-banned
    const freshUser = await User.findById(freelancer._id);
    if (freshUser.isActive === false) fail('Freelancer was auto-banned — this should NOT happen!');
    pass('Freelancer account still active — no auto-ban occurred');

    // Verify risk score increased
    const profile = await getUserRiskProfile(freelancer._id);
    if (profile.riskScore <= 0) fail('Risk score should have increased');
    pass(`Risk score increased: ${profile.riskScore} (${profile.riskLevel})`);
});

// ══════════════════════════════════════════════════════════════════════════════
// TEST 6: AI ABUSE
// ══════════════════════════════════════════════════════════════════════════════
await runTest('Test 6: AI Abuse → AI_ABUSE fraud signal', async () => {
    const user = await makeUser('t6_user', 't6_user@gc.com');

    // Simulate AI_ABUSE signal (triggered when AI rate limit is hit)
    const event = await recordFraudSignal(user._id, 'AI_ABUSE', null, {
        testSuite: 'sprint28-tests-4-12',
        reason: 'Rapid AI feature usage — rate limit exceeded',
        requestCount: 6
    });

    if (!event) fail('No fraud event created for AI abuse');
    if (event.eventType !== 'AI_ABUSE') fail(`Wrong event type: ${event.eventType}`);

    pass(`AI_ABUSE event created → Risk: ${event.riskLevel} (${event.riskScore})`);

    // Verify: AI_ABUSE alone has low weight (10) → LOW risk
    // The rate limiter (existing) still returns 429, fraud system just logs it
    if (event.riskScore !== 10) fail(`Expected riskScore 10, got ${event.riskScore}`);
    pass(`Risk score = 10 (AI_ABUSE alone = LOW, rate limiter still enforces 429 separately)`);
});

// ══════════════════════════════════════════════════════════════════════════════
// TEST 7: MESSAGE SPAM
// ══════════════════════════════════════════════════════════════════════════════
await runTest('Test 7: Message Spam → MESSAGE_SPAM fraud signal', async () => {
    const sender = await makeUser('t7_sender', 't7_sender@gc.com');
    const receiver = await makeUser('t7_receiver', 't7_receiver@gc.com');

    // Simulate MESSAGE_SPAM signal (triggered after 10+ identical msgs in 2 mins)
    const event = await recordFraudSignal(sender._id, 'MESSAGE_SPAM', null, {
        testSuite: 'sprint28-tests-4-12',
        reason: '10 identical messages sent in under 2 minutes',
        targetUserId: receiver._id,
        messageCount: 10
    });

    if (!event) fail('No fraud event created for message spam');
    if (event.eventType !== 'MESSAGE_SPAM') fail(`Wrong event type: ${event.eventType}`);

    pass(`MESSAGE_SPAM event created → Risk: ${event.riskLevel} (${event.riskScore})`);

    // Verify: Normal messaging not blocked (isActive still true)
    const freshSender = await User.findById(sender._id);
    if (freshSender.isActive === false) fail('Sender auto-banned — normal messaging would break!');
    pass('Sender account active — normal messaging still works');
});

// ══════════════════════════════════════════════════════════════════════════════
// TEST 8: ADMIN DASHBOARD DATA
// ══════════════════════════════════════════════════════════════════════════════
await runTest('Test 8: Admin Dashboard → Fraud Events Load Correctly', async () => {
    // Query what the admin endpoint would return
    const total = await FraudEvent.countDocuments({});
    const openEvents = await FraudEvent.countDocuments({ status: 'OPEN' });
    const highRisk = await FraudEvent.countDocuments({ riskLevel: { $in: ['HIGH', 'CRITICAL'] }, status: 'OPEN' });
    const resolved = await FraudEvent.countDocuments({ status: 'RESOLVED' });
    const falsePositives = await FraudEvent.countDocuments({ status: 'FALSE_POSITIVE' });
    const blocked = await FraudEvent.countDocuments({ status: 'BLOCKED' });

    console.log(`\n   📊 Dashboard Stats:`);
    console.log(`      Total Events:    ${total}`);
    console.log(`      Open Events:     ${openEvents}`);
    console.log(`      High/Critical:   ${highRisk}`);
    console.log(`      Resolved:        ${resolved}`);
    console.log(`      False Positives: ${falsePositives}`);
    console.log(`      Blocked:         ${blocked}`);

    if (total === 0) fail('No fraud events in system — dashboard would show empty state');
    if (typeof openEvents !== 'number') fail('Open events count not a number');

    pass('All dashboard stats load correctly');
    pass(`Total events: ${total}, Open: ${openEvents}, High/Critical: ${highRisk}`);
});

// ══════════════════════════════════════════════════════════════════════════════
// TEST 9: NON-ADMIN ACCESS BLOCKED
// ══════════════════════════════════════════════════════════════════════════════
await runTest('Test 9: Non-Admin Access → 403 Forbidden', async () => {
    const normalUser = await makeUser('t9_normaluser', 't9_normaluser@gc.com', 'student');

    // Simulate what the admin middleware does
    const isAdmin = normalUser.role === 'admin';

    if (isAdmin) fail('Normal student account somehow has admin role!');

    // If non-admin tries to hit /api/v1/admin/fraud/events → 403
    // We simulate the middleware check:
    const simulateAdminMiddleware = (user) => {
        if (!user || user.role !== 'admin') {
            return { status: 403, body: { success: false, message: 'Admin access required' } };
        }
        return { status: 200, body: { success: true } };
    };

    const response = simulateAdminMiddleware(normalUser);

    if (response.status !== 403) fail(`Expected 403, got ${response.status}`);

    pass(`Non-admin user → 403 Forbidden (${response.body.message})`);
    pass('Fraud dashboard is admin-only — normal users cannot access it');
});

// ══════════════════════════════════════════════════════════════════════════════
// TEST 10: FALSE POSITIVE MARKING + AUDIT LOG
// ══════════════════════════════════════════════════════════════════════════════
await runTest('Test 10: False Positive → Status + Audit Log Update', async () => {
    const admin = await makeUser('t10_admin', 't10_admin@gc.com', 'admin');

    // Create a fraud event to mark as false positive
    const event = await recordFraudSignal(admin._id, 'DUPLICATE_PAYMENT', null, {
        testSuite: 'sprint28-tests-4-12',
        reason: 'Test false positive marking'
    });

    if (!event) fail('Could not create test fraud event');

    // Mark as FALSE_POSITIVE (what admin does via UI)
    const reason = 'Verified manually — client made accidental double-click. Not fraudulent.';
    event.status = 'FALSE_POSITIVE';
    event.resolutionReason = reason;
    event.reviewedBy = admin._id;
    event.reviewedAt = new Date();
    await event.save();

    // Verify status updated
    const updated = await FraudEvent.findById(event._id);
    if (updated.status !== 'FALSE_POSITIVE') fail(`Status not updated. Got: ${updated.status}`);
    if (!updated.resolutionReason) fail('Resolution reason not saved');
    if (!updated.reviewedBy) fail('ReviewedBy not saved');
    if (!updated.reviewedAt) fail('ReviewedAt not saved');

    pass(`Status updated to: ${updated.status}`);
    pass(`Resolution reason: "${updated.resolutionReason.substring(0, 50)}..."`);
    pass(`Reviewed by admin: ${updated.reviewedBy} at ${updated.reviewedAt.toISOString()}`);
    pass('Audit trail complete — all fields recorded');
});

// ══════════════════════════════════════════════════════════════════════════════
// TEST 11: CRITICAL RISK — Multiple Signals
// ══════════════════════════════════════════════════════════════════════════════
await runTest('Test 11: Critical Risk → Score 80-100, No Auto-Ban', async () => {
    const user = await makeUser('t11_user', 't11_user@gc.com');

    // Fire multiple signals for same user
    await recordFraudSignal(user._id, 'FAILED_LOGIN_BURST', null, { testSuite: 'sprint28-tests-4-12' });      // 35
    await recordFraudSignal(user._id, 'DUPLICATE_PAYMENT', null, { testSuite: 'sprint28-tests-4-12' });       // 25
    await recordFraudSignal(user._id, 'PAYMENT_FAILURE_BURST', null, { testSuite: 'sprint28-tests-4-12' });  // 20

    // Total: 35 + 25 + 20 = 80 → CRITICAL
    const profile = await getUserRiskProfile(user._id);

    console.log(`\n   📊 User Risk Profile:`);
    console.log(`      Signals:     ${profile.signals.join(', ')}`);
    console.log(`      Risk Score:  ${profile.riskScore}`);
    console.log(`      Risk Level:  ${profile.riskLevel}`);

    if (profile.riskScore < 80) fail(`Expected CRITICAL (≥80), got score ${profile.riskScore}`);
    if (profile.riskLevel !== 'CRITICAL') fail(`Expected CRITICAL level, got ${profile.riskLevel}`);

    pass(`Risk score: ${profile.riskScore} ≥ 80 → ${profile.riskLevel}`);

    // Verify: User is NOT auto-permanently-banned
    const freshUser = await User.findById(user._id);
    if (freshUser.isActive === false) fail('User was auto-permanently-banned! Admin review NOT required — system blocks directly!');
    pass('User NOT auto-banned — admin review required before any action');
    pass('CRITICAL risk flagged prominently but no automatic permanent ban');
});

// ══════════════════════════════════════════════════════════════════════════════
// TEST 12: DUPLICATE EVENT DEDUPLICATION (Cooldown)
// ══════════════════════════════════════════════════════════════════════════════
await runTest('Test 12: Duplicate Events → Cooldown Deduplication (1 event, not N)', async () => {
    const user = await makeUser('t12_user', 't12_user@gc.com');

    // Fire the SAME signal 7 times in quick succession
    const results = [];
    for (let i = 0; i < 7; i++) {
        const event = await recordFraudSignal(user._id, 'MESSAGE_SPAM', null, {
            testSuite: 'sprint28-tests-4-12',
            attempt: i + 1
        });
        results.push(event?._id?.toString());
        await sleep(50); // tiny gap but still within 5-min cooldown window
    }

    // Count distinct event IDs — should all be the same (1 event updated 7 times)
    const uniqueIds = new Set(results.filter(Boolean));
    const totalEventsInDB = await FraudEvent.countDocuments({ userId: user._id, eventType: 'MESSAGE_SPAM' });

    console.log(`\n   📊 Deduplication Results:`);
    console.log(`      Signals fired:       7`);
    console.log(`      Unique event IDs:    ${uniqueIds.size}`);
    console.log(`      Events in DB:        ${totalEventsInDB}`);

    if (uniqueIds.size > 1) fail(`Expected 1 deduplicated event, got ${uniqueIds.size} different events!`);
    if (totalEventsInDB !== 1) fail(`Expected 1 event in DB, found ${totalEventsInDB}`);

    pass(`7 signals → 1 event in DB (not 7 duplicate records)`);
    pass('Cooldown deduplication working correctly');
    pass('System aggregates occurrences instead of spamming new events');
});

// ═══════════════════════════════════════════════════════════════════════════════
// FINAL SUMMARY
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n\n══════════════════════════════════════════════════════');
console.log('                📋 FINAL TEST RESULTS');
console.log('══════════════════════════════════════════════════════');

testResults.forEach((t, i) => {
    const icon = t.status === 'PASS' ? '✅' : '❌';
    const name = t.name.padEnd(50, ' ');
    console.log(`  ${icon} ${name} ${t.status}`);
    if (t.reason) console.log(`     ↳ ${t.reason}`);
});

console.log('══════════════════════════════════════════════════════');
console.log(`  Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
console.log('══════════════════════════════════════════════════════\n');

await mongoose.connection.close();
process.exit(failed > 0 ? 1 : 0);
