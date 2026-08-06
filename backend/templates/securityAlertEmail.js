/**
 * HTML Email Templates Generator for Security Alerts
 */

export const generateNewDeviceEmail = (name, { browser, operatingSystem, ipAddress, date }) => {
    return {
        subject: 'Security Alert: New Login Detected on GigCampus 🔔',
        text: `Hi ${name},\n\nA new login was detected on your GigCampus account:\n\nBrowser: ${browser}\nOS: ${operatingSystem}\nIP Address: ${ipAddress}\nTime: ${date}\n\nIf this was you, no action is needed. If you did not initiate this login, please secure your account immediately by changing your password.`,
        html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 30px;">
            <div style="max-width: 550px; margin: 0 auto; background: #fff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 30px;">
                <h2 style="color: #1e293b; margin-top: 0;">🔔 New Login Detected</h2>
                <p style="color: #475569;">Hi <strong>${name}</strong>, your account was accessed from a new device or browser:</p>
                <div style="background: #f1f5f9; padding: 16px; border-radius: 8px; font-size: 14px; color: #334155; margin: 20px 0;">
                    <p style="margin: 4px 0;"><strong>Browser:</strong> ${browser}</p>
                    <p style="margin: 4px 0;"><strong>Operating System:</strong> ${operatingSystem}</p>
                    <p style="margin: 4px 0;"><strong>IP Address:</strong> ${ipAddress}</p>
                    <p style="margin: 4px 0;"><strong>Time:</strong> ${date}</p>
                </div>
                <p style="color: #64748b; font-size: 13px;">If this was you, you can safely ignore this email. If not, please change your password immediately.</p>
            </div>
        </body>
        </html>
        `
    };
};

export const generateAccountLockedEmail = (name, { lockTimeMinutes = 15 }) => {
    return {
        subject: 'Security Alert: Account Temporarily Locked 🔒',
        text: `Hi ${name},\n\nYour GigCampus account has been temporarily locked for ${lockTimeMinutes} minutes due to 5 consecutive failed login attempts.\n\nIf you did not attempt to log in, someone may be attempting to access your account.`,
        html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 30px;">
            <div style="max-width: 550px; margin: 0 auto; background: #fff; border-radius: 12px; border: 1px solid #fecaca; padding: 30px;">
                <h2 style="color: #991b1b; margin-top: 0;">🔒 Account Temporarily Locked</h2>
                <p style="color: #475569;">Hi <strong>${name}</strong>, your account has been locked for <strong>${lockTimeMinutes} minutes</strong> following 5 failed login attempts.</p>
                <p style="color: #64748b; font-size: 13px;">Your account will automatically unlock after 15 minutes, or you can contact support if you need assistance.</p>
            </div>
        </body>
        </html>
        `
    };
};

export const generatePasswordChangedEmail = (name) => {
    return {
        subject: 'Security Notice: Your Password Has Been Updated 🔑',
        text: `Hi ${name},\n\nYour GigCampus account password was successfully updated.\n\nIf you did not perform this change, please contact GigCampus support immediately.`,
        html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 30px;">
            <div style="max-width: 550px; margin: 0 auto; background: #fff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 30px;">
                <h2 style="color: #1e293b; margin-top: 0;">🔑 Password Updated</h2>
                <p style="color: #475569;">Hi <strong>${name}</strong>, your account password was successfully updated.</p>
                <p style="color: #64748b; font-size: 13px;">If you performed this change, no action is required.</p>
            </div>
        </body>
        </html>
        `
    };
};
