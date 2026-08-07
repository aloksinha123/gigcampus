export const errorHandler = (err, req, res, next) => {
    let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    let message = err.message || 'Internal Server Error';

    // Mongoose Invalid ObjectId Cast Error
    if (err.name === 'CastError') {
        statusCode = 400;
        message = `Resource not found or invalid ID format: ${err.value}`;
    }

    // Mongoose Duplicate Key Error (11000)
    if (err.code === 11000) {
        statusCode = 400;
        const field = Object.keys(err.keyValue || {})[0] || 'field';
        message = `Duplicate value entered for ${field}. Please use another value.`;
    }

    // Mongoose Validation Error
    if (err.name === 'ValidationError') {
        statusCode = 400;
        message = Object.values(err.errors || {})
            .map(val => val.message)
            .join(', ');
    }

    const requestId = req.requestId || 'N/A';
    const route = req.originalUrl || req.url;
    const userId = req.user?._id ? req.user._id.toString() : 'Unauthenticated';
    const timestamp = new Date().toISOString();

    // Structured Error Logging
    console.error(`
[ERROR]
Request ID: ${requestId}
Route: ${route}
User: ${userId}
Timestamp: ${timestamp}
Message: ${message}
Stack: ${err.stack}
`);

    return res.status(statusCode).json({
        success: false,
        message,
        requestId,
        stack: process.env.NODE_ENV === 'production' ? null : err.stack
    });
};

export const notFound = (req, res, next) => {
    const error = new Error(`Route Not Found - ${req.originalUrl}`);
    res.status(404);
    next(error);
};
