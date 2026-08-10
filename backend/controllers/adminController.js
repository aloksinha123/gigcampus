import User from '../models/User.js';
import Project from '../models/Project.js';
import Payment from '../models/Payment.js';
import Bid from '../models/Bid.js';
import Message from '../models/Message.js';
import Activity from '../models/Activity.js';

// ============ ANALYTICS ============
export const getAdminStats = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalStudents = await User.countDocuments({ role: 'student' });
        const totalFreelancers = await User.countDocuments({ role: 'freelancer' });
        const activeFreelancers = await User.countDocuments({ role: 'freelancer', isActive: true });

        const totalProjects = await Project.countDocuments();
        const openProjects = await Project.countDocuments({ status: 'open' });
        const activeProjects = await Project.countDocuments({ status: 'in_progress' });
        const completedProjects = await Project.countDocuments({ status: 'completed' });
        const disputedProjects = await Project.countDocuments({ status: 'disputed' });

        const payments = await Payment.find({ status: 'released' });
        const totalRevenue = payments.reduce((sum, p) => sum + (p.platformCommission || 0), 0);

        const recentUsers = await User.find().sort({ createdAt: -1 }).limit(5).select('username email role createdAt isActive');
        const recentProjects = await Project.find().sort({ createdAt: -1 }).limit(5).populate('client', 'username');

        res.json({
            stats: {
                totalUsers,
                totalStudents,
                totalFreelancers,
                activeFreelancers,
                totalProjects,
                openProjects,
                activeProjects,
                completedProjects,
                totalRevenue,
                disputes: disputedProjects
            },
            recentUsers,
            recentProjects
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ============ USER MANAGEMENT ============
export const getAllUsers = async (req, res) => {
    try {
        const { role, status, search, page = 1, limit = 20 } = req.query;

        let query = {};

        if (role) query.role = role;
        if (status === 'active') query.isActive = true;
        if (status === 'suspended') query.isActive = false;
        if (search) {
            query.$or = [
                { username: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        const users = await User.find(query)
            .select('-password')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const count = await User.countDocuments(query);

        res.json({
            users,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            total: count
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const suspendUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.isActive = false;
        await user.save();

        const safeUser = user.getPublicProfile();
        safeUser.isActive = user.isActive;
        res.json({ message: 'User suspended successfully', user: safeUser });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const activateUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.isActive = true;
        await user.save();

        const safeUser = user.getPublicProfile();
        safeUser.isActive = user.isActive;
        res.json({ message: 'User activated successfully', user: safeUser });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const verifyFreelancer = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.role !== 'freelancer') {
            return res.status(400).json({ message: 'User is not a freelancer' });
        }

        user.isVerified = true;
        await user.save();

        const safeUser = user.getPublicProfile();
        safeUser.isActive = user.isActive;
        res.json({ message: 'Freelancer verified successfully', user: safeUser });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ============ PROJECT MANAGEMENT ============
export const getAllProjects = async (req, res) => {
    try {
        const { status, search, page = 1, limit = 20 } = req.query;

        let query = {};

        if (status) query.status = status;
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        const projects = await Project.find(query)
            .populate('client', 'username email')
            .populate('freelancer', 'username email')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const count = await Project.countDocuments(query);

        res.json({
            projects,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            total: count
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteProject = async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);

        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        // Only allow deletion of open or cancelled projects
        if (project.status === 'in_progress') {
            return res.status(400).json({ message: 'Cannot delete active projects. Resolve disputes first.' });
        }

        await Project.findByIdAndDelete(req.params.id);

        res.json({ message: 'Project deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ============ DISPUTE RESOLUTION ============
export const getDisputedProjects = async (req, res) => {
    try {
        const projects = await Project.find({ status: 'disputed' })
            .populate('client', 'username email wallet')
            .populate('freelancer', 'username email wallet')
            .populate('selectedBid')
            .sort({ updatedAt: -1 });

        res.json(projects);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const resolveDispute = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { decision, reason } = req.body; // decision: 'refund' or 'release'

        const project = await Project.findById(projectId)
            .populate('client')
            .populate('freelancer')
            .populate('selectedBid');

        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        if (project.status !== 'disputed') {
            return res.status(400).json({ message: 'Project is not in disputed status' });
        }

        const payment = await Payment.findOne({ project: projectId, status: 'escrowed' });

        if (!payment) {
            return res.status(404).json({ message: 'No escrowed payment found' });
        }

        if (decision === 'release') {
            // Release payment to freelancer
            const freelancerAmount = payment.amount - payment.platformCommission;

            project.freelancer.wallet.balance += freelancerAmount;
            await project.freelancer.save();

            payment.status = 'released';
            payment.releasedAt = new Date();
            await payment.save();

            project.status = 'completed';
            project.completedAt = new Date();
            await project.save();

            res.json({
                message: 'Dispute resolved. Payment released to freelancer.',
                decision: 'release',
                amount: freelancerAmount
            });

        } else if (decision === 'refund') {
            // Refund to student
            project.client.wallet.balance += payment.amount;
            await project.client.save();

            payment.status = 'refunded';
            await payment.save();

            project.status = 'cancelled';
            await project.save();

            res.json({
                message: 'Dispute resolved. Payment refunded to student.',
                decision: 'refund',
                amount: payment.amount
            });

        } else {
            return res.status(400).json({ message: 'Invalid decision. Use "release" or "refund"' });
        }

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ============ BID MONITORING ============
export const getAllBids = async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;

        let query = {};
        if (status) query.status = status;

        const bids = await Bid.find(query)
            .populate('project', 'title status')
            .populate('freelancer', 'username email')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const count = await Bid.countDocuments(query);

        res.json({
            bids,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            total: count
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ============ PRODUCTION ADMIN ANALYTICS ============
// @desc    Get comprehensive platform analytics with real MongoDB aggregation pipelines
// @route   GET /api/v1/admin/analytics
// @access  Private (Admin only)
export const getAdminAnalytics = async (req, res) => {
    try {
        const { range = '30days', from, to } = req.query;

        // Build Date Range
        const now = new Date();
        let startDate, endDate = now;

        switch (range) {
            case 'today': {
                startDate = new Date(now);
                startDate.setHours(0, 0, 0, 0);
                break;
            }
            case '7d':
            case '7days': {
                startDate = new Date(now);
                startDate.setDate(startDate.getDate() - 7);
                break;
            }
            case '30d':
            case '30days': {
                startDate = new Date(now);
                startDate.setDate(startDate.getDate() - 30);
                break;
            }
            case '90d': {
                startDate = new Date(now);
                startDate.setDate(startDate.getDate() - 90);
                break;
            }
            case '1y':
            case 'year': {
                startDate = new Date(now);
                startDate.setFullYear(startDate.getFullYear() - 1);
                break;
            }
            case 'custom': {
                if (!from || !to) {
                    return res.status(400).json({ success: false, message: 'Custom range requires from and to query params' });
                }
                startDate = new Date(from);
                endDate = new Date(to);
                if (isNaN(startDate) || isNaN(endDate)) {
                    return res.status(400).json({ success: false, message: 'Invalid date format in from/to params' });
                }
                break;
            }
            default: {
                startDate = new Date(now);
                startDate.setDate(startDate.getDate() - 30);
            }
        }

        const dateFilter = { $gte: startDate, $lte: endDate };

        // Lazy-load models not in top-level imports
        const [Review, Milestone, Transaction, FraudEvent, SecurityAudit] = await Promise.all([
            import('../models/Review.js').then(m => m.default),
            import('../models/Milestone.js').then(m => m.default),
            import('../models/Transaction.js').then(m => m.default),
            import('../models/FraudEvent.js').then(m => m.default),
            import('../models/SecurityAudit.js').then(m => m.default)
        ]);

        // Chart grouping: day for <=14d, month for >14d
        const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
        const chartFormat = daysDiff <= 14 ? '%Y-%m-%d' : '%Y-%m';
        const chartFormatLabel = daysDiff <= 14 ? 'day' : 'month';

        // Run all aggregations in parallel
        const [
            userStats, newUsers, userGrowthChart,
            projectStats, projectsByCategory, newProjects, projectGrowthChart, avgCompletionTime,
            bidStats, newBids,
            paymentStats, paymentByMonth,
            transactionStats,
            milestoneStats,
            reviewStats,
            fraudByType, fraudByRisk, fraudStats, fraudOverTime,
            aiStats,
            topFreelancers, topClients, topCategories, topProjectsByBids,
            recentPayments, recentProjects, recentActivity
        ] = await Promise.all([

            // Users
            User.aggregate([{ $group: {
                _id: null,
                total: { $sum: 1 },
                students: { $sum: { $cond: [{ $eq: ['$role', 'student'] }, 1, 0] } },
                freelancers: { $sum: { $cond: [{ $eq: ['$role', 'freelancer'] }, 1, 0] } },
                verified: { $sum: { $cond: ['$isVerified', 1, 0] } },
                active: { $sum: { $cond: ['$isActive', 1, 0] } },
                online: { $sum: { $cond: ['$isOnline', 1, 0] } },
                emailVerified: { $sum: { $cond: ['$isEmailVerified', 1, 0] } }
            }}]),
            User.countDocuments({ createdAt: dateFilter }),
            User.aggregate([
                { $match: { createdAt: dateFilter } },
                { $group: { _id: { $dateToString: { format: chartFormat, date: '$createdAt' } }, students: { $sum: { $cond: [{ $eq: ['$role', 'student'] }, 1, 0] } }, freelancers: { $sum: { $cond: [{ $eq: ['$role', 'freelancer'] }, 1, 0] } }, total: { $sum: 1 } } },
                { $sort: { '_id': 1 } },
                { $project: { _id: 0, label: '$_id', students: 1, freelancers: 1, total: 1 } }
            ]),

            // Projects
            Project.aggregate([{ $group: {
                _id: null,
                total: { $sum: 1 },
                open: { $sum: { $cond: [{ $eq: ['$status', 'open'] }, 1, 0] } },
                inProgress: { $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } },
                completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
                cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
                disputed: { $sum: { $cond: [{ $eq: ['$status', 'disputed'] }, 1, 0] } },
                avgBudget: { $avg: { $ifNull: ['$budget.max', { $ifNull: ['$budget.min', 0] }] } }
            }}]),
            Project.aggregate([
                { $group: { _id: '$category', count: { $sum: 1 }, avgBudget: { $avg: { $ifNull: ['$budget.max', 0] } } } },
                { $sort: { count: -1 } },
                { $project: { _id: 0, category: '$_id', count: 1, avgBudget: { $round: ['$avgBudget', 0] } } }
            ]),
            Project.countDocuments({ createdAt: dateFilter }),
            Project.aggregate([
                { $match: { createdAt: dateFilter } },
                { $group: { _id: { $dateToString: { format: chartFormat, date: '$createdAt' } }, created: { $sum: 1 }, completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } } } },
                { $sort: { '_id': 1 } },
                { $project: { _id: 0, label: '$_id', created: 1, completed: 1 } }
            ]),
            Project.aggregate([
                { $match: { status: 'completed', completedAt: { $exists: true } } },
                { $group: { _id: null, avgDays: { $avg: { $divide: [{ $subtract: ['$completedAt', '$createdAt'] }, 86400000] } } } }
            ]),

            // Bids
            Bid.aggregate([{ $group: {
                _id: null,
                total: { $sum: 1 },
                accepted: { $sum: { $cond: [{ $eq: ['$status', 'accepted'] }, 1, 0] } },
                rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
                pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
                withdrawn: { $sum: { $cond: [{ $eq: ['$status', 'withdrawn'] }, 1, 0] } }
            }}]),
            Bid.countDocuments({ createdAt: dateFilter }),

            // Payments
            Payment.aggregate([{ $group: {
                _id: null,
                totalVolume: { $sum: '$amount' },
                totalRevenue: { $sum: { $ifNull: ['$platformCommission', { $multiply: ['$amount', 0.1] }] } },
                released: { $sum: { $cond: [{ $eq: ['$status', 'released'] }, 1, 0] } },
                escrowed: { $sum: { $cond: [{ $eq: ['$status', 'escrowed'] }, 1, 0] } },
                failed: { $sum: { $cond: [{ $in: ['$status', ['FAILED', 'failed']] }, 1, 0] } },
                refunded: { $sum: { $cond: [{ $in: ['$status', ['REFUNDED', 'refunded']] }, 1, 0] } },
                avgTransactionValue: { $avg: '$amount' }
            }}]),
            Payment.aggregate([
                { $match: { createdAt: dateFilter } },
                { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, volume: { $sum: '$amount' }, revenue: { $sum: { $ifNull: ['$platformCommission', { $multiply: ['$amount', 0.1] }] } }, count: { $sum: 1 }, released: { $sum: { $cond: [{ $eq: ['$status', 'released'] }, 1, 0] } }, failed: { $sum: { $cond: [{ $in: ['$status', ['FAILED', 'failed']] }, 1, 0] } } } },
                { $sort: { '_id': 1 } },
                { $project: { _id: 0, month: '$_id', volume: { $round: ['$volume', 0] }, revenue: { $round: ['$revenue', 0] }, count: 1, released: 1, failed: 1 } }
            ]),

            // Transactions/Wallet
            Transaction.aggregate([{ $group: {
                _id: null,
                totalCredits: { $sum: { $cond: [{ $eq: ['$type', 'payment_received'] }, '$amount', 0] } },
                totalDebits: { $sum: { $cond: [{ $eq: ['$type', 'withdrawal'] }, '$amount', 0] } },
                pendingPayouts: { $sum: { $cond: [{ $in: ['$payoutStatus', ['pending', 'processing', 'queued']] }, 1, 0] } },
                successfulPayouts: { $sum: { $cond: [{ $eq: ['$payoutStatus', 'processed'] }, 1, 0] } },
                failedPayouts: { $sum: { $cond: [{ $in: ['$payoutStatus', ['reversed', 'cancelled']] }, 1, 0] } },
                totalReleasedAmount: { $sum: { $cond: [{ $eq: ['$payoutStatus', 'processed'] }, '$amount', 0] } },
                totalPendingAmount: { $sum: { $cond: [{ $in: ['$payoutStatus', ['pending', 'processing', 'queued']] }, '$amount', 0] } }
            }}]),

            // Milestones
            Milestone.aggregate([{ $group: {
                _id: null,
                total: { $sum: 1 },
                pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
                submitted: { $sum: { $cond: [{ $eq: ['$status', 'submitted'] }, 1, 0] } },
                approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
                rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
                released: { $sum: { $cond: [{ $eq: ['$status', 'released'] }, 1, 0] } },
                totalAmountFunded: { $sum: { $cond: [{ $in: ['$status', ['approved', 'released']] }, '$amount', 0] } },
                totalAmountReleased: { $sum: { $cond: [{ $eq: ['$status', 'released'] }, '$amount', 0] } },
                totalAmountPending: { $sum: { $cond: [{ $in: ['$status', ['pending', 'submitted']] }, '$amount', 0] } }
            }}]),

            // Reviews
            Review.aggregate([{ $group: {
                _id: null,
                total: { $sum: 1 },
                avgRating: { $avg: '$rating' },
                star5: { $sum: { $cond: [{ $gte: ['$rating', 5] }, 1, 0] } },
                star4: { $sum: { $cond: [{ $and: [{ $gte: ['$rating', 4] }, { $lt: ['$rating', 5] }] }, 1, 0] } },
                star3: { $sum: { $cond: [{ $and: [{ $gte: ['$rating', 3] }, { $lt: ['$rating', 4] }] }, 1, 0] } },
                star2: { $sum: { $cond: [{ $and: [{ $gte: ['$rating', 2] }, { $lt: ['$rating', 3] }] }, 1, 0] } },
                star1: { $sum: { $cond: [{ $lt: ['$rating', 2] }, 1, 0] } },
                hidden: { $sum: { $cond: ['$isHidden', 1, 0] } },
                reported: { $sum: { $cond: [{ $gt: [{ $size: { $ifNull: ['$reports', []] } }, 0] }, 1, 0] } },
                wouldRecommend: { $sum: { $cond: ['$wouldRecommend', 1, 0] } }
            }}]),

            // Fraud
            FraudEvent.aggregate([
                { $group: { _id: '$eventType', count: { $sum: 1 }, avgScore: { $avg: '$riskScore' } } },
                { $sort: { count: -1 } },
                { $project: { _id: 0, eventType: '$_id', count: 1, avgScore: { $round: ['$avgScore', 1] } } }
            ]),
            FraudEvent.aggregate([
                { $group: { _id: '$riskLevel', count: { $sum: 1 } } },
                { $project: { _id: 0, riskLevel: '$_id', count: 1 } }
            ]),
            FraudEvent.aggregate([{ $group: {
                _id: null,
                total: { $sum: 1 },
                open: { $sum: { $cond: [{ $eq: ['$status', 'OPEN'] }, 1, 0] } },
                reviewing: { $sum: { $cond: [{ $eq: ['$status', 'REVIEWING'] }, 1, 0] } },
                resolved: { $sum: { $cond: [{ $eq: ['$status', 'RESOLVED'] }, 1, 0] } },
                falsePositives: { $sum: { $cond: [{ $eq: ['$status', 'FALSE_POSITIVE'] }, 1, 0] } },
                blocked: { $sum: { $cond: [{ $eq: ['$status', 'BLOCKED'] }, 1, 0] } },
                highRisk: { $sum: { $cond: [{ $eq: ['$riskLevel', 'HIGH'] }, 1, 0] } },
                critical: { $sum: { $cond: [{ $eq: ['$riskLevel', 'CRITICAL'] }, 1, 0] } },
                avgScore: { $avg: '$riskScore' }
            }}]),
            FraudEvent.aggregate([
                { $match: { createdAt: dateFilter } },
                { $group: { _id: { $dateToString: { format: chartFormat, date: '$createdAt' } }, count: { $sum: 1 }, highRisk: { $sum: { $cond: [{ $in: ['$riskLevel', ['HIGH', 'CRITICAL']] }, 1, 0] } } } },
                { $sort: { '_id': 1 } },
                { $project: { _id: 0, label: '$_id', count: 1, highRisk: 1 } }
            ]),

            // AI via SecurityAudit
            SecurityAudit.aggregate([
                { $match: { action: { $in: ['AI_PROPOSAL_GENERATED', 'AI_DESCRIPTION_ENHANCED', 'AI_FREELANCER_RECOMMENDED', 'AI_BID_ANALYZED', 'AI_RISK_ANALYZED'] } } },
                { $group: { _id: '$action', count: { $sum: 1 } } }
            ]),

            // Top Performers
            User.find({ role: 'freelancer', isActive: true })
                .sort({ 'reputation.completedProjects': -1, 'reputation.score': -1 })
                .limit(5)
                .select('username profile.avatar reputation wallet.balance isVerified'),
            User.aggregate([
                { $match: { role: 'student' } },
                { $lookup: { from: 'projects', localField: '_id', foreignField: 'client', as: 'projects' } },
                { $project: { username: 1, 'profile.avatar': 1, projectCount: { $size: '$projects' } } },
                { $sort: { projectCount: -1 } },
                { $limit: 5 }
            ]),
            Project.aggregate([
                { $group: { _id: '$category', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 6 },
                { $project: { _id: 0, category: '$_id', count: 1 } }
            ]),
            Bid.aggregate([
                { $group: { _id: '$project', bidCount: { $sum: 1 } } },
                { $sort: { bidCount: -1 } },
                { $limit: 5 },
                { $lookup: { from: 'projects', localField: '_id', foreignField: '_id', as: 'project' } },
                { $unwind: { path: '$project', preserveNullAndEmptyArrays: true } },
                { $project: { _id: 0, bidCount: 1, title: '$project.title', budget: '$project.budget', status: '$project.status' } }
            ]),

            // Recent
            Payment.find().sort({ createdAt: -1 }).limit(6)
                .populate('client', 'username').populate('freelancer', 'username').populate('project', 'title'),
            Project.find().sort({ createdAt: -1 }).limit(6).populate('client', 'username'),
            Activity.find().sort({ createdAt: -1 }).limit(8)
                .populate('user', 'username profile.avatar').populate('project', 'title')
        ]);

        // Flatten
        const us = userStats[0] || { total: 0, students: 0, freelancers: 0, verified: 0, active: 0, online: 0, emailVerified: 0 };
        const ps = projectStats[0] || { total: 0, open: 0, inProgress: 0, completed: 0, cancelled: 0, disputed: 0, avgBudget: 0 };
        const bs = bidStats[0] || { total: 0, accepted: 0, rejected: 0, pending: 0, withdrawn: 0 };
        const pys = paymentStats[0] || { totalVolume: 0, totalRevenue: 0, released: 0, escrowed: 0, failed: 0, refunded: 0, avgTransactionValue: 0 };
        const txs = transactionStats[0] || { totalCredits: 0, totalDebits: 0, pendingPayouts: 0, successfulPayouts: 0, failedPayouts: 0, totalReleasedAmount: 0, totalPendingAmount: 0 };
        const ms = milestoneStats[0] || { total: 0, pending: 0, submitted: 0, approved: 0, rejected: 0, released: 0, totalAmountFunded: 0, totalAmountReleased: 0, totalAmountPending: 0 };
        const rs = reviewStats[0] || { total: 0, avgRating: 0, star5: 0, star4: 0, star3: 0, star2: 0, star1: 0, hidden: 0, reported: 0, wouldRecommend: 0 };
        const fs_raw = fraudStats[0] || { total: 0, open: 0, reviewing: 0, resolved: 0, falsePositives: 0, blocked: 0, highRisk: 0, critical: 0, avgScore: 0 };

        const aiMap = {};
        aiStats.forEach(a => { aiMap[a._id] = a.count; });

        // Marketplace Health
        const projectCompletionRate = (ps.completed + ps.cancelled) > 0 ? Math.round((ps.completed / (ps.completed + ps.cancelled)) * 100) : 0;
        const bidAcceptanceRate = bs.total > 0 ? Math.round((bs.accepted / bs.total) * 100) : 0;
        const paymentSuccessRate = (pys.released + pys.failed) > 0 ? Math.round((pys.released / (pys.released + pys.failed)) * 100) : 0;
        const milestoneReleaseRate = ms.total > 0 ? Math.round((ms.released / ms.total) * 100) : 0;
        const activeUserRate = us.total > 0 ? Math.round((us.active / us.total) * 100) : 0;
        const verificationRate = us.freelancers > 0 ? Math.round((us.verified / us.freelancers) * 100) : 0;

        return res.json({
            success: true,
            meta: { range, startDate, endDate, chartGrouping: chartFormatLabel },
            analytics: {
                users: { total: us.total, students: us.students, freelancers: us.freelancers, verified: us.verified, active: us.active, online: us.online, emailVerified: us.emailVerified, newInPeriod: newUsers, growthChart: userGrowthChart },
                projects: { total: ps.total, open: ps.open, active: ps.inProgress, completed: ps.completed, cancelled: ps.cancelled, disputed: ps.disputed, newInPeriod: newProjects, avgBudget: Math.round(ps.avgBudget || 0), avgCompletionDays: Math.round(avgCompletionTime[0]?.avgDays || 0), byCategory: projectsByCategory, growthChart: projectGrowthChart },
                bids: { total: bs.total, accepted: bs.accepted, rejected: bs.rejected, pending: bs.pending, withdrawn: bs.withdrawn, newInPeriod: newBids, avgPerProject: ps.total > 0 ? Math.round((bs.total / ps.total) * 10) / 10 : 0, acceptanceRate: bidAcceptanceRate },
                payments: { grossVolume: Math.round(pys.totalVolume || 0), totalRevenue: Math.round(pys.totalRevenue || 0), released: pys.released, escrowed: pys.escrowed, failed: pys.failed, refunded: pys.refunded, avgTransactionValue: Math.round(pys.avgTransactionValue || 0), successRate: paymentSuccessRate, byMonth: paymentByMonth },
                wallet: { totalCredits: Math.round(txs.totalCredits || 0), totalDebits: Math.round(txs.totalDebits || 0), pendingPayouts: txs.pendingPayouts, successfulPayouts: txs.successfulPayouts, failedPayouts: txs.failedPayouts, totalReleasedAmount: Math.round(txs.totalReleasedAmount || 0), totalPendingAmount: Math.round(txs.totalPendingAmount || 0) },
                milestones: { total: ms.total, pending: ms.pending, submitted: ms.submitted, approved: ms.approved, rejected: ms.rejected, released: ms.released, totalAmountFunded: Math.round(ms.totalAmountFunded || 0), totalAmountReleased: Math.round(ms.totalAmountReleased || 0), totalAmountPending: Math.round(ms.totalAmountPending || 0), completionRate: milestoneReleaseRate },
                reviews: { total: rs.total, avgRating: Math.round((rs.avgRating || 0) * 10) / 10, star5: rs.star5, star4: rs.star4, star3: rs.star3, star2: rs.star2, star1: rs.star1, hidden: rs.hidden, reported: rs.reported, wouldRecommend: rs.wouldRecommend },
                ai: { totalRequests: Object.values(aiMap).reduce((s, c) => s + c, 0), proposalsGenerated: aiMap['AI_PROPOSAL_GENERATED'] || 0, descriptionEnhancements: aiMap['AI_DESCRIPTION_ENHANCED'] || 0, freelancerRecommendations: aiMap['AI_FREELANCER_RECOMMENDED'] || 0, bidAnalyses: aiMap['AI_BID_ANALYZED'] || 0, projectRiskAnalyses: aiMap['AI_RISK_ANALYZED'] || 0 },
                fraud: { total: fs_raw.total, open: fs_raw.open, reviewing: fs_raw.reviewing, resolved: fs_raw.resolved, falsePositives: fs_raw.falsePositives, blocked: fs_raw.blocked, highRisk: fs_raw.highRisk, critical: fs_raw.critical, avgScore: Math.round((fs_raw.avgScore || 0) * 10) / 10, byType: fraudByType, byRiskLevel: fraudByRisk, overTime: fraudOverTime },
                health: { projectCompletionRate, bidAcceptanceRate, paymentSuccessRate, milestoneReleaseRate, avgProjectValue: Math.round(ps.avgBudget || 0), activeUserRate, verificationRate, avgCompletionDays: Math.round(avgCompletionTime[0]?.avgDays || 0) },
                topPerformers: { freelancers: topFreelancers, clients: topClients, categories: topCategories, projectsByBids: topProjectsByBids },
                recent: { payments: recentPayments, projects: recentProjects, activity: recentActivity }
            }
        });
    } catch (error) {
        console.error('Admin Analytics Error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get transactional email delivery stats (Admin only)
// @route   GET /api/v1/admin/email-stats
// @access  Private (Admin)
export const getEmailStats = async (req, res) => {
    try {
        const EmailLog = (await import('../models/EmailLog.js')).default;

        const totalSent = await EmailLog.countDocuments({ status: 'SENT' });
        const totalFailed = await EmailLog.countDocuments({ status: 'FAILED' });
        const totalQueued = await EmailLog.countDocuments({ status: 'QUEUED' });

        // Group by type
        const statsByType = await EmailLog.aggregate([
            {
                $group: {
                    _id: '$type',
                    sent: {
                        $sum: {
                            $cond: [{ $eq: ['$status', 'SENT'] }, 1, 0]
                        }
                    },
                    failed: {
                        $sum: {
                            $cond: [{ $eq: ['$status', 'FAILED'] }, 1, 0]
                        }
                    }
                }
            }
        ]);

        return res.json({
            success: true,
            totalSent,
            totalFailed,
            totalQueued,
            statsByType
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
