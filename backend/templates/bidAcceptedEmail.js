/**
 * Generates responsive HTML email template when a freelancer's bid is accepted
 * @param {Object} data - Contains freelancerName, projectTitle, bidAmount, studentName, projectId
 * @returns {Object} Object with subject, text, and html
 */
export const generateBidAcceptedEmail = ({
    freelancerName,
    projectTitle,
    bidAmount,
    studentName,
    projectId
}) => {
    const appTitle = 'GigCampus';
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const projectUrl = `${clientUrl}/projects/${projectId || ''}`;
    const currentYear = new Date().getFullYear();
    const formattedAmount = typeof bidAmount === 'number' ? `₹${bidAmount.toFixed(2)}` : `₹${bidAmount}`;

    return {
        subject: `🎉 Your bid has been accepted on ${appTitle}!`,
        text: `Congratulations ${freelancerName}! Your bid of ${formattedAmount} for "${projectTitle}" has been accepted by ${studentName}. View project details at ${projectUrl}`,
        html: `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Bid Accepted - ${appTitle}</title>
            </head>
            <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; -webkit-font-smoothing: antialiased;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f8fafc; padding: 40px 0;">
                    <tr>
                        <td align="center">
                            <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; max-width: 600px; width: 100%;">
                                <!-- Header -->
                                <tr>
                                    <td style="background: linear-gradient(135deg, #4f46e5 0%, #10b981 100%); padding: 35px 30px; text-align: center; color: #ffffff;">
                                        <h1 style="margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px; color: #ffffff;">🎉 Bid Accepted!</h1>
                                        <p style="margin: 6px 0 0 0; font-size: 14px; opacity: 0.95; color: #ecfdf5;">${appTitle} Project Hub</p>
                                    </td>
                                </tr>
                                <!-- Body Content -->
                                <tr>
                                    <td style="padding: 35px 30px; color: #334155; line-height: 1.7; font-size: 15px;">
                                        <h2 style="color: #1e293b; margin-top: 0; font-size: 20px; font-weight: 700;">Congratulations, ${freelancerName}! 🚀</h2>
                                        <p style="margin-bottom: 20px; color: #475569;">Great news! <strong>${studentName}</strong> has accepted your bid for the project <strong>"${projectTitle}"</strong>.</p>
                                        
                                        <!-- Details Card -->
                                        <div style="background-color: #f1f5f9; border-radius: 12px; padding: 20px; margin: 25px 0; border-left: 4px solid #10b981;">
                                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                                <tr>
                                                    <td style="padding: 6px 0; color: #64748b; font-size: 13px; font-weight: 600;">PROJECT TITLE:</td>
                                                    <td style="padding: 6px 0; color: #0f172a; font-size: 14px; font-weight: 700; text-align: right;">${projectTitle}</td>
                                                </tr>
                                                <tr>
                                                    <td style="padding: 6px 0; color: #64748b; font-size: 13px; font-weight: 600;">ACCEPTED BID AMOUNT:</td>
                                                    <td style="padding: 6px 0; color: #059669; font-size: 16px; font-weight: 800; text-align: right;">${formattedAmount}</td>
                                                </tr>
                                                <tr>
                                                    <td style="padding: 6px 0; color: #64748b; font-size: 13px; font-weight: 600;">CLIENT NAME:</td>
                                                    <td style="padding: 6px 0; color: #0f172a; font-size: 14px; font-weight: 700; text-align: right;">${studentName}</td>
                                                </tr>
                                                <tr>
                                                    <td style="padding: 6px 0; color: #64748b; font-size: 13px; font-weight: 600;">PROJECT STATUS:</td>
                                                    <td style="padding: 6px 0; text-align: right;">
                                                        <span style="display: inline-block; background-color: #dcfce7; color: #166534; padding: 3px 10px; border-radius: 9999px; font-size: 12px; font-weight: 700;">In Progress</span>
                                                    </td>
                                                </tr>
                                            </table>
                                        </div>

                                        <p style="margin-bottom: 25px; color: #475569;">The project funds are safely stored in <strong>Escrow</strong> and will be released to your wallet upon completion.</p>

                                        <!-- CTA Button -->
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 30px auto 10px auto;">
                                            <tr>
                                                <td align="center" style="background: linear-gradient(135deg, #4f46e5 0%, #059669 100%); border-radius: 10px; box-shadow: 0 4px 14px rgba(16,185,129,0.35);">
                                                    <a href="${projectUrl}" target="_blank" style="display: inline-block; padding: 14px 32px; color: #ffffff !important; text-decoration: none; font-weight: 700; font-size: 15px; border-radius: 10px;">View Project</a>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                                <!-- Footer -->
                                <tr>
                                    <td style="background-color: #f8fafc; padding: 20px 30px; text-align: center; color: #94a3b8; font-size: 13px; border-top: 1px solid #f1f5f9;">
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

export default generateBidAcceptedEmail;
