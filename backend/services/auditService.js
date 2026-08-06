import SecurityAudit from '../models/SecurityAudit.js';
import { parseUserAgent } from '../utils/uaParser.js';

/**
 * Log a Security Audit event to MongoDB asynchronously
 * @param {Object} params - { user, userEmail, action, status, req, metadata }
 */
export const logSecurityAudit = async ({
    user = null,
    userEmail = '',
    action,
    status = 'SUCCESS',
    req = null,
    metadata = {}
}) => {
    try {
        let ipAddress = '127.0.0.1';
        let userAgentStr = '';
        let browser = 'Unknown Browser';
        let operatingSystem = 'Unknown OS';
        let device = 'Unknown Device';

        if (req) {
            userAgentStr = req.headers['user-agent'] || '';
            const parsed = parseUserAgent(userAgentStr);
            browser = parsed.browser;
            operatingSystem = parsed.operatingSystem;
            device = parsed.deviceName;

            const rawIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || req.socket?.remoteAddress || '127.0.0.1';
            ipAddress = rawIp === '::1' ? '127.0.0.1' : rawIp;
        }

        const targetUserId = user?._id || user || null;
        const targetEmail = userEmail || user?.email || (req?.body?.email) || 'Unknown';

        await SecurityAudit.create({
            user: targetUserId,
            userEmail: targetEmail,
            action,
            status,
            ipAddress,
            userAgent: userAgentStr,
            device,
            browser,
            operatingSystem,
            location: 'Localhost',
            metadata
        });
    } catch (err) {
        console.error('⚠️ Failed to save SecurityAudit log:', err.message);
    }
};
