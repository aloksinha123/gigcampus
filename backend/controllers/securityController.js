import SecurityAudit from '../models/SecurityAudit.js';
import User from '../models/User.js';
import { logSecurityAudit } from '../services/auditService.js';
import { sendSecurityAlertEmail } from '../services/emailService.js';

// @desc    Get security history for the logged-in user
// @route   GET /api/security/my-history
// @access  Private
export const getMySecurityHistory = async (req, res) => {
    try {
        const history = await SecurityAudit.find({ user: req.user._id })
            .sort({ createdAt: -1 })
            .limit(50);

        res.json(history);
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};

// @desc    Get all security audit logs (Admin Only) with search & filter
// @route   GET /api/security/admin/logs
// @access  Private/Admin
export const getAdminSecurityLogs = async (req, res) => {
    try {
        const { search, action, status, page = 1, limit = 50 } = req.query;

        const query = {};

        if (action && action !== 'ALL') {
            query.action = action;
        }

        if (status && status !== 'ALL') {
            query.status = status;
        }

        if (search) {
            const searchRegex = new RegExp(search.trim(), 'i');
            query.$or = [
                { userEmail: searchRegex },
                { action: searchRegex },
                { ipAddress: searchRegex },
                { browser: searchRegex },
                { operatingSystem: searchRegex }
            ];
        }

        const pageNum = parseInt(page, 10) || 1;
        const limitNum = parseInt(limit, 10) || 50;
        const skip = (pageNum - 1) * limitNum;

        const [logs, total] = await Promise.all([
            SecurityAudit.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum)
                .populate('user', 'username email role lockUntil failedLoginAttempts'),
            SecurityAudit.countDocuments(query)
        ]);

        // Get count of currently locked accounts for admin dashboard stats
        const lockedAccountsCount = await User.countDocuments({
            lockUntil: { $gt: new Date() }
        });

        const failedLoginsCount = await SecurityAudit.countDocuments({
            action: 'LOGIN_FAILURE'
        });

        const newDeviceLoginsCount = await SecurityAudit.countDocuments({
            action: 'NEW_DEVICE_LOGIN'
        });

        res.json({
            logs,
            total,
            page: pageNum,
            pages: Math.ceil(total / limitNum),
            stats: {
                lockedAccountsCount,
                failedLoginsCount,
                newDeviceLoginsCount,
                totalAuditLogs: total
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};

// @desc    Manually unlock a locked user account (Admin Only)
// @route   PUT /api/security/admin/unlock/:userId
// @access  Private/Admin
export const unlockUserAccount = async (req, res) => {
    try {
        const { userId } = req.params;

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: 'User account not found' });
        }

        user.failedLoginAttempts = 0;
        user.lockUntil = undefined;
        await user.save();

        logSecurityAudit({
            user: user._id,
            userEmail: user.email,
            action: 'ACCOUNT_UNLOCKED',
            status: 'SUCCESS',
            req,
            metadata: { unlockedBy: req.user.email }
        });

        try {
            await sendSecurityAlertEmail(user.email, user.profile?.fullName || user.username, 'ACCOUNT_UNLOCKED');
        } catch (emailErr) {
            console.error('⚠️ Account unlocked email failed:', emailErr.message);
        }

        res.json({ message: `Account for ${user.email} has been unlocked successfully.` });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};
