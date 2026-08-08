import express from 'express';
import {
    getProjectRecommendations,
    getFreelancerRecommendations,
    trackRecentlyViewed,
    getRecentlyViewed,
    clearRecentlyViewed
} from '../controllers/recommendationController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

/**
 * @swagger
 * /api/v1/recommendations/projects:
 *   get:
 *     summary: Retrieve personalized project recommendations for freelancers
 *     tags: [Recommendations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Recommendations list
 */
router.get('/projects', protect, getProjectRecommendations);

/**
 * @swagger
 * /api/v1/recommendations/freelancers:
 *   get:
 *     summary: Retrieve personalized freelancer recommendations for clients
 *     tags: [Recommendations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Recommendations list
 */
router.get('/freelancers', protect, getFreelancerRecommendations);

/**
 * @swagger
 * /api/v1/recommendations/recently-viewed:
 *   get:
 *     summary: Retrieve chronologically tracked viewed items list
 *     tags: [Recommendations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: entityType
 *         schema:
 *           type: string
 *           enum: [project, freelancer]
 *     responses:
 *       200:
 *         description: Log list
 *   post:
 *     summary: Track a viewed project or freelancer details page
 *     tags: [Recommendations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - entityType
 *               - entityId
 *             properties:
 *               entityType:
 *                 type: string
 *                 enum: [project, freelancer]
 *               entityId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Logged successfully
 *   delete:
 *     summary: Clear viewed logs cache
 *     tags: [Recommendations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: entityType
 *         schema:
 *           type: string
 *           enum: [project, freelancer]
 *     responses:
 *       200:
 *         description: Cleared successfully
 */
router.route('/recently-viewed')
    .get(protect, getRecentlyViewed)
    .post(protect, trackRecentlyViewed)
    .delete(protect, clearRecentlyViewed);

export default router;
