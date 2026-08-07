import express from 'express';
import { improveDescription, analyzeBid, recommendFreelancersController } from '../controllers/aiController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

/**
 * @openapi
 * /ai/improve-description:
 *   post:
 *     summary: AI-powered project description enhancer (Gemini AI)
 *     tags: [AI]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [description]
 *             properties:
 *               description: { type: string, example: 'Need a dashboard website for student projects.' }
 *     responses:
 *       200:
 *         description: Enhanced description generated.
 *         content: { application/json: { schema: { $ref: '#/components/schemas/AIRecommendation' } } }
 */
router.post('/improve-description', protect, improveDescription);

/**
 * @openapi
 * /ai/analyze-bid:
 *   post:
 *     summary: AI proposal bid analysis and match scoring
 *     tags: [AI]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [projectDescription, proposalText]
 *             properties:
 *               projectDescription: { type: string }
 *               proposalText: { type: string }
 *     responses:
 *       200:
 *         description: Match score and recommendations.
 */
router.post('/analyze-bid', protect, analyzeBid);

/**
 * @openapi
 * /ai/recommend-freelancers:
 *   post:
 *     summary: AI freelancer recommendation algorithm for a project
 *     tags: [AI]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [projectId]
 *             properties:
 *               projectId: { type: string }
 *     responses:
 *       200:
 *         description: Recommended freelancer list.
 */
router.post('/recommend-freelancers', protect, recommendFreelancersController);

export default router;
