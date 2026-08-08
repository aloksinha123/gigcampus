import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import transporter from '../config/mail.js';
import User from '../models/User.js';
import EmailLog from '../models/EmailLog.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const getFrontendUrl = () => {
    return process.env.FRONTEND_URL || 'http://localhost:5173';
};

/**
 * Load HTML template from backend/emails/templates/ and replace placeholders
 */
const loadTemplate = (templateName, replacements = {}) => {
    const filePath = path.join(__dirname, '..', 'emails', 'templates', `${templateName}.html`);
    if (!fs.existsSync(filePath)) {
        throw new Error(`Email template ${templateName} not found at path: ${filePath}`);
    }
    let html = fs.readFileSync(filePath, 'utf8');
    for (const [key, value] of Object.entries(replacements)) {
        html = html.replaceAll(`{{${key}}}`, value === undefined || value === null ? '' : String(value));
    }
    return html;
};

/**
 * Helper to process transactional emails with preference filtering, idempotency check, and error logging
 */
export const sendTransactionalEmail = async ({
    userId,
    recipientEmail,
    type,
    subject,
    templateName,
    replacements = {},
    requestId = null,
    preferenceKey = null,
    isSecurityEmail = false
}) => {
    // 1. Idempotency check to protect against duplicates
    if (requestId) {
        const existingLog = await EmailLog.findOne({ requestId });
        if (existingLog) {
            console.log(`✉️ [IDEMPOTENCY] Email with requestId ${requestId} already processed. Skipping.`);
            return existingLog;
        }
    }

    // 2. Notification Preferences check for non-critical alerts
    if (!isSecurityEmail && preferenceKey) {
        try {
            const recipientUser = userId 
                ? await User.findById(userId) 
                : await User.findOne({ email: recipientEmail.toLowerCase() });

            if (recipientUser) {
                const prefs = recipientUser.notificationPreferences || {};
                const globalEmailEnabled = prefs.emailNotifications !== false;
                const specificEmailEnabled = prefs[preferenceKey] !== false;

                if (!globalEmailEnabled || !specificEmailEnabled) {
                    console.log(`✉️ [PREFERENCE SKIPPED] Email type "${type}" skipped for recipient: ${recipientEmail}`);
                    return null;
                }
            }
        } catch (prefsErr) {
            console.error('Failed to verify user email preferences:', prefsErr);
        }
    }

    // 3. Create EmailLog in QUEUED state
    let emailLog;
    try {
        emailLog = await EmailLog.create({
            user: userId || null,
            recipient: recipientEmail,
            type,
            status: 'QUEUED',
            requestId: requestId || undefined
        });
    } catch (logErr) {
        if (logErr.code === 11000) {
            console.log(`✉️ [IDEMPOTENCY CONCURRENT] Concurrent email with requestId ${requestId} blocked.`);
            return null;
        }
        console.error('Failed to create EmailLog:', logErr);
    }

    // 4. Compile HTML layout
    let htmlContent = '';
    try {
        const settingsUrl = `${getFrontendUrl()}/settings/notifications`;
        const defaultReplacements = {
            settingsUrl,
            ...replacements
        };
        htmlContent = loadTemplate(templateName, defaultReplacements);
    } catch (tmplErr) {
        console.error('Failed to compile email template:', tmplErr);
        if (emailLog) {
            emailLog.status = 'FAILED';
            emailLog.failureReason = `Template compile error: ${tmplErr.message}`;
            await emailLog.save();
        }
        return emailLog;
    }

    // 5. Send mail via transporter
    const fromName = process.env.EMAIL_FROM_NAME || 'GigCampus';
    const fromAddress = process.env.EMAIL_USER || process.env.EMAIL_FROM || 'no-reply@gigcampus.com';

    const mailOptions = {
        from: `"${fromName}" <${fromAddress}>`,
        to: recipientEmail,
        subject,
        html: htmlContent
    };

    const isSimulated = !process.env.EMAIL_USER || !process.env.EMAIL_PASS || 
                        process.env.EMAIL_USER === 'yourgmail@gmail.com' || 
                        process.env.DEV_MODE_EMAILS === 'true';

    try {
        if (isSimulated) {
            console.log(`✉️ [SIMULATED EMAIL - ${type.toUpperCase()}] To: ${recipientEmail}, Subject: "${subject}"`);
            if (emailLog) {
                emailLog.status = 'SENT';
                emailLog.providerMessageId = `simulated-${type}-${Date.now()}`;
                await emailLog.save();
            }
            return emailLog;
        } else {
            const info = await transporter.sendMail(mailOptions);
            if (emailLog) {
                emailLog.status = 'SENT';
                emailLog.providerMessageId = info.messageId;
                await emailLog.save();
            }
            console.log(`✉️ Email "${type}" successfully delivered to ${recipientEmail} (ID: ${info.messageId})`);
            return emailLog;
        }
    } catch (sendErr) {
        console.error(`❌ Email dispatch to ${recipientEmail} failed:`, sendErr.message);
        if (emailLog) {
            emailLog.status = 'FAILED';
            emailLog.failureReason = sendErr.message;
            await emailLog.save();
        }
        // Failure must NEVER crash or fail the main business operation, return log record
        return emailLog;
    }
};

/**
 * Sends Email Verification Link to newly registered or unverified user
 */
export const sendVerificationEmail = async (email, name, verificationUrl) => {
    return sendTransactionalEmail({
        recipientEmail: email,
        type: 'verification',
        subject: 'Verify Your Email Address - GigCampus',
        templateName: 'verification',
        replacements: {
            username: name,
            actionUrl: verificationUrl
        },
        isSecurityEmail: true
    });
};

/**
 * Sends welcome email to verified users
 */
export const sendWelcomeEmail = async (email, name) => {
    return sendTransactionalEmail({
        recipientEmail: email,
        type: 'welcome',
        subject: 'Welcome to GigCampus! 🚀',
        templateName: 'welcome',
        replacements: {
            username: name,
            actionUrl: getFrontendUrl()
        },
        preferenceKey: 'emailNotifications'
    });
};

/**
 * Sends Password Reset Link to user
 */
export const sendPasswordResetEmail = async (email, name, resetUrl) => {
    return sendTransactionalEmail({
        recipientEmail: email,
        type: 'passwordReset',
        subject: 'Reset Your Password - GigCampus',
        templateName: 'passwordReset',
        replacements: {
            username: name,
            actionUrl: resetUrl
        },
        isSecurityEmail: true
    });
};

/**
 * Sends security alert email to user
 */
export const sendSecurityAlertEmail = async (email, name, alertType, details = {}) => {
    let subject = 'Security Alert - GigCampus';
    let messageContent = '';

    if (alertType === 'NEW_DEVICE') {
        subject = 'Security Alert: New Device Login';
        messageContent = `A new login was detected on your account. Device: ${details.device || 'Unknown'}, Location: ${details.location || 'Unknown'}`;
    } else if (alertType === 'ACCOUNT_LOCKED') {
        subject = 'Security Alert: Account Temporarily Locked';
        messageContent = `Your account has been locked due to too many failed login attempts. It will unlock automatically in 15 minutes.`;
    } else if (alertType === 'PASSWORD_CHANGED') {
        subject = 'Security Alert: Password Changed';
        messageContent = `The password for your GigCampus account was recently changed. If you did not make this change, contact support immediately.`;
    }

    // Reuse verification wrapper for text presentation
    return sendTransactionalEmail({
        recipientEmail: email,
        type: `security-${alertType.toLowerCase()}`,
        subject,
        templateName: 'verification',
        replacements: {
            username: name,
            actionUrl: getFrontendUrl(),
            messageContent
        },
        isSecurityEmail: true
    });
};

/**
 * Sends New Bid Received notification to project owner
 */
export const sendNewBidEmail = async ({
    studentEmail,
    studentName,
    projectTitle,
    freelancerName,
    bidAmount,
    deliveryDays,
    proposalMessage,
    projectId,
    requestId
}) => {
    return sendTransactionalEmail({
        recipientEmail: studentEmail,
        type: 'newBid',
        subject: 'New Proposal Received - GigCampus',
        templateName: 'newBid',
        replacements: {
            username: studentName,
            projectTitle,
            freelancerName,
            bidAmount,
            deliveryDays,
            proposalMessage,
            actionUrl: `${getFrontendUrl()}/projects/${projectId}`
        },
        preferenceKey: 'bidEmails',
        requestId
    });
};

// Aliasing the bid received email for backwards compatibility with the controllers
export const sendNewBidReceivedEmail = sendNewBidEmail;

/**
 * Sends Bid Accepted notification to freelancer
 */
export const sendBidAcceptedEmail = async ({
    freelancerEmail,
    freelancerName,
    projectTitle,
    bidAmount,
    studentName,
    projectId,
    requestId
}) => {
    return sendTransactionalEmail({
        recipientEmail: freelancerEmail,
        type: 'bidAccepted',
        subject: 'Bid Proposal Accepted! 🎉 - GigCampus',
        templateName: 'bidAccepted',
        replacements: {
            username: freelancerName,
            projectTitle,
            bidAmount,
            studentName,
            actionUrl: `${getFrontendUrl()}/projects/${projectId}`
        },
        preferenceKey: 'bidEmails',
        requestId
    });
};

/**
 * Sends Bid Rejected notification to other freelancers
 */
export const sendBidRejectedEmail = async ({
    freelancerEmail,
    freelancerName,
    projectTitle,
    bidAmount,
    projectId,
    requestId
}) => {
    return sendTransactionalEmail({
        recipientEmail: freelancerEmail,
        type: 'bidRejected',
        subject: 'Project Proposal Update - GigCampus',
        templateName: 'bidRejected',
        replacements: {
            username: freelancerName,
            projectTitle,
            actionUrl: `${getFrontendUrl()}/projects`
        },
        preferenceKey: 'bidEmails',
        requestId
    });
};

/**
 * Sends New Message notification
 */
export const sendNewMessageEmail = async ({
    recipientEmail,
    recipientName,
    senderName,
    projectTitle,
    messageContent,
    projectId,
    requestId
}) => {
    return sendTransactionalEmail({
        recipientEmail,
        type: 'newMessage',
        subject: `New Message from @${senderName} - GigCampus`,
        templateName: 'newMessage',
        replacements: {
            username: recipientName,
            senderName,
            projectTitle,
            messageContent,
            actionUrl: `${getFrontendUrl()}/messages?project=${projectId}`
        },
        preferenceKey: 'messageEmails',
        requestId
    });
};

/**
 * Sends Payment Successful notification to client
 */
export const sendPaymentSuccessEmail = async ({
    recipientEmail,
    recipientName,
    amount,
    transactionId,
    paymentType,
    description,
    requestId
}) => {
    return sendTransactionalEmail({
        recipientEmail,
        type: 'paymentSuccess',
        subject: 'Payment Successful! 💰 - GigCampus',
        templateName: 'paymentSuccess',
        replacements: {
            username: recipientName,
            amount,
            transactionId,
            paymentType,
            description,
            actionUrl: `${getFrontendUrl()}/profile`
        },
        preferenceKey: 'paymentEmails',
        requestId
    });
};

// Aliasing the payment success for backwards compatibility with the controllers
export const sendPaymentReceipt = sendPaymentSuccessEmail;

/**
 * Sends Payment Failed notification to client
 */
export const sendPaymentFailedEmail = async ({
    recipientEmail,
    recipientName,
    amount,
    orderId,
    failureReason,
    requestId
}) => {
    return sendTransactionalEmail({
        recipientEmail,
        type: 'paymentFailed',
        subject: 'Payment Failed - GigCampus',
        templateName: 'paymentFailed',
        replacements: {
            username: recipientName,
            amount,
            orderId,
            failureReason,
            actionUrl: `${getFrontendUrl()}/profile`
        },
        preferenceKey: 'paymentEmails',
        requestId
    });
};

/**
 * Sends Project Completed notification to both parties
 */
export const sendProjectCompletedEmail = async ({
    recipientEmail,
    recipientName,
    projectTitle,
    partnerName,
    amount,
    projectId,
    requestId
}) => {
    return sendTransactionalEmail({
        recipientEmail,
        type: 'projectCompleted',
        subject: 'Project Completed! 🏆 - GigCampus',
        templateName: 'projectCompleted',
        replacements: {
            username: recipientName,
            projectTitle,
            partnerName,
            amount,
            actionUrl: `${getFrontendUrl()}/projects/${projectId}`
        },
        preferenceKey: 'projectEmails',
        requestId
    });
};

/**
 * Sends Payout Status / Wallet release notification to freelancer
 */
export const sendPayoutStatusEmail = async ({
    recipientEmail,
    recipientName,
    amount,
    fee,
    netAmount,
    transactionId,
    projectTitle,
    requestId
}) => {
    return sendTransactionalEmail({
        recipientEmail,
        type: 'payoutStatus',
        subject: 'Payout Processed 💰 - GigCampus',
        templateName: 'payoutStatus',
        replacements: {
            username: recipientName,
            amount,
            fee,
            netAmount,
            transactionId,
            projectTitle,
            actionUrl: `${getFrontendUrl()}/profile`
        },
        preferenceKey: 'paymentEmails',
        requestId
    });
};

/**
 * Sends Review Received notification to user
 */
export const sendReviewReceivedEmail = async ({
    recipientEmail,
    recipientName,
    reviewerName,
    projectTitle,
    rating,
    reviewContent,
    projectId,
    requestId
}) => {
    return sendTransactionalEmail({
        recipientEmail,
        type: 'reviewReceived',
        subject: 'New Review Received! ★ - GigCampus',
        templateName: 'reviewReceived',
        replacements: {
            username: recipientName,
            reviewerName,
            projectTitle,
            ratingStars: '★'.repeat(rating) + '☆'.repeat(5 - rating),
            reviewContent,
            actionUrl: `${getFrontendUrl()}/profile`
        },
        preferenceKey: 'reviewEmails',
        requestId
    });
};

export default {
    sendTransactionalEmail,
    sendVerificationEmail,
    sendWelcomeEmail,
    sendPasswordResetEmail,
    sendSecurityAlertEmail,
    sendNewBidEmail,
    sendNewBidReceivedEmail,
    sendBidAcceptedEmail,
    sendBidRejectedEmail,
    sendNewMessageEmail,
    sendPaymentSuccessEmail,
    sendPaymentReceipt,
    sendPaymentFailedEmail,
    sendProjectCompletedEmail,
    sendPayoutStatusEmail,
    sendReviewReceivedEmail
};
