const requestCounts = new Map();

// Periodic cleanup of expired IP rate-limit records every 10 minutes
setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of requestCounts.entries()) {
        if (now > record.resetTime) {
            requestCounts.delete(ip);
        }
    }
}, 10 * 60 * 1000);

/**
 * Zero-dependency in-memory rate limiter middleware for production stability
 * @param {number} windowMs - Time window in milliseconds
 * @param {number} maxRequests - Maximum allowed requests per IP in the window
 * @param {string} message - Error message when rate limit is exceeded
 */
export const createRateLimiter = (
    windowMs = 15 * 60 * 1000,
    maxRequests = 100,
    message = 'Too many requests from this IP. Please try again after 15 minutes.'
) => {
    return (req, res, next) => {
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
        const now = Date.now();

        if (!requestCounts.has(ip)) {
            requestCounts.set(ip, { count: 1, resetTime: now + windowMs });
            return next();
        }

        const record = requestCounts.get(ip);

        if (now > record.resetTime) {
            record.count = 1;
            record.resetTime = now + windowMs;
            return next();
        }

        record.count += 1;

        if (record.count > maxRequests) {
            return res.status(429).json({
                success: false,
                message
            });
        }

        return next();
    };
};
