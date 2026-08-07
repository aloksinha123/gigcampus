import express from 'express';
import {
    improveDescription,
    generateProposalController,
    analyzeBid,
    recommendFreelancersController
} from '../controllers/aiController.js';
import { protect, freelancer } from '../middleware/auth.js';

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
 * /ai/generate-proposal:
 *   post:
 *     summary: AI Proposal Generator for Freelancers (Google Gemini AI)
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
 *               projectId: { type: string, example: '66a1b2c3d4e5f67890987654' }
 *               tone: { type: string, enum: [professional, persuasive, concise], example: 'professional' }
 *     responses:
 *       200:
 *         description: Generated proposal text ready for editing & submission.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 proposal: { type: string, example: 'Hi there, I am excited to submit my proposal...' }
 */
router.post('/generate-proposal', protect, generateProposalController);

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
