import transporter from '../config/mail.js';
import { generateWelcomeEmail } from '../templates/welcomeEmail.js';

/**
 * Sends a welcome email to a new user
 * @param {string} email - Recipient email address
 * @param {string} name - Personalized name
 */
export const sendWelcomeEmail = async (email, name) => {
    const template = generateWelcomeEmail(name);

    const fromName = process.env.EMAIL_FROM_NAME || 'GigCampus';
    const fromAddress = process.env.EMAIL_USER || process.env.EMAIL_FROM_ADDRESS || 'no-reply@gigcampus.com';

    const mailOptions = {
        from: `"${fromName}" <${fromAddress}>`,
        to: email,
        subject: template.subject,
        text: template.text,
        html: template.html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✉️ Welcome email sent successfully to %s (Message ID: %s)', email, info.messageId);
    return info;
};

/**
 * Placeholder for future Bid Accepted Email notification
 */
export const sendBidAcceptedEmail = async (email, details) => {
    // Placeholder - to be implemented in future sprint
    console.log('⚙️ Placeholder: sendBidAcceptedEmail called for', email);
    return { success: true, placeholder: true };
};

/**
 * Placeholder for future Payment Receipt Email notification
 */
export const sendPaymentReceipt = async (email, details) => {
    // Placeholder - to be implemented in future sprint
    console.log('⚙️ Placeholder: sendPaymentReceipt called for', email);
    return { success: true, placeholder: true };
};

/**
 * Placeholder for future Project Completed Email notification
 */
export const sendProjectCompletedEmail = async (email, details) => {
    // Placeholder - to be implemented in future sprint
    console.log('⚙️ Placeholder: sendProjectCompletedEmail called for', email);
    return { success: true, placeholder: true };
};

export default {
    sendWelcomeEmail,
    sendBidAcceptedEmail,
    sendPaymentReceipt,
    sendProjectCompletedEmail
};
