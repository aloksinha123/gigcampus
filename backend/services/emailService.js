import transporter from '../config/mail.js';
import { generateWelcomeEmail } from '../templates/welcomeEmail.js';

/**
 * Sends a REAL welcome email to a new user using Nodemailer SMTP
 * @param {string} email - Recipient email address
 * @param {string} name - Personalized name
 */
export const sendWelcomeEmail = async (email, name) => {
    // Check if EMAIL_USER or EMAIL_PASS are missing or dummy
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
    console.log('✉️ Real email delivered to %s (Message ID: %s)', email, info.messageId);
    return info;
};

/**
 * Placeholder for future Bid Accepted Email notification
 */
export const sendBidAcceptedEmail = async (email, details) => {
    console.log('⚙️ Placeholder: sendBidAcceptedEmail called for', email);
    return { success: true, placeholder: true };
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
