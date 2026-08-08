import rateLimit from 'express-rate-limit';
import { rateLimitConfig } from '../config/rateLimitConfig.js';

/**
 * Standard log & JSON response handler when rate limit is exceeded
 */
const createLimitHandler = (customMessage) => {
    return (req, res, next, options) => {
        const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || req.socket?.remoteAddress || '127.0.0.1';
        const userId = req.user?._id ? req.user._id.toString() : 'Unauthenticated';
        const timestamp = new Date().toISOString();
        const route = req.originalUrl || req.url;

        // Logging limit breach for security audit
        console.warn(`⚠️ [RATE LIMIT EXCEEDED] Timestamp: ${timestamp} | IP: ${clientIp} | User: ${userId} | Route: ${route}`);

        // Asynchronously record fraud signals to avoid circular dependencies
        const userIdVal = req.user?._id || null;
        let signalType = null;
        if (route.includes('/auth/')) {
            signalType = 'LOGIN_RATE_LIMIT';
        } else if (route.includes('/ai/')) {
            signalType = 'AI_ABUSE';
        }

        if (signalType) {
            import('../services/fraudDetectionService.js').then(({ recordFraudSignal }) => {
                recordFraudSignal(userIdVal, signalType, req, { route });
            }).catch(err => console.error('Failed to log rate limit fraud signal:', err.message));
        }

        res.status(429).json({
            success: false,
            message: customMessage || options.message || 'Too many requests. Please try again later.'
        });
    };
};

/**
 * Key generator for user-bound rate limiting (falls back to IP if unauthenticated)
 */
const userKeyGenerator = (req) => {
    if (req.user && req.user._id) {
        return req.user._id.toString();
    }
    const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || req.socket?.remoteAddress || '127.0.0.1';
    return clientIp;
};

// 1. Auth Limiter (5 req / 15 min per IP)
export const authLimiter = rateLimit({
    windowMs: rateLimitConfig.auth.windowMs,
    max: rateLimitConfig.auth.max,
    standardHeaders: true,
    legacyHeaders: true,
    handler: createLimitHandler(rateLimitConfig.auth.message)
});

// 2. AI Limiter (20 req / hour per user)
export const aiLimiter = rateLimit({
    windowMs: rateLimitConfig.ai.windowMs,
    max: rateLimitConfig.ai.max,
    keyGenerator: userKeyGenerator,
    standardHeaders: true,
    legacyHeaders: true,
    handler: createLimitHandler(rateLimitConfig.ai.message)
});

// 3. Payment Limiter (30 req / hour per user)
export const paymentLimiter = rateLimit({
    windowMs: rateLimitConfig.payments.windowMs,
    max: rateLimitConfig.payments.max,
    keyGenerator: userKeyGenerator,
    standardHeaders: true,
    legacyHeaders: true,
    handler: createLimitHandler(rateLimitConfig.payments.message)
});

// 4. Upload Limiter (20 uploads / hour per user)
export const uploadLimiter = rateLimit({
    windowMs: rateLimitConfig.uploads.windowMs,
    max: rateLimitConfig.uploads.max,
    keyGenerator: userKeyGenerator,
    standardHeaders: true,
    legacyHeaders: true,
    handler: createLimitHandler(rateLimitConfig.uploads.message)
});

// 5. General API Limiter (300 req / 15 min per IP)
export const generalLimiter = rateLimit({
    windowMs: rateLimitConfig.general.windowMs,
    max: rateLimitConfig.general.max,
    standardHeaders: true,
    legacyHeaders: true,
    handler: createLimitHandler(rateLimitConfig.general.message)
});
