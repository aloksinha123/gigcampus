import Notification from '../models/Notification.js';
import User from '../models/User.js';

// @desc    Get user's notifications
// @route   GET /api/notifications/my
// @access  Private
export const getMyNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find({
            user: req.user._id,
            dismissed: { $ne: true }
        })
            .populate('relatedUser', 'username profile.avatar')
            .populate('project', 'title')
            .sort({ createdAt: -1 })
            .limit(50);

        res.json(notifications);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get notification preferences for logged-in user
// @route   GET /api/v1/notifications/preferences
// @access  Private
export const getNotificationPreferences = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('notificationPreferences');
        const defaultPrefs = {
            browserNotifications: true,
            messageNotifications: true,
            paymentNotifications: true,
            bidNotifications: true,
            projectNotifications: true,
            aiNotifications: true,
            marketingNotifications: false
        };

        const preferences = { ...defaultPrefs, ...(user?.notificationPreferences?.toObject() || {}) };
        return res.json({ success: true, preferences });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update notification preferences for logged-in user
// @route   PUT /api/v1/notifications/preferences
// @access  Private
export const updateNotificationPreferences = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        const current = user.notificationPreferences ? user.notificationPreferences.toObject() : {};
        const updated = {
            ...current,
            ...req.body
        };

        user.notificationPreferences = updated;
        await user.save();

        return res.json({
            success: true,
            message: 'Notification preferences updated successfully.',
            preferences: user.notificationPreferences
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
export const markAsRead = async (req, res) => {
    try {
        const notification = await Notification.findById(req.params.id);

        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }

        // Verify ownership
        if (notification.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        notification.read = true;
        notification.readAt = new Date();
        await notification.save();

        console.log(`[NOTIFICATION READ] ID: ${notification._id}, User: ${req.user._id}, Read Time: ${notification.readAt.toISOString()}`);

        res.json(notification);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Mark notification as clicked
// @route   PUT /api/v1/notifications/:id/click
// @access  Private
export const markAsClicked = async (req, res) => {
    try {
        const notification = await Notification.findById(req.params.id);

        if (!notification) {
            return res.status(404).json({ success: false, message: 'Notification not found' });
        }

        if (notification.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        notification.read = true;
        if (!notification.readAt) notification.readAt = new Date();
        notification.clickedAt = new Date();
        await notification.save();

        console.log(`[NOTIFICATION CLICKED] ID: ${notification._id}, User: ${req.user._id}, Click Time: ${notification.clickedAt.toISOString()}`);

        return res.json({ success: true, notification });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Dismiss notification
// @route   PUT /api/v1/notifications/:id/dismiss
// @access  Private
export const dismissNotification = async (req, res) => {
    try {
        const notification = await Notification.findById(req.params.id);

        if (!notification) {
            return res.status(404).json({ success: false, message: 'Notification not found' });
        }

        if (notification.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        notification.dismissed = true;
        notification.dismissedAt = new Date();
        await notification.save();

        return res.json({ success: true, message: 'Notification dismissed' });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
export const markAllAsRead = async (req, res) => {
    try {
        const now = new Date();
        await Notification.updateMany(
            { user: req.user._id, read: false },
            { read: true, readAt: now }
        );

        res.json({ message: 'All notifications marked as read' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
// @access  Private
export const deleteNotification = async (req, res) => {
    try {
        const notification = await Notification.findById(req.params.id);

        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }

        // Verify ownership
        if (notification.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        await notification.deleteOne();

        res.json({ message: 'Notification deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create notification (helper function for internal use)
// @access  Internal
export const createNotification = async (userId, type, message, metadata = {}) => {
    try {
        const user = await User.findById(userId).select('notificationPreferences');

        const prefs = user?.notificationPreferences || {
            browserNotifications: true,
            messageNotifications: true,
            paymentNotifications: true,
            bidNotifications: true,
            projectNotifications: true,
            aiNotifications: true,
            marketingNotifications: false
        };

        // Category preference check
        const typePrefMap = {
            message: prefs.messageNotifications,
            bid: prefs.bidNotifications,
            payment: prefs.paymentNotifications,
            project: prefs.projectNotifications,
            ai: prefs.aiNotifications,
            marketing: prefs.marketingNotifications
        };

        // If user disabled this category, skip notification creation
        if (typePrefMap[type] === false) {
            console.log(`ℹ️ Notification of type [${type}] skipped for user [${userId}] per notification preferences.`);
            return null;
        }

        const notification = await Notification.create({
            user: userId,
            type,
            message,
            project: metadata.project,
            relatedUser: metadata.relatedUser,
            metadata
        });

        const sentTime = new Date().toISOString();
        console.log(`[NOTIFICATION SENT] ID: ${notification._id}, User: ${userId}, Type: ${type}, Sent Time: ${sentTime}`);

        // Emit socket event to user rooms & project room if available
        const io = global.io;
        if (io) {
            const uid = userId.toString();
            io.to(uid).emit('newNotification', notification);
            io.to(`user_${uid}`).emit('newNotification', notification);
            if (metadata.project) {
                const pid = metadata.project.toString();
                io.to(`project_${pid}`).emit('newNotification', notification);
            }
        }

        return notification;
    } catch (error) {
        console.error('Failed to create notification:', error);
        return null;
    }
};
