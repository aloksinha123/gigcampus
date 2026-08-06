/**
 * HTML Email Template Generator for Email Verification
 */
export const generateVerificationEmail = (name, verificationUrl) => {
    return {
        subject: 'Verify your GigCampus account ✉️',
        text: `Hi ${name},\n\nPlease verify your email address to complete your GigCampus registration:\n${verificationUrl}\n\nThis link will expire in 24 hours.\n\nBest regards,\nThe GigCampus Team`,
        html: `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Verify Your GigCampus Account</title>
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; margin: 0; padding: 40px 20px;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
                
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%); padding: 32px 40px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 800; tracking: -0.5px;">GigCampus</h1>
                    <p style="color: #e0e7ff; margin: 8px 0 0 0; font-size: 14px; font-weight: 500;">Campus Freelancing & Milestone Platform</p>
                </div>

                <!-- Content -->
                <div style="padding: 40px;">
                    <h2 style="color: #0f172a; margin-top: 0; font-size: 20px; font-weight: 700;">Action Required: Verify Your Email</h2>
                    <p style="color: #475569; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
                        Hi <strong>${name}</strong>, welcome to GigCampus! Please confirm your email address to activate your account and start posting projects or submitting proposals.
                    </p>

                    <!-- Button -->
                    <div style="text-align: center; margin: 32px 0;">
                        <a href="${verificationUrl}" target="_blank" style="background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%); color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 9999px; font-weight: 700; font-size: 15px; display: inline-block; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);">
                            Verify Email Address
                        </a>
                    </div>

                    <!-- Alternate Link -->
                    <p style="color: #64748b; font-size: 13px; line-height: 1.5; margin-top: 32px;">
                        If the button above doesn't work, copy and paste this link into your browser:
                    </p>
                    <p style="background-color: #f1f5f9; padding: 12px; border-radius: 8px; font-size: 12px; color: #334155; word-break: break-all; margin-bottom: 24px;">
                        ${verificationUrl}
                    </p>

                    <p style="color: #94a3b8; font-size: 12px; margin-bottom: 0;">
                        ⏳ Note: This link will expire in 24 hours. If you did not create an account on GigCampus, you can safely ignore this email.
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
