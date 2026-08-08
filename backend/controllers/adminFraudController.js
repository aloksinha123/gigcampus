import FraudEvent from '../models/FraudEvent.js';
import User from '../models/User.js';
import { getUserRiskProfile } from '../services/fraudDetectionService.js';
import { logSecurityAudit } from '../services/auditService.js';
import mongoose from 'mongoose';

// @desc    Get all fraud events with filtering & pagination (Admin only)
// @route   GET /api/v1/admin/fraud/events
// @access  Private/Admin
export const getFraudEvents = async (req, res) => {
    try {
        const { riskLevel, eventType, status, userId, startDate, endDate, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

        const query = {};

        if (riskLevel && riskLevel !== 'ALL') {
            query.riskLevel = riskLevel.toUpperCase();
        }

        if (eventType && eventType !== 'ALL') {
            query.eventType = eventType;
        }

        if (status && status !== 'ALL') {
            query.status = status.toUpperCase();
        }

        if (userId) {
            if (mongoose.Types.ObjectId.isValid(userId)) {
                query.userId = userId;
            } else {
                return res.status(400).json({ success: false, message: 'Invalid User ID format' });
            }
        }

        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) {
                query.createdAt.$gte = new Date(startDate);
            }
            if (endDate) {
                // Set to end of day
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                query.createdAt.$lte = end;
            }
        }

        const pageNum = parseInt(page, 10) || 1;
        const limitNum = parseInt(limit, 10) || 20;
        const skip = (pageNum - 1) * limitNum;

        const sortObj = {};
        sortObj[sortBy] = sortOrder === 'desc' ? -1 : 1;

        const [events, total] = await Promise.all([
            FraudEvent.find(query)
                .sort(sortObj)
                .skip(skip)
                .limit(limitNum)
                .populate('userId', 'username email role profile.fullName profile.avatar')
                .populate('reviewedBy', 'username email'),
            FraudEvent.countDocuments(query)
        ]);

        res.json({
            success: true,
            events,
            total,
            page: pageNum,
            pages: Math.ceil(total / limitNum)
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get single fraud event details + User Risk Profile (Admin only)
// @route   GET /api/v1/admin/fraud/events/:id
// @access  Private/Admin
export const getFraudEventDetails = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid Fraud Event ID format' });
        }

        const event = await FraudEvent.findById(id)
            .populate('userId', 'username email role profile.fullName profile.avatar lastSeen isOnline wallet.balance')
            .populate('reviewedBy', 'username email');

        if (!event) {
            return res.status(404).json({ success: false, message: 'Fraud event not found' });
        }

        const riskProfile = await getUserRiskProfile(event.userId?._id || event.userId);

        res.json({
            success: true,
            event,
            riskProfile
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get aggregate fraud telemetry statistics (Admin only)
// @route   GET /api/v1/admin/fraud/statistics
// @access  Private/Admin
export const getFraudStatistics = async (req, res) => {
    try {
        // Status counts
        const statusCounts = await FraudEvent.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);

        const stats = {
            total: 0,
            OPEN: 0,
            REVIEWING: 0,
            RESOLVED: 0,
            FALSE_POSITIVE: 0,
            BLOCKED: 0,
            LOW: 0,
            MEDIUM: 0,
            HIGH: 0,
            CRITICAL: 0
        };

        statusCounts.forEach(s => {
            if (s._id) {
                stats[s._id] = s.count;
                stats.total += s.count;
            }
        });

        // Risk Level counts
        const riskCounts = await FraudEvent.aggregate([
            { $group: { _id: '$riskLevel', count: { $sum: 1 } } }
        ]);

        riskCounts.forEach(r => {
            if (r._id) {
                stats[r._id] = r.count;
            }
        });

        // Top signals breakdown
        const signalsBreakdown = await FraudEvent.aggregate([
            { $unwind: '$signals' },
            { $group: { _id: '$signals', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);

        // Alerts over past 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        const timeline = await FraudEvent.aggregate([
            { $match: { createdAt: { $gte: sevenDaysAgo } } },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    count: { $sum: 1 },
                    criticalCount: {
                        $sum: { $cond: [{ $eq: ['$riskLevel', 'CRITICAL'] }, 1, 0] }
                    }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        res.json({
            success: true,
            statistics: {
                summary: stats,
                signalsBreakdown,
                timeline
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update fraud event status (Admin only)
// @route   PUT /api/v1/admin/fraud/events/:id/status
// @access  Private/Admin
export const updateFraudStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!status || !['OPEN', 'REVIEWING'].includes(status.toUpperCase())) {
            return res.status(400).json({ success: false, message: 'Invalid status. Choose OPEN or REVIEWING' });
        }

        const event = await FraudEvent.findById(id);
        if (!event) {
            return res.status(404).json({ success: false, message: 'Fraud event not found' });
        }

        event.status = status.toUpperCase();
        if (status.toUpperCase() === 'REVIEWING') {
            event.reviewedBy = req.user._id;
            event.reviewedAt = new Date();
        }

        await event.save();

        logSecurityAudit({
            user: event.userId,
            action: 'REVIEW_STARTED',
            status: 'SUCCESS',
            req,
            metadata: { eventId: event._id, newStatus: status }
        });

        res.json({ success: true, message: `Status updated to ${status}`, event });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Resolve fraud event as resolved or false positive (Admin only)
// @route   POST /api/v1/admin/fraud/events/:id/resolve
// @access  Private/Admin
export const resolveFraudEvent = async (req, res) => {
    try {
        const { id } = req.params;
        const { resolution, reason } = req.body;

        if (!resolution || !['RESOLVED', 'FALSE_POSITIVE'].includes(resolution.toUpperCase())) {
            return res.status(400).json({ success: false, message: 'Resolution must be either RESOLVED or FALSE_POSITIVE' });
        }

        if (!reason || !reason.trim()) {
            return res.status(400).json({ success: false, message: 'Reason description is required for resolution' });
        }

        const event = await FraudEvent.findById(id);
        if (!event) {
            return res.status(404).json({ success: false, message: 'Fraud event not found' });
        }

        const previousStatus = event.status;
        event.status = resolution.toUpperCase();
        event.resolutionReason = reason.trim();
        event.reviewedBy = req.user._id;
        event.reviewedAt = new Date();

        await event.save();

        logSecurityAudit({
            user: event.userId,
            action: resolution.toUpperCase(),
            status: 'SUCCESS',
            req,
            metadata: {
                eventId: event._id,
                previousStatus,
                newStatus: resolution,
                reason: reason.trim(),
                adminId: req.user._id
            }
        });

        res.json({
            success: true,
            message: `Fraud event resolved successfully as ${resolution}`,
            event
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Suspend/Block user account + mark alert as BLOCKED (Admin only)
// @route   POST /api/v1/admin/fraud/events/:id/block
// @access  Private/Admin
export const blockUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        if (!reason || !reason.trim()) {
            return res.status(400).json({ success: false, message: 'Reason is required to block user' });
        }

        const event = await FraudEvent.findById(id);
        if (!event) {
            return res.status(404).json({ success: false, message: 'Fraud event not found' });
        }

        const user = await User.findById(event.userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'Associated user account not found' });
        }

        // Suspend user account
        user.isActive = false;
        await user.save();

        // Mark fraud alert status
        event.status = 'BLOCKED';
        event.resolutionReason = reason.trim();
        event.reviewedBy = req.user._id;
        event.reviewedAt = new Date();
        await event.save();

        logSecurityAudit({
            user: user._id,
            action: 'BLOCKED',
            status: 'SUCCESS',
            req,
            metadata: {
                eventId: event._id,
                reason: reason.trim(),
                adminId: req.user._id
            }
        });

        res.json({
            success: true,
            message: `User ${user.username} blocked and event marked BLOCKED successfully.`,
            user,
            event
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
