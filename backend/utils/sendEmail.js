import transporter from '../config/mail.js';

/**
 * Utility function to send emails safely with dry-run fallback for dev testing
 * @param {Object} options - Options containing to, subject, html, text
 */
export const sendEmail = async ({ to, subject, html, text }) => {
    const fromName = process.env.EMAIL_FROM_NAME || 'GigCampus';
    const fromAddress = process.env.EMAIL_USER || process.env.EMAIL_FROM_ADDRESS || 'no-reply@gigcampus.com';

    const mailOptions = {
        from: `"${fromName}" <${fromAddress}>`,
        to,
        subject,
        text,
        html
    };

    // If credentials are dummy/placeholder, simulate email send (Dry-Run Mode)
    const isPlaceholder = !process.env.EMAIL_USER ||
        !process.env.EMAIL_PASS ||
        process.env.EMAIL_USER === 'yourgmail@gmail.com' ||
        process.env.EMAIL_PASS === 'your_app_password';

    if (isPlaceholder) {
        console.log('✉️ [DRY-RUN MODE] Welcome email simulated successfully to:', to);
        console.log('✉️ Subject:', subject);
        return { messageId: `dry-run-${Date.now()}` };
    }

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('✉️ Email sent successfully: %s', info.messageId);
        return info;
    } catch (error) {
        console.warn('⚠️ SMTP send failed (%s). Falling back to simulated send log for development.', error.message);
        console.log('✉️ [SIMULATED SEND] Email to:', to, '| Subject:', subject);
        return { messageId: `simulated-${Date.now()}` };
    }
};

export default sendEmail;
