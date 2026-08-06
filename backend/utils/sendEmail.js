import transporter from '../config/mail.js';

/**
 * Utility function to send emails
 * @param {Object} options - Options containing to, subject, html, text
 */
export const sendEmail = async ({ to, subject, html, text }) => {
    const fromName = process.env.EMAIL_FROM_NAME || 'GigCampus';
    const fromAddress = process.env.EMAIL_USER || process.env.EMAIL_FROM_ADDRESS || process.env.SMTP_USER || 'no-reply@gigcampus.com';

    const mailOptions = {
        from: `"${fromName}" <${fromAddress}>`,
        to,
        subject,
        text,
        html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✉️ Email sent successfully: %s', info.messageId);
    return info;
};

export default sendEmail;
