import express from 'express';
import {
    getMySecurityHistory,
    getAdminSecurityLogs,
    unlockUserAccount
} from '../controllers/securityController.js';
import { protect, admin } from '../middleware/auth.js';

const router = express.Router();

// GET /api/security/my-history
router.get('/my-history', protect, getMySecurityHistory);

// GET /api/security/admin/logs (Admin Only)
router.get('/admin/logs', protect, admin, getAdminSecurityLogs);

// PUT /api/security/admin/unlock/:userId (Admin Only)
router.put('/admin/unlock/:userId', protect, admin, unlockUserAccount);

export default router;
