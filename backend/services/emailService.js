import transporter from '../config/mail.js';
import { generateWelcomeEmail } from '../templates/welcomeEmail.js';
import { generateBidAcceptedEmail } from '../templates/bidAcceptedEmail.js';

/**
 * Sends a REAL welcome email to a new user using Nodemailer SMTP
 * @param {string} email - Recipient email address
 * @param {string} name - Personalized name
 */
export const sendWelcomeEmail = async (email, name) => {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS || process.env.EMAIL_USER === 'yourgmail@gmail.com' || process.env.EMAIL_PASS === 'your_app_password') {
        throw new Error('Email credentials missing. Please configure EMAIL_USER and EMAIL_PASS in backend/.env with a valid Gmail App Password.');
    }

    const template = generateWelcomeEmail(name);
    const fromAddress = process.env.EMAIL_USER;

    const mailOptions = {
        from: `"GigCampus" <${fromAddress}>`,
        to: email,
        subject: 'Welcome to GigCampus! 🚀',
        text: template.text,
        html: template.html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✉️ Real welcome email delivered to %s (Message ID: %s)', email, info.messageId);
    return info;
};

/**
 * Sends Bid Accepted HTML Email notification to Freelancer
 * @param {Object} params - Object containing freelancerEmail, freelancerName, projectTitle, bidAmount, studentName, projectId
 */
export const sendBidAcceptedEmail = async ({
    freelancerEmail,
    freelancerName,
    projectTitle,
    bidAmount,
    studentName,
    projectId
}) => {
    if (!freelancerEmail) {
        throw new Error('Freelancer email is required to send bid accepted notification.');
    }

    const template = generateBidAcceptedEmail({
        freelancerName,
        projectTitle,
        bidAmount,
        studentName,
        projectId
    });

    const fromName = process.env.EMAIL_FROM_NAME || 'GigCampus';
    const fromAddress = process.env.EMAIL_USER || process.env.EMAIL_FROM_ADDRESS || 'no-reply@gigcampus.com';

    const mailOptions = {
        from: `"${fromName}" <${fromAddress}>`,
        to: freelancerEmail,
        subject: template.subject,
        text: template.text,
        html: template.html
    };

    // If credentials missing or dummy in dev environment, log simulation safely
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS || process.env.EMAIL_USER === 'yourgmail@gmail.com' || process.env.EMAIL_PASS === 'your_app_password') {
        console.log('✉️ [SIMULATED EMAIL] Bid Accepted email for:', freelancerEmail);
        return { messageId: `simulated-bid-${Date.now()}` };
    }

    const info = await transporter.sendMail(mailOptions);
    console.log('✉️ Bid Accepted email delivered to %s (Message ID: %s)', freelancerEmail, info.messageId);
    return info;
};

/**
 * Placeholder for future Payment Receipt Email notification
 */
export const sendPaymentReceipt = async (email, details) => {
    console.log('⚙️ Placeholder: sendPaymentReceipt called for', email);
    return { success: true, placeholder: true };
};

/**
 * Placeholder for future Project Completed Email notification
 */
export const sendProjectCompletedEmail = async (email, details) => {
    console.log('⚙️ Placeholder: sendProjectCompletedEmail called for', email);
    return { success: true, placeholder: true };
};

export default {
    sendWelcomeEmail,
    sendBidAcceptedEmail,
    sendPaymentReceipt,
    sendProjectCompletedEmail
};
