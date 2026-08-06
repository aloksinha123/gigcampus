import emailService from '../services/emailService.js';

// Email regex pattern for format validation
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// @desc    Send test welcome email
// @route   POST /api/email/test
// @access  Public
export const sendTestEmail = async (req, res) => {
    try {
        const { email, name } = req.body;

        // Step 7 Validation: Missing email
        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email address is required.'
            });
        }

        // Step 7 Validation: Missing name
        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Name is required.'
            });
        }

        // Step 7 Validation: Invalid email format
        if (typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid email address.'
            });
        }

        // Step 9 Architecture: Controller -> Service (sendWelcomeEmail) -> Template -> SMTP
        await emailService.sendWelcomeEmail(email.trim(), name.trim());

        return res.status(200).json({
            success: true,
            message: 'Welcome email sent successfully.'
        });
    } catch (error) {
        // Step 8: Error Handling (Log detailed backend error without exposing SMTP credentials)
        console.error('SMTP Error in sendTestEmail:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to send email. Please check server email configuration.'
        });
    }
};

export default {
    sendTestEmail
};
