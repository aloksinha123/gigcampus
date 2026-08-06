/**
 * Centralized Enterprise Rate Limiting Configuration
 */
export const rateLimitConfig = {
    // 1. Auth Rate Limiting (5 requests per 15 minutes per IP)
    auth: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 5,
        message: 'Too many login attempts. Please try again after 15 minutes.'
    },

    // 2. AI Feature Rate Limiting (20 requests per hour per user)
    ai: {
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 20,
        message: 'AI generation limit reached. You can make up to 20 AI requests per hour.'
    },

    // 3. Payment Rate Limiting (30 requests per hour per user)
    payments: {
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 30,
        message: 'Payment request limit reached. Please try again in an hour.'
    },

    // 4. File Upload Rate Limiting (20 uploads per hour per user)
    uploads: {
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 20,
        message: 'File upload limit reached. You can upload up to 20 files per hour.'
    },

    // 5. General API Rate Limiting (300 requests per 15 minutes per IP)
    general: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 300,
        message: 'Too many requests. Please try again later.'
    }
};
