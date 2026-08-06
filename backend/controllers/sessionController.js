import Session from '../models/Session.js';
import crypto from 'crypto';
import { parseUserAgent } from '../utils/uaParser.js';

// @desc    Get all active sessions for current user
// @route   GET /api/auth/sessions
// @access  Private
export const getSessions = async (req, res) => {
    try {
        let sessions = await Session.find({ user: req.user._id, isActive: true })
            .sort({ lastActivity: -1 });

        // Auto-provision session for legacy active tokens if no active session exists
        if (sessions.length === 0) {
            const tokenId = req.session?.tokenId || crypto.randomUUID();
            const userAgentStr = req.headers['user-agent'] || '';
            const { browser, operatingSystem, deviceName } = parseUserAgent(userAgentStr);
            const rawIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || req.socket?.remoteAddress || '127.0.0.1';
            const ipAddress = rawIp === '::1' ? '127.0.0.1' : rawIp;

            const newSession = await Session.create({
                user: req.user._id,
                tokenId,
                deviceName,
                browser,
                operatingSystem,
                ipAddress,
                userAgent: userAgentStr,
                isActive: true,
                lastActivity: new Date()
            });

            sessions = [newSession];
            req.session = newSession;
        }

        const currentTokenId = req.session?.tokenId;

        const formattedSessions = sessions.map(session => ({
            _id: session._id,
            tokenId: session.tokenId,
            deviceName: session.deviceName,
            browser: session.browser,
            operatingSystem: session.operatingSystem,
            ipAddress: session.ipAddress,
            country: session.country,
            city: session.city,
            userAgent: session.userAgent,
            isActive: session.isActive,
            lastActivity: session.lastActivity,
            createdAt: session.createdAt,
            isCurrentSession: currentTokenId ? session.tokenId === currentTokenId : true
        }));

        res.json(formattedSessions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Terminate a specific session
// @route   DELETE /api/auth/sessions/:sessionId
// @access  Private
export const terminateSession = async (req, res) => {
    try {
        const { sessionId } = req.params;

        const session = await Session.findById(sessionId);

        if (!session) {
            return res.status(404).json({ message: 'Session not found' });
        }

        // Security check: Ensure user owns this session
        if (session.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Unauthorized to terminate this session' });
        }

        session.isActive = false;
        await session.save();

        res.json({ message: 'Session terminated successfully.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Terminate all other sessions except current session
// @route   DELETE /api/auth/sessions
// @access  Private
export const terminateAllOtherSessions = async (req, res) => {
    try {
        const currentTokenId = req.session?.tokenId;

        const query = { user: req.user._id, isActive: true };
        if (currentTokenId) {
            query.tokenId = { $ne: currentTokenId };
        }

        await Session.updateMany(query, { isActive: false });

        res.json({ message: 'All other active sessions logged out successfully.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
