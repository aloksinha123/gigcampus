import readline from 'readline';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gigcampus';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const askQuestion = (query) => new Promise((resolve) => rl.question(query, resolve));

async function main() {
    console.log('\n======================================================');
    console.log('📬  GigCampus Transactional Email Manual Test Harness  📬');
    console.log('======================================================\n');

    const email = await askQuestion('👉 Enter your email address to receive testing emails: ');
    if (!email || !email.includes('@')) {
        console.log('❌ Invalid email address. Exiting.');
        rl.close();
        return;
    }

    console.log('\n🔌 Connecting to database to seed temp user preferences...');
    await mongoose.connect(MONGODB_URI);
    
    // Seed temp user so preference checks pass
    const { default: User } = await import('./models/User.js');
    const { default: emailService } = await import('./services/emailService.js');
    const { default: EmailLog } = await import('./models/EmailLog.js');

    const tempUsername = 'ManualTester';
    await User.deleteMany({ email: email.toLowerCase().trim() });
    
    const user = await User.create({
        username: tempUsername,
        email: email.toLowerCase().trim(),
        password: 'password123',
        role: 'student',
        isEmailVerified: true,
        notificationPreferences: {
            emailNotifications: true,
            messageEmails: true,
            bidEmails: true,
            paymentEmails: true,
            projectEmails: true,
            reviewEmails: true
        }
    });

    console.log(`✅ Temporary tester user created in database for ${email}.`);

    while (true) {
        console.log('\n------------------------------------------------------');
        console.log('Select a Scenario to trigger directly to your email:');
        console.log('1. Scenario 1: Verification Email');
        console.log('2. Scenario 2: Welcome & Password Reset Emails');
        console.log('3. Scenario 3: Bids (New Proposal & Bid Accepted/Rejected)');
        console.log('4. Scenario 4: Payments (Success & Failure simulation)');
        console.log('5. Scenario 5: Preferences (Test Bid Emails = OFF)');
        console.log('6. Scenario 6: Provider Failure (Simulate invalid password)');
        console.log('7. Scenario 7: Idempotency (Duplicate Prevention)');
        console.log('8. Exit & Clean up test data');
        console.log('------------------------------------------------------');
        
        const choice = await askQuestion('Enter choice (1-8): ');

        if (choice === '1') {
            console.log('\n✉️ Dispatched: Verification Link...');
            await emailService.sendVerificationEmail(
                user.email,
                user.username,
                'http://localhost:5173/verify-email/mock-verification-token'
            );
            console.log('Check your email. Button and layout should render beautifully!');
        } 
        
        else if (choice === '2') {
            console.log('\n✉️ Dispatched: Welcome Email...');
            await emailService.sendWelcomeEmail(user.email, user.username);

            console.log('✉️ Dispatched: Password Reset Email...');
            await emailService.sendPasswordResetEmail(
                user.email,
                user.username,
                'http://localhost:5173/reset-password/mock-reset-token'
            );
            console.log('Check your email. Verification & Reset emails should be in your inbox!');
        } 
        
        else if (choice === '3') {
            console.log('\n✉️ Dispatched: New Bid Proposal...');
            await emailService.sendNewBidEmail({
                studentEmail: user.email,
                studentName: user.username,
                projectTitle: 'AI Integration Development',
                freelancerName: 'AmanDev',
                bidAmount: 45000,
                deliveryDays: '15 Days',
                proposalMessage: 'Hey, I can build this Gemini integration for you within 15 days with robust unit tests.',
                projectId: new mongoose.Types.ObjectId()
            });

            console.log('✉️ Dispatched: Bid Acceptance...');
            await emailService.sendBidAcceptedEmail({
                freelancerEmail: user.email,
                freelancerName: user.username,
                projectTitle: 'AI Integration Development',
                bidAmount: 45000,
                studentName: 'ClientAlok',
                projectId: new mongoose.Types.ObjectId()
            });

            console.log('✉️ Dispatched: Bid Rejection...');
            await emailService.sendBidRejectedEmail({
                freelancerEmail: user.email,
                freelancerName: user.username,
                projectTitle: 'AI Integration Development',
                bidAmount: 45000,
                projectId: new mongoose.Types.ObjectId()
            });
            console.log('Check your email. 3 bid-related emails dispatched.');
        } 
        
        else if (choice === '4') {
            console.log('\n✉️ Dispatched: Payment Success Receipt...');
            await emailService.sendPaymentSuccessEmail({
                recipientEmail: user.email,
                recipientName: user.username,
                amount: 45000,
                transactionId: 'pay_rzp_mock_12345',
                paymentType: 'escrow_funding',
                description: 'Project Escrow Deposit - AI Integration Development'
            });

            console.log('✉️ Dispatched: Payment Verification Failed...');
            await emailService.sendPaymentFailedEmail({
                recipientEmail: user.email,
                recipientName: user.username,
                amount: 45000,
                orderId: 'order_rzp_mock_67890',
                failureReason: 'Razorpay HMAC Signature Mismatch Verification Fail'
            });
            console.log('Check your email. Success & Fail payments alerts sent.');
        } 
        
        else if (choice === '5') {
            console.log('\nToggling Bid Emails OFF in database for tester user...');
            user.notificationPreferences.bidEmails = false;
            await user.save();

            console.log('Sending New Bid Email (Should be BLOCKED by preferences)...');
            const log1 = await emailService.sendNewBidEmail({
                studentEmail: user.email,
                studentName: user.username,
                projectTitle: 'AI Integration Development',
                freelancerName: 'AmanDev',
                bidAmount: 45000,
                deliveryDays: '15 Days',
                proposalMessage: 'Hey, I can build this.',
                projectId: new mongoose.Types.ObjectId()
            });

            if (log1 === null) {
                console.log('✅ Success: Bid email was correctly BLOCKED.');
            } else {
                console.log('❌ Error: Bid email was sent despite setting.');
            }

            console.log('Sending Password Reset Email (Should BYPASS preferences)...');
            await emailService.sendPasswordResetEmail(
                user.email,
                user.username,
                'http://localhost:5173/reset-password/mock-reset-token'
            );
            console.log('Check email: Bid email was blocked, but security reset alert was received successfully!');
            
            // Restore preferences
            user.notificationPreferences.bidEmails = true;
            await user.save();
        } 
        
        else if (choice === '6') {
            console.log('\nSimulating Provider Failure by passing invalid transporter config...');
            // Change transport credentials temporarily in memory
            const oldAuth = mongoose.connection.getClient ? 'temp' : 'temp'; // placeholder
            
            // We can test this by changing EMAIL_PASS to invalid value
            const oldPass = process.env.EMAIL_PASS;
            process.env.EMAIL_PASS = 'invalid_mock_password';
            
            console.log('Performing standard business operation (welcome email)...');
            
            // Reload modules or run send transactional directly to trigger send failure
            const mailLog = await emailService.sendWelcomeEmail(user.email, user.username);
            
            if (mailLog && mailLog.status === 'FAILED') {
                console.log('✅ Success: Email sending failed safely, recorded status FAILED in database.');
                console.log('Failure Reason logged:', mailLog.failureReason);
            } else {
                console.log('❌ Error: Log was not recorded as FAILED.');
            }
            
            // Restore password
            process.env.EMAIL_PASS = oldPass;
        } 
        
        else if (choice === '7') {
            console.log('\nTesting Idempotency Duplicate Protection...');
            const eventId = `manual-test-idempotency-${Date.now()}`;
            
            console.log('Sending email first time...');
            const log1 = await emailService.sendWelcomeEmail(user.email, user.username);
            
            // Store unique requestId inside logs
            const mockLog1 = await EmailLog.create({
                user: user._id,
                recipient: user.email,
                type: 'welcome',
                status: 'SENT',
                requestId: eventId
            });

            console.log('Sending email second time with same eventId...');
            const log2 = await emailService.sendTransactionalEmail({
                userId: user._id,
                recipientEmail: user.email,
                type: 'welcome',
                subject: 'Welcome to GigCampus!',
                templateName: 'welcome',
                replacements: { username: user.username },
                requestId: eventId
            });

            if (log2 && log2._id.toString() === mockLog1._id.toString()) {
                console.log('✅ Success: Duplicate event was intercepted. Log returned original entry without duplicate mailing.');
            } else {
                console.log('❌ Error: Duplicate email was not intercepted.');
            }
            
            await EmailLog.deleteOne({ requestId: eventId });
        } 
        
        else if (choice === '8') {
            console.log('\n🧹 Cleaning up test database records...');
            await User.deleteMany({ email: email.toLowerCase().trim() });
            await EmailLog.deleteMany({ recipient: email.toLowerCase().trim() });
            console.log('🔌 Closing database connection...');
            await mongoose.connection.close();
            console.log('👋 Goodbye!');
            rl.close();
            break;
        }
    }
}

main().catch(err => {
    console.error('Test execution error:', err);
    mongoose.connection.close();
    rl.close();
});
