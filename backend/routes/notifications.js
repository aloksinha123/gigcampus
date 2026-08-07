import express from 'express';
import {
    getMyNotifications,
    getNotificationPreferences,
    updateNotificationPreferences,
    markAsRead,
    markAsClicked,
    dismissNotification,
    markAllAsRead,
    deleteNotification
} from '../controllers/notificationController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

/**
 * @openapi
 * /notifications/my:
 *   get:
 *     summary: Get all active system notifications for logged-in user
 *     tags: [Notifications]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List of notifications.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Notification' }
 */
router.get('/my', protect, getMyNotifications);

/**
 * @openapi
 * /notifications/preferences:
 *   get:
 *     summary: Get notification preferences for logged-in user
 *     tags: [Notifications]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Notification preferences object.
 *   put:
 *     summary: Update notification category preferences for logged-in user
 *     tags: [Notifications]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               browserNotifications: { type: boolean, example: true }
 *               messageNotifications: { type: boolean, example: true }
 *               paymentNotifications: { type: boolean, example: true }
 *               bidNotifications: { type: boolean, example: true }
 *               projectNotifications: { type: boolean, example: true }
 *               aiNotifications: { type: boolean, example: true }
 *               marketingNotifications: { type: boolean, example: false }
 *     responses:
 *       200:
 *         description: Preferences updated successfully.
 */
router.route('/preferences')
    .get(protect, getNotificationPreferences)
    .put(protect, updateNotificationPreferences);

/**
 * @openapi
 * /notifications/{id}/read:
 *   put:
 *     summary: Mark single notification as read
 *     tags: [Notifications]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Notification marked read.
 */
router.put('/:id/read', protect, markAsRead);

/**
 * @openapi
 * /notifications/{id}/click:
 *   put:
 *     summary: Mark single notification as clicked (logs click timestamp)
 *     tags: [Notifications]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Notification marked as clicked.
 */
router.put('/:id/click', protect, markAsClicked);

/**
 * @openapi
 * /notifications/{id}/dismiss:
 *   put:
 *     summary: Dismiss notification from user list
 *     tags: [Notifications]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Notification dismissed.
 */
router.put('/:id/dismiss', protect, dismissNotification);

/**
 * @openapi
 * /notifications/read-all:
 *   put:
 *     summary: Mark all notifications as read
 *     tags: [Notifications]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: All notifications marked read.
 */
router.put('/read-all', protect, markAllAsRead);

/**
 * @openapi
 * /notifications/{id}:
 *   delete:
 *     summary: Delete a notification
 *     tags: [Notifications]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Notification deleted.
 */
router.delete('/:id', protect, deleteNotification);

export default router;
