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
    
    // Set Request ID header before response is sent
    res.setHeader('X-Request-ID', requestId);

    // Hook writeHead to safely set X-Response-Time BEFORE headers are sent
    const originalWriteHead = res.writeHead;
    res.writeHead = function (...args) {
        const durationMs = Date.now() - startMs;
        if (!res.headersSent) {
            res.setHeader('X-Response-Time', `${durationMs}ms`);
        }
        return originalWriteHead.apply(this, args);
    };

    // Log structured request info upon finish
    res.on('finish', () => {
        const durationMs = Date.now() - startMs;
        const rawIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || req.socket?.remoteAddress || '127.0.0.1';
        const clientIp = rawIp === '::1' ? '127.0.0.1' : rawIp;
        const userId = req.user?._id ? req.user._id.toString() : 'Unauthenticated';
        const timestamp = new Date().toISOString();
        const route = req.originalUrl || req.url;

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
