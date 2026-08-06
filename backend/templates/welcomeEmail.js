/**
 * Exports generateWelcomeEmail(name) returning a responsive HTML welcome email
 * @param {string} name - Personalized username / name
 * @returns {Object} Template object containing subject, text, and html
 */
export const generateWelcomeEmail = (name) => {
    const appTitle = 'GigCampus';
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const currentYear = new Date().getFullYear();

    return {
        subject: `Welcome to ${appTitle}! 🚀`,
        text: `Welcome to ${appTitle}, ${name}! Thank you for joining our student freelance community. Explore projects at ${clientUrl}`,
        html: `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Welcome to ${appTitle}</title>
            </head>
            <body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; -webkit-font-smoothing: antialiased;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f8fafc; padding: 40px 0;">
                    <tr>
                        <td align="center">
                            <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; max-width: 600px; width: 100%;">
                                <!-- Header -->
                                <tr>
                                    <td style="background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%); padding: 40px 30px; text-align: center; color: #ffffff;">
                                        <h1 style="margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.5px; color: #ffffff;">🚀 ${appTitle}</h1>
                                        <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9; color: #e0e7ff;">Student Freelance & Project Hub</p>
                                    </td>
                                </tr>
                                <!-- Body Content -->
                                <tr>
                                    <td style="padding: 40px 30px; color: #334155; line-height: 1.7; font-size: 16px;">
                                        <h2 style="color: #1e293b; margin-top: 0; font-size: 22px; font-weight: 700;">Welcome, ${name}! 👋</h2>
                                        <p style="margin-bottom: 20px; color: #475569;">We are thrilled to welcome you to <strong>${appTitle}</strong>. You are now part of an active community of students, creators, and freelancers collaborating on high-value projects.</p>
                                        <p style="margin-bottom: 30px; color: #475569;">Explore open projects in the marketplace, build your portfolio, and manage your secure wallet all in one place.</p>
                                        <!-- CTA Button -->
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 30px auto;">
                                            <tr>
                                                <td align="center" style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); border-radius: 10px; box-shadow: 0 4px 14px rgba(99,102,241,0.35);">
                                                    <a href="${clientUrl}" target="_blank" style="display: inline-block; padding: 14px 32px; color: #ffffff !important; text-decoration: none; font-weight: 700; font-size: 15px; border-radius: 10px;">Explore ${appTitle}</a>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                                <!-- Footer -->
                                <tr>
                                    <td style="background-color: #f8fafc; padding: 25px 30px; text-align: center; color: #94a3b8; font-size: 13px; border-top: 1px solid #f1f5f9;">
                                        <p style="margin: 0;">&copy; ${currentYear} ${appTitle} Hub. All rights reserved.</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
        `
    };
};

export default generateWelcomeEmail;
