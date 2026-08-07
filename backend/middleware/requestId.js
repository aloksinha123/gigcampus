import crypto from 'crypto';

/**
 * Middleware: Request ID generator & Response Time calculator
 * Generates a unique UUID for every request, sets X-Request-ID & X-Response-Time headers,
 * and logs structured request details upon completion.
 */
export const requestIdMiddleware = (req, res, next) => {
    const startMs = Date.now();
    const requestId = req.headers['x-request-id'] || crypto.randomUUID();

    req.requestId = requestId;
    res.setHeader('X-Request-ID', requestId);

    // Capture response finish to measure duration and log structured request details
    res.on('finish', () => {
        const durationMs = Date.now() - startMs;
        res.setHeader('X-Response-Time', `${durationMs}ms`);

        const rawIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || req.socket?.remoteAddress || '127.0.0.1';
        const clientIp = rawIp === '::1' ? '127.0.0.1' : rawIp;
        const userId = req.user?._id ? req.user._id.toString() : 'Unauthenticated';
        const timestamp = new Date().toISOString();
        const route = req.originalUrl || req.url;

        // Print structured request log
        console.log(`
[REQUEST]
Request ID: ${requestId}
Method: ${req.method}
Route: ${route}
User: ${userId}
IP: ${clientIp}
Timestamp: ${timestamp}
Duration: ${durationMs}ms
Status Code: ${res.statusCode}
`);
    });

    next();
};

export default requestIdMiddleware;
