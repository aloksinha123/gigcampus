import express from 'express';
import {
    submitReview,
    getUserReviews,
    getProjectReviews,
    respondToReview,
    getMyReviews
} from '../controllers/reviewController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

/**
 * @openapi
 * /reviews:
 *   post:
 *     summary: Submit a project rating & review
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [projectId, revieweeId, rating, comment]
 *             properties:
 *               projectId: { type: string }
 *               revieweeId: { type: string }
 *               rating: { type: number, minimum: 1, maximum: 5, example: 5 }
 *               comment: { type: string, example: 'Outstanding work and great communication!' }
 *     responses:
 *       201:
 *         description: Review submitted.
 */
router.post('/', protect, submitReview);

/**
 * @openapi
 * /reviews/my:
 *   get:
 *     summary: Get reviews received by logged-in user
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: User reviews list.
 */
router.get('/my', protect, getMyReviews);

/**
 * @openapi
 * /reviews/user/{userId}:
 *   get:
 *     summary: Get reviews for a specific user
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Target user reviews.
 */
router.get('/user/:userId', getUserReviews);

/**
 * @openapi
 * /reviews/project/{projectId}:
 *   get:
 *     summary: Get reviews associated with a project
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Project reviews list.
 */
router.get('/project/:projectId', getProjectReviews);

/**
 * @openapi
 * /reviews/{id}/respond:
 *   put:
 *     summary: Respond to a received review
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [response]
 *             properties:
 *               response: { type: string, example: 'Thank you for the positive feedback!' }
 *     responses:
 *       200:
 *         description: Response added to review.
 */
router.put('/:id/respond', protect, respondToReview);

export default router;
