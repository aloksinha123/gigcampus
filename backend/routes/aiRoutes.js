import express from 'express';
import {
    improveDescription,
    enhanceDescriptionController,
    generateProposalController,
    analyzeBid,
    analyzeProjectRiskController,
    recommendFreelancersController
} from '../controllers/aiController.js';
import { protect, student } from '../middleware/auth.js';
import { aiLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

/**
 * @openapi
 * /ai/enhance-description:
 *   post:
 *     summary: AI Project Description Enhancer (Google Gemini AI)
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
 *               title: { type: string, example: 'E-commerce Store' }
 *               description: { type: string, example: 'Need a shop website for selling clothes.' }
 *               category: { type: string, example: 'Web Development' }
 *               budget: { type: string, example: '15000' }
 *               timeline: { type: string, example: '14 Days' }
 *     responses:
 *       200:
 *         description: Enhanced project scope, title, recommended skills & complexity rating.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 enhancedTitle: { type: string }
 *                 enhancedDescription: { type: string }
 *                 recommendedSkills: { type: array, items: { type: string } }
 *                 estimatedComplexity: { type: string, enum: [Low, Medium, High] }
 */
router.post('/enhance-description', protect, aiLimiter, enhanceDescriptionController);

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
router.post('/improve-description', protect, aiLimiter, improveDescription);

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
router.post('/generate-proposal', protect, aiLimiter, generateProposalController);

/**
 * @openapi
 * /ai/analyze-bid:
 *   post:
 *     summary: AI Bid Quality Analyzer for Freelancers (Google Gemini AI)
 *     tags: [AI]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [proposal]
 *             properties:
 *               projectId: { type: string, example: '66a1b2c3d4e5f67890987654' }
 *               proposal: { type: string, example: 'I am an expert React developer with 5 years experience...' }
 *     responses:
 *       200:
 *         description: Proposal bid quality score, win chance, strengths, weaknesses, and actionable suggestions.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 score: { type: number, example: 91 }
 *                 estimatedWinChance: { type: string, enum: [Low, Medium, High], example: 'High' }
 *                 strengths: { type: array, items: { type: string } }
 *                 weaknesses: { type: array, items: { type: string } }
 *                 suggestions: { type: array, items: { type: string } }
 */
router.post('/analyze-bid', protect, aiLimiter, analyzeBid);

/**
 * @openapi
 * /ai/analyze-project-risk:
 *   post:
 *     summary: AI Project Risk & Complexity Analyzer for Clients (Google Gemini AI)
 *     tags: [AI]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, description]
 *             properties:
 *               title: { type: string, example: 'Nike Shoes E-Commerce Web Application' }
 *               description: { type: string, example: 'Fullstack store with cart & payments.' }
 *               budget: { type: number, example: 10000 }
 *               timeline: { type: string, example: '15 Days' }
 *               category: { type: string, example: 'Web Development' }
 *     responses:
 *       200:
 *         description: Project risk rating, complexity level, identified issues, and strategic recommendations.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 risk: { type: string, enum: [Low, Medium, High], example: 'Medium' }
 *                 estimatedComplexity: { type: string, enum: [Low, Medium, High], example: 'High' }
 *                 issues: { type: array, items: { type: string } }
 *                 recommendations: { type: array, items: { type: string } }
 */
router.post('/analyze-project-risk', protect, student, aiLimiter, analyzeProjectRiskController);

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
router.post('/recommend-freelancers', protect, aiLimiter, recommendFreelancersController);

export default router;
