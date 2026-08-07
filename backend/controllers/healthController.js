import mongoose from 'mongoose';

const formatUptime = (seconds) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${d}d ${h}h ${m}m ${s}s`;
};

// @desc    Get detailed API health and system metrics
// @route   GET /api/v1/health & GET /api/health
// @access  Public
export const getHealth = (req, res) => {
    const memory = process.memoryUsage();
    const dbStateMap = { 0: 'Disconnected', 1: 'Connected', 2: 'Connecting', 3: 'Disconnecting' };
    const dbStatus = dbStateMap[mongoose.connection.readyState] || 'Unknown';

    const healthData = {
        status: dbStatus === 'Connected' ? 'OK' : 'DEGRADED',
        uptime: formatUptime(process.uptime()),
        database: dbStatus,
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        memoryUsage: {
            heapUsed: `${(memory.heapUsed / 1024 / 1024).toFixed(2)} MB`,
            heapTotal: `${(memory.heapTotal / 1024 / 1024).toFixed(2)} MB`,
            rss: `${(memory.rss / 1024 / 1024).toFixed(2)} MB`
        },
        nodeVersion: process.version
    };

    res.json(healthData);
};
