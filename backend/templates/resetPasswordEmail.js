/**
 * HTML Email Template Generator for Password Reset
 */
export const generateResetPasswordEmail = (name, resetUrl) => {
    return {
        subject: 'Reset your GigCampus password 🔒',
        text: `Hi ${name},\n\nYou requested to reset your password. Click the link below to set a new password:\n${resetUrl}\n\nThis link is valid for 15 minutes.\n\nIf you did not request a password reset, please ignore this email.\n\nBest regards,\nThe GigCampus Team`,
        html: `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Reset Your Password</title>
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; margin: 0; padding: 40px 20px;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
                
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 32px 40px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 800;">GigCampus</h1>
                    <p style="color: #94a3b8; margin: 8px 0 0 0; font-size: 14px;">Password Reset Request</p>
                </div>

                <!-- Content -->
                <div style="padding: 40px;">
                    <h2 style="color: #0f172a; margin-top: 0; font-size: 20px; font-weight: 700;">Reset Your Password</h2>
                    <p style="color: #475569; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
                        Hi <strong>${name}</strong>, we received a request to reset your GigCampus account password. Click the button below to choose a new password:
                    </p>

                    <!-- Button -->
                    <div style="text-align: center; margin: 32px 0;">
                        <a href="${resetUrl}" target="_blank" style="background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%); color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 9999px; font-weight: 700; font-size: 15px; display: inline-block; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);">
                            Reset Password
                        </a>
                    </div>

                    <!-- Alternate Link -->
                    <p style="color: #64748b; font-size: 13px; line-height: 1.5; margin-top: 32px;">
                        If the button above doesn't work, copy and paste this URL into your web browser:
                    </p>
                    <p style="background-color: #f1f5f9; padding: 12px; border-radius: 8px; font-size: 12px; color: #334155; word-break: break-all; margin-bottom: 24px;">
                        ${resetUrl}
                    </p>

                    <p style="color: #94a3b8; font-size: 12px; margin-bottom: 0;">
                        ⏰ <strong>Security Notice:</strong> This link is valid for <strong>15 minutes only</strong> and can be used only once. If you did not ask to reset your password, you can safely ignore this email — your password will remain unchanged.
                    </p>
                </div>

                <!-- Footer -->
                <div style="background-color: #f8fafc; padding: 20px 40px; border-top: 1px solid #e2e8f0; text-align: center;">
                    <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                        © ${new Date().getFullYear()} GigCampus Inc. All rights reserved.
                    </p>
                </div>

            </div>
        </body>
        </html>
        `
    };
};
