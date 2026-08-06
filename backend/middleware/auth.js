import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.js';
import Session from '../models/Session.js';
import { parseUserAgent } from '../utils/uaParser.js';

export const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Get token from header
            token = req.headers.authorization.split(' ')[1];

            if (!token || token === 'undefined' || token === 'null' || !token.trim()) {
                return res.status(401).json({ message: 'Not authorized, token is missing or empty' });
            }

            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Get user from token
            req.user = await User.findById(decoded.id).select('-password');

            if (!req.user) {
                return res.status(401).json({ message: 'User not found' });
            }

            if (!req.user.isActive) {
                return res.status(401).json({ message: 'Account is deactivated' });
            }

            // Multi-device Session Check
            if (decoded.tokenId) {
                const session = await Session.findOne({ tokenId: decoded.tokenId, isActive: true });

                if (!session) {
                    return res.status(401).json({ message: 'Session expired or terminated. Please log in again.' });
                }

                // Update lastActivity timestamp asynchronously (non-blocking)
                Session.updateOne({ _id: session._id }, { lastActivity: new Date() }).exec().catch(() => {});

                req.session = session;
            } else {
                // Legacy token migration: check or auto-provision active session for existing user
                let session = await Session.findOne({ user: req.user._id, isActive: true });
                if (!session) {
                    const tokenId = crypto.randomUUID();
                    const userAgentStr = req.headers['user-agent'] || '';
                    const { browser, operatingSystem, deviceName } = parseUserAgent(userAgentStr);
                    const rawIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || req.socket?.remoteAddress || '127.0.0.1';
                    const ipAddress = rawIp === '::1' ? '127.0.0.1' : rawIp;

                    session = await Session.create({
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
                }
                req.session = session;
            }

            return next();
        } catch (error) {
            console.error('JWT Error in protect middleware:', error.message);
            return res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }
};

// Admin middleware
export const admin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: 'Not authorized as admin' });
    }
};

// Freelancer middleware
export const freelancer = (req, res, next) => {
    if (req.user && (req.user.role === 'freelancer' || req.user.role === 'admin')) {
        next();
    } else {
        res.status(403).json({ message: 'Not authorized as freelancer' });
    }
};

// Student/Client middleware
export const student = (req, res, next) => {
    if (req.user && (req.user.role === 'student' || req.user.role === 'admin')) {
        next();
    } else {
        res.status(403).json({ message: 'Not authorized as student' });
    }
};
