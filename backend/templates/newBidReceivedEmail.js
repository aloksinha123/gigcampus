/**
 * Generates responsive HTML email template when a student receives a new bid on their project
 * @param {Object} data - Contains studentName, projectTitle, freelancerName, bidAmount, deliveryDays, proposalMessage, projectId
 * @returns {Object} Object with subject, text, and html
 */
export const generateNewBidReceivedEmail = ({
    studentName,
    projectTitle,
    freelancerName,
    bidAmount,
    deliveryDays,
    proposalMessage,
    projectId
}) => {
    const appTitle = 'GigCampus';
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const projectUrl = `${clientUrl}/projects/${projectId || ''}`;
    const currentYear = new Date().getFullYear();
    const formattedAmount = typeof bidAmount === 'number' ? `₹${bidAmount.toFixed(2)}` : `₹${bidAmount}`;
    const formattedDays = deliveryDays ? `${deliveryDays} days` : 'Flexible';
    const truncatedProposal = proposalMessage && proposalMessage.length > 250 
        ? `${proposalMessage.substring(0, 250)}...` 
        : (proposalMessage || 'No proposal message provided.');

    return {
        subject: `📩 New Bid Received on ${appTitle}`,
        text: `Hello ${studentName}! ${freelancerName} has submitted a new bid of ${formattedAmount} for your project "${projectTitle}". View project details at ${projectUrl}`,
        html: `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>New Bid Received - ${appTitle}</title>
            </head>
            <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; -webkit-font-smoothing: antialiased;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f8fafc; padding: 40px 0;">
                    <tr>
                        <td align="center">
                            <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; max-width: 600px; width: 100%;">
                                <!-- Header -->
                                <tr>
                                    <td style="background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%); padding: 35px 30px; text-align: center; color: #ffffff;">
                                        <h1 style="margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px; color: #ffffff;">📩 New Bid Received!</h1>
                                        <p style="margin: 6px 0 0 0; font-size: 14px; opacity: 0.95; color: #e0e7ff;">${appTitle} Project Hub</p>
                                    </td>
                                </tr>
                                <!-- Body Content -->
                                <tr>
                                    <td style="padding: 35px 30px; color: #334155; line-height: 1.7; font-size: 15px;">
                                        <h2 style="color: #1e293b; margin-top: 0; font-size: 20px; font-weight: 700;">Hello, ${studentName}! 👋</h2>
                                        <p style="margin-bottom: 20px; color: #475569;">You have received a new bid proposal for your project <strong>"${projectTitle}"</strong>.</p>
                                        
                                        <!-- Details Card -->
                                        <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; margin: 25px 0; border: 1px solid #e2e8f0; border-left: 4px solid #6366f1;">
                                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                                <tr>
                                                    <td style="padding: 6px 0; color: #64748b; font-size: 13px; font-weight: 600;">FREELANCER:</td>
                                                    <td style="padding: 6px 0; color: #0f172a; font-size: 14px; font-weight: 700; text-align: right;">${freelancerName}</td>
                                                </tr>
                                                <tr>
                                                    <td style="padding: 6px 0; color: #64748b; font-size: 13px; font-weight: 600;">BID AMOUNT:</td>
                                                    <td style="padding: 6px 0; color: #4f46e5; font-size: 16px; font-weight: 800; text-align: right;">${formattedAmount}</td>
                                                </tr>
                                                <tr>
                                                    <td style="padding: 6px 0; color: #64748b; font-size: 13px; font-weight: 600;">ESTIMATED DELIVERY:</td>
                                                    <td style="padding: 6px 0; color: #0f172a; font-size: 14px; font-weight: 700; text-align: right;">${formattedDays}</td>
                                                </tr>
                                            </table>
                                            <div style="margin-top: 15px; padding-top: 15px; border-top: 1px dashed #cbd5e1;">
                                                <div style="color: #64748b; font-size: 12px; font-weight: 700; margin-bottom: 6px;">PROPOSAL MESSAGE:</div>
                                                <div style="color: #334155; font-size: 13.5px; font-style: italic; background-color: #ffffff; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0;">"${truncatedProposal}"</div>
                                            </div>
                                        </div>

                                        <p style="margin-bottom: 25px; color: #475569;">Log in to your account to review the full proposal, chat with the freelancer, or accept the bid.</p>

                                        <!-- CTA Button -->
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 30px auto 10px auto;">
                                            <tr>
                                                <td align="center" style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); border-radius: 10px; box-shadow: 0 4px 14px rgba(99,102,241,0.35);">
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

export default generateNewBidReceivedEmail;
