import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gigcampus';

async function runTests() {
    console.log('🚀 Starting transactional email system validation tests...');
    
    // Connect to database
    await mongoose.connect(MONGODB_URI);
    console.log('📦 Database connected successfully.');

    // Dynamically import modules to ensure process.env variables are loaded beforehand!
    const { default: User } = await import('./models/User.js');
    const { default: EmailLog } = await import('./models/EmailLog.js');
    const { default: emailService } = await import('./services/emailService.js');

    // Clear old test records
    const testEmail = 'test_email_notifier@gigcampus.com';
    await User.deleteMany({ email: testEmail });
    await EmailLog.deleteMany({ recipient: testEmail });

    // 1. Create a test user with standard default preferences
    const user = await User.create({
        username: 'test_notifier',
        email: testEmail,
        password: 'password123',
        role: 'student',
        isEmailVerified: false,
        notificationPreferences: {
            emailNotifications: true,
            messageEmails: true,
            bidEmails: true,
            paymentEmails: true,
            projectEmails: true,
            reviewEmails: true
        }
    });
    console.log('✅ Created test user with default notification preferences.');

    // 2. Validate Security Emails Bypass Preferences
    console.log('\n--- Scenario 1: Validate Security Emails Bypass Preferences ---');
    // Toggle preferences OFF globally
    user.notificationPreferences.emailNotifications = false;
    await user.save();

    console.log('Toggled global emailNotifications: false');

    // Verification email is security-related, should run unconditionally
    const verificationLog = await emailService.sendVerificationEmail(
        user.email,
        user.username,
        'http://localhost:5173/verify-email/testtoken123'
    );
    
    if (verificationLog && verificationLog.status === 'SENT') {
        console.log('✅ PASS: Verification email sent successfully despite global switch toggled off.');
    } else {
        console.log('❌ FAIL: Verification email was blocked or failed.');
    }

    // 3. Validate Non-Security Emails Respect Preferences (Global Switch)
    console.log('\n--- Scenario 2: Validate Non-Security Emails Respect Preferences (Global Switch) ---');
    // Try sending a project completed email (should be blocked because emailNotifications = false)
    const blockedLog = await emailService.sendProjectCompletedEmail({
        recipientEmail: user.email,
        recipientName: user.username,
        projectTitle: 'E-Commerce Website',
        partnerName: 'Freelancer',
        amount: 25000,
        projectId: new mongoose.Types.ObjectId()
    });

    if (blockedLog === null) {
        console.log('✅ PASS: Project completion email was correctly blocked by global switch.');
    } else {
        console.log('❌ FAIL: Non-security email was sent despite global switch being off.');
    }

    // 4. Validate Non-Security Emails Respect Specific Switches
    console.log('\n--- Scenario 3: Validate Specific Preferences Toggle ---');
    // Turn global switch ON, but messageEmails OFF
    user.notificationPreferences.emailNotifications = true;
    user.notificationPreferences.messageEmails = false;
    await user.save();
    console.log('Toggled emailNotifications: true, messageEmails: false');

    // Try sending a message email
    const blockedMessageLog = await emailService.sendNewMessageEmail({
        recipientEmail: user.email,
        recipientName: user.username,
        senderName: 'Client',
        projectTitle: 'React App',
        messageContent: 'Hey, update?',
        projectId: new mongoose.Types.ObjectId()
    });

    if (blockedMessageLog === null) {
        console.log('✅ PASS: Message email was correctly blocked by messageEmails switch.');
    } else {
        console.log('❌ FAIL: Message email was sent despite messageEmails toggle being false.');
    }

    // 5. Validate Duplicate Protection (Idempotency Key)
    console.log('\n--- Scenario 4: Validate Idempotency & Duplicate Protection ---');
    user.notificationPreferences.messageEmails = true; // Turn back on
    await user.save();

    const uniqueId = `event-test-${Date.now()}`;

    // Send first time
    const log1 = await emailService.sendNewMessageEmail({
        recipientEmail: user.email,
        recipientName: user.username,
        senderName: 'Client',
        projectTitle: 'React App',
        messageContent: 'Hey, update?',
        projectId: new mongoose.Types.ObjectId(),
        requestId: uniqueId
    });

    // Send second time with same requestId
    const log2 = await emailService.sendNewMessageEmail({
        recipientEmail: user.email,
        recipientName: user.username,
        senderName: 'Client',
        projectTitle: 'React App',
        messageContent: 'Hey, update?',
        projectId: new mongoose.Types.ObjectId(),
        requestId: uniqueId
    });

    if (log1 && log1.status === 'SENT' && log2 && log2.requestId === uniqueId) {
        // Since it checks DB, log2 should return the existing log object (and not trigger duplicate mail delivery)
        const logCount = await EmailLog.countDocuments({ requestId: uniqueId });
        if (logCount === 1) {
            console.log('✅ PASS: Duplicate email dispatch with same requestId was intercepted.');
        } else {
            console.log('❌ FAIL: Duplicate log entry was saved in the database.');
        }
    } else {
        console.log('❌ FAIL: Idempotency test failed to dispatch or record stats correctly.');
    }

    // Clean up
    await User.deleteMany({ email: testEmail });
    await EmailLog.deleteMany({ recipient: testEmail });
    console.log('\n🧹 Test records cleaned up.');

    await mongoose.connection.close();
    console.log('🔌 Database connection closed.');
    console.log('🎉 Testing completed.');
}

runTests().catch(err => {
    console.error('Fatal error during testing:', err);
    mongoose.connection.close();
});
