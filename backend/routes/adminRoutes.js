import express from 'express';
import { protect, admin } from '../middleware/auth.js';
import {
    getAdminStats,
    getAdminAnalytics,
    getAllUsers,
    suspendUser,
    activateUser,
    verifyFreelancer,
    getAllProjects,
    deleteProject,
    getDisputedProjects,
    resolveDispute,
    getAllBids
} from '../controllers/adminController.js';

const router = express.Router();

/**
 * @openapi
 * /admin/analytics:
 *   get:
 *     summary: Get comprehensive production admin analytics, charts & fraud audits (Admin only)
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: range
 *         schema: { type: string, enum: [today, 7days, 30days, year, custom] }
 *     responses:
 *       200:
 *         description: Full platform analytics object.
 */
router.get('/analytics', protect, admin, getAdminAnalytics);

/**
 * @openapi
 * /admin/stats:
 *   get:
 *     summary: Get platform analytics and aggregate statistics (Admin only)
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Overview analytics data.
 */
router.get('/stats', protect, admin, getAdminStats);

/**
 * @openapi
 * /admin/users:
 *   get:
 *     summary: Get all users for admin management (Admin only)
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: User management list.
 */
router.get('/users', protect, admin, getAllUsers);

/**
 * @openapi
 * /admin/users/{id}/suspend:
 *   put:
 *     summary: Suspend user account (Admin only)
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: User suspended.
 */
router.put('/users/:id/suspend', protect, admin, suspendUser);

/**
 * @openapi
 * /admin/users/{id}/activate:
 *   put:
 *     summary: Activate suspended user account (Admin only)
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: User activated.
 */
router.put('/users/:id/activate', protect, admin, activateUser);

/**
 * @openapi
 * /admin/users/{id}/verify:
 *   put:
 *     summary: Verify freelancer identity profile (Admin only)
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Freelancer verified.
 */
router.put('/users/:id/verify', protect, admin, verifyFreelancer);

/**
 * @openapi
 * /admin/projects:
 *   get:
 *     summary: Get all platform projects for moderation (Admin only)
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: All projects list.
 */
router.get('/projects', protect, admin, getAllProjects);

/**
 * @openapi
 * /admin/projects/{id}:
 *   delete:
 *     summary: Remove/Delete project listing (Admin only)
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Project deleted.
 */
router.delete('/projects/:id', protect, admin, deleteProject);

/**
 * @openapi
 * /admin/disputes:
 *   get:
 *     summary: Get all disputed projects awaiting resolution (Admin only)
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List of disputed projects.
 */
router.get('/disputes', protect, admin, getDisputedProjects);

/**
 * @openapi
 * /admin/disputes/{projectId}/resolve:
 *   post:
 *     summary: Resolve dispute and distribute escrow funds (Admin only)
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [winner]
 *             properties:
 *               winner: { type: string, enum: [student, freelancer] }
 *               resolutionNotes: { type: string }
 *     responses:
 *       200:
 *         description: Dispute resolved.
 */
router.post('/disputes/:projectId/resolve', protect, admin, resolveDispute);

/**
 * @openapi
 * /admin/bids:
 *   get:
 *     summary: Monitor all bids across the platform (Admin only)
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Bids monitoring list.
 */
router.get('/bids', protect, admin, getAllBids);

export default router;
