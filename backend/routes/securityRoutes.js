import express from 'express';
import {
    getMySecurityHistory,
    getAdminSecurityLogs,
    unlockUserAccount
} from '../controllers/securityController.js';
import { protect, admin } from '../middleware/auth.js';

const router = express.Router();

/**
 * @openapi
 * /security/my-history:
 *   get:
 *     summary: Get logged-in user security event audit trail
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Security history logs.
 */
router.get('/my-history', protect, getMySecurityHistory);

/**
 * @openapi
 * /security/admin/logs:
 *   get:
 *     summary: Get all system security audit logs with search & filters (Admin only)
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: action
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Paginated audit logs & summary stats.
 */
router.get('/admin/logs', protect, admin, getAdminSecurityLogs);

/**
 * @openapi
 * /security/admin/unlock/{userId}:
 *   put:
 *     summary: Manually unlock a locked user account (Admin only)
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: User account unlocked.
 */
router.put('/admin/unlock/:userId', protect, admin, unlockUserAccount);

export default router;
