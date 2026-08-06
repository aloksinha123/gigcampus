import nodemailer from 'nodemailer';

/**
 * Creates Nodemailer Transporter instance reading credentials from EMAIL_USER & EMAIL_PASS
 */
const createTransporter = () => {
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: emailUser,
            pass: emailPass
        }
    });

    return transporter;
};

export const transporter = createTransporter();

/**
 * Verifies SMTP connection credentials during server startup
 */
export const verifyEmailConnection = async () => {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS || process.env.EMAIL_USER === 'yourgmail@gmail.com') {
        console.warn('⚠️ Email Service Warning: EMAIL_USER or EMAIL_PASS is not configured in .env. Configure valid Gmail App Password credentials to send live emails.');
        return false;
    }

    try {
        await transporter.verify();
        console.log('✉️ Email service connected.');
        return true;
    } catch (error) {
        console.warn('⚠️ Email Service Connection Warning:', error.message);
        return false;
    }
};

export default transporter;
