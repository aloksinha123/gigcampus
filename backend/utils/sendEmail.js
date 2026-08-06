import transporter from '../config/mail.js';

/**
 * Utility function to send real emails via Nodemailer transporter
 * @param {Object} options - Options containing to, subject, html, text
 */
export const sendEmail = async ({ to, subject, html, text }) => {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS || process.env.EMAIL_USER === 'yourgmail@gmail.com') {
        throw new Error('Email credentials missing. Please configure EMAIL_USER and EMAIL_PASS in backend/.env.');
    }

    const fromAddress = process.env.EMAIL_USER;

    const mailOptions = {
        from: `"GigCampus" <${fromAddress}>`,
        to,
        subject,
        text,
        html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✉️ Real email delivered: %s', info.messageId);
    return info;
};

export default sendEmail;
