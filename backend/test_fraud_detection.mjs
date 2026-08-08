import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env configurations
dotenv.config({ path: path.join(__dirname, '.env') });

// Import models & config
import User from './models/User.js';
import FraudEvent from './models/FraudEvent.js';
import Payment from './models/Payment.js';
import Message from './models/Message.js';
import Transaction from './models/Transaction.js';
import { recordFraudSignal, getUserRiskProfile } from './services/fraudDetectionService.js';

// Setup connection URL fallback
const mongoURI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/gigcampus';

async function runTests() {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB.');

    // Clean up past test users
    console.log('🧹 Cleaning up test database...');
    const testEmail = 'trustandsafety_test@gigcampus.com';
    const testAdminEmail = 'trustandsafety_admin@gigcampus.com';
    await User.deleteMany({ email: { $in: [testEmail, testAdminEmail] } });
    await FraudEvent.deleteMany({});
    
    // Create test user and admin
    console.log('👤 Creating test accounts...');
    const testUser = await User.create({
        username: 'fraud_test_user',
        email: testEmail,
        password: 'Password123!',
        role: 'freelancer',
        isEmailVerified: true
    });

    const testAdmin = await User.create({
        username: 'fraud_admin',
        email: testAdminEmail,
        password: 'AdminPassword123!',
        role: 'admin',
        isEmailVerified: true
    });

    console.log(`✅ Test user created: ${testUser.username} (${testUser._id})`);
    console.log(`✅ Test admin created: ${testAdmin.username} (${testAdmin._id})`);

    // SCENARIO 1: Trigger Failed Login Burst Signal
    console.log('\n--- 🧪 SCENARIO 1: Failed Login Burst ---');
    const dummyReq = {
        ip: '192.168.1.50',
        headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0' }
    };
    
    // Trigger signal
    const firstEvent = await recordFraudSignal(testUser._id, 'FAILED_LOGIN_BURST', dummyReq, { failedAttempts: 5 });
    console.log('✅ First event created:', {
        id: firstEvent._id,
        eventType: firstEvent.eventType,
        riskScore: firstEvent.riskScore,
        riskLevel: firstEvent.riskLevel,
        signals: firstEvent.signals,
        status: firstEvent.status
    });

    if (firstEvent.eventType !== 'FAILED_LOGIN_BURST' || firstEvent.riskScore !== 35 || firstEvent.riskLevel !== 'MEDIUM') {
        throw new Error('FAILED_LOGIN_BURST score or level calculation incorrect');
    }

    // SCENARIO 2: Cooldown & Deduplication check
    console.log('\n--- 🧪 SCENARIO 2: Cooldown Signal Aggregation ---');
    // Call recordFraudSignal again with the same signal type within 5 minutes window
    const aggregatedEvent = await recordFraudSignal(testUser._id, 'FAILED_LOGIN_BURST', dummyReq, { failedAttempts: 6 });
    
    const count = await FraudEvent.countDocuments({ userId: testUser._id });
    console.log(`✅ FraudEvents count: ${count} (Expected: 1, because of cooldown deduplication)`);
    if (count !== 1) {
        throw new Error('Cooldown deduplication failed, created duplicate event records');
    }
    
    console.log('✅ Aggregated event details:', {
        id: aggregatedEvent._id,
        signals: aggregatedEvent.signals,
        updatedAt: aggregatedEvent.updatedAt
    });

    // SCENARIO 3: Trigger Multi-Signal Risk Accumulation
    console.log('\n--- 🧪 SCENARIO 3: Cumulative Risk-Scoring ---');
    // Trigger login rate limit breach (weight: 20)
    // Trigger duplicate payments signal (weight: 25)
    // Trigger unusual withdrawal (weight: 20)
    await recordFraudSignal(testUser._id, 'LOGIN_RATE_LIMIT', dummyReq);
    await recordFraudSignal(testUser._id, 'DUPLICATE_PAYMENT', dummyReq);
    await recordFraudSignal(testUser._id, 'UNUSUAL_WITHDRAWAL', dummyReq);

    // Get aggregated user risk profile
    const profile = await getUserRiskProfile(testUser._id);
    console.log('✅ Aggregated user risk profile:', {
        userId: profile.userId,
        riskScore: profile.riskScore,
        riskLevel: profile.riskLevel,
        signals: profile.signals,
        activeAlertsCount: profile.activeAlertsCount
    });

    // Expect score: 35 (failed login) + 20 (login limit) + 25 (duplicate payment) + 20 (unusual withdrawal) = 100 (capped at 100)
    // Expect level: CRITICAL (since score >= 80)
    if (profile.riskScore !== 100 || profile.riskLevel !== 'CRITICAL') {
        throw new Error(`Aggregate scoring incorrect. Got score: ${profile.riskScore}, level: ${profile.riskLevel}`);
    }

    // SCENARIO 4: Admin Resolve Alert
    console.log('\n--- 🧪 SCENARIO 4: Admin Resolution ---');
    const targetEvent = await FraudEvent.findOne({ userId: testUser._id, eventType: 'DUPLICATE_PAYMENT' });
    if (!targetEvent) throw new Error('Duplicate payment event not found');

    targetEvent.status = 'RESOLVED';
    targetEvent.resolutionReason = 'Verified that client made a double order mistakenly';
    targetEvent.reviewedBy = testAdmin._id;
    targetEvent.reviewedAt = new Date();
    await targetEvent.save();

    const resolvedCheck = await FraudEvent.findById(targetEvent._id);
    console.log('✅ Resolved alert state:', {
        id: resolvedCheck._id,
        status: resolvedCheck.status,
        resolutionReason: resolvedCheck.resolutionReason,
        reviewedBy: resolvedCheck.reviewedBy
    });

    if (resolvedCheck.status !== 'RESOLVED' || resolvedCheck.resolutionReason !== 'Verified that client made a double order mistakenly') {
        throw new Error('Admin resolve update failed');
    }

    // SCENARIO 5: Admin Block User Account
    console.log('\n--- 🧪 SCENARIO 5: Account Suspension (Block User) ---');
    const loginEvent = await FraudEvent.findOne({ userId: testUser._id, eventType: 'FAILED_LOGIN_BURST' });
    if (!loginEvent) throw new Error('Login event not found');

    // Perform block user logic
    testUser.isActive = false;
    await testUser.save();

    loginEvent.status = 'BLOCKED';
    loginEvent.resolutionReason = 'Suspicious credential stuffing attempts detected';
    loginEvent.reviewedBy = testAdmin._id;
    loginEvent.reviewedAt = new Date();
    await loginEvent.save();

    const blockedUser = await User.findById(testUser._id);
    const blockedEvent = await FraudEvent.findById(loginEvent._id);

    console.log('✅ Suspended user state:', {
        username: blockedUser.username,
        isActive: blockedUser.isActive
    });
    console.log('✅ Suspended event state:', {
        id: blockedEvent._id,
        status: blockedEvent.status,
        resolutionReason: blockedEvent.resolutionReason
    });

    if (blockedUser.isActive !== false || blockedEvent.status !== 'BLOCKED') {
        throw new Error('User suspension or event status block failed');
    }

    console.log('\n🌟 ALL SECURITY TELEMETRY & FRAUD DETECTION TESTS PASSED SUCCESSFULLY! 🌟');
}

runTests()
    .then(() => {
        mongoose.connection.close();
        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Integration tests failed:', err.message);
        mongoose.connection.close();
        process.exit(1);
    });
