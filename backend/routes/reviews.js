import express from 'express';
import {
    submitReview,
    getUserReviews,
    getProjectReviews,
    respondToReview,
    getMyReviews,
    deleteReview,
    toggleHideReview,
    getAllReviews,
    updateReview,
    markHelpful,
    unmarkHelpful,
    reportReview,
    getReportedReviews,
    dismissReports,
    regenerateSummary
} from '../controllers/reviewController.js';
import { protect, admin } from '../middleware/auth.js';

const router = express.Router();

/**
 * @openapi
 * /reviews:
 *   post:
 *     summary: Submit a project rating & review
 *     tags: [Reviews]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [project, reviewee, rating, review, communicationRating, qualityRating, deadlineRating, professionalismRating, wouldRecommend]
 *             properties:
 *               project: { type: string }
 *               reviewee: { type: string }
 *               rating: { type: number, minimum: 1, maximum: 5 }
 *               review: { type: string, minLength: 20, maxLength: 1000 }
 *               communicationRating: { type: number, minimum: 1, maximum: 5 }
 *               qualityRating: { type: number, minimum: 1, maximum: 5 }
 *               deadlineRating: { type: number, minimum: 1, maximum: 5 }
 *               professionalismRating: { type: number, minimum: 1, maximum: 5 }
 *               wouldRecommend: { type: boolean }
 *     responses:
 *       201:
 *         description: Review submitted.
 */
router.post('/', protect, submitReview);

/**
 * @openapi
 * /reviews:
 *   get:
 *     summary: Get all reviews for admin moderation (Admin only)
 *     tags: [Reviews]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: List of reviews.
 */
router.get('/', protect, admin, getAllReviews);

/**
 * @openapi
 * /reviews/reported:
 *   get:
 *     summary: Get reported reviews queue (Admin only)
 *     tags: [Reviews]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List of reported reviews.
 */
router.get('/reported', protect, admin, getReportedReviews);

/**
 * @openapi
 * /reviews/my:
 *   get:
 *     summary: Get reviews given and received by logged-in user
 *     tags: [Reviews]
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
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Reviews list.
 */
router.get('/user/:userId', getUserReviews);

/**
 * @openapi
 * /reviews/project/{projectId}:
 *   get:
 *     summary: Get reviews for a specific project
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: List of reviews for the project.
 */
router.get('/project/:projectId', getProjectReviews);

/**
 * @openapi
 * /reviews/{id}:
 *   put:
 *     summary: Update a review (Reviewer only)
 *     tags: [Reviews]
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
 *             properties:
 *               rating: { type: number }
 *               review: { type: string }
 *               communicationRating: { type: number }
 *               qualityRating: { type: number }
 *               deadlineRating: { type: number }
 *               professionalismRating: { type: number }
 *               wouldRecommend: { type: boolean }
 *     responses:
 *       200:
 *         description: Review updated.
 */
router.put('/:id', protect, updateReview);

/**
 * @openapi
 * /reviews/{id}/respond:
 *   put:
 *     summary: Respond to a review (Reviewee only)
 *     tags: [Reviews]
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
 *             properties:
 *               comment: { type: string }
 *               reply: { type: string }
 *     responses:
 *       200:
 *         description: Response added to review.
 */
router.put('/:id/respond', protect, respondToReview);
router.put('/:id/reply', protect, respondToReview);

/**
 * @openapi
 * /reviews/{reviewId}/helpful:
 *   post:
 *     summary: Mark review as helpful
 *     tags: [Reviews]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Helpful vote recorded.
 *   delete:
 *     summary: Remove helpful vote
 *     tags: [Reviews]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Helpful vote removed.
 */
router.post('/:reviewId/helpful', protect, markHelpful);
router.delete('/:reviewId/helpful', protect, unmarkHelpful);

/**
 * @openapi
 * /reviews/{reviewId}/report:
 *   post:
 *     summary: Report a review
 *     tags: [Reviews]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [reason]
 *             properties:
 *               reason: { type: string, enum: [Spam, Abusive Language, Fake Review, Harassment, Other] }
 *               description: { type: string }
 *     responses:
 *       201:
 *         description: Report submitted successfully.
 */
router.post('/:reviewId/report', protect, reportReview);

/**
 * @openapi
 * /reviews/{reviewId}/reports/dismiss:
 *   put:
 *     summary: Dismiss reports for a review (Admin only)
 *     tags: [Reviews]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Reports dismissed.
 */
router.put('/:reviewId/reports/dismiss', protect, admin, dismissReports);

/**
 * @openapi
 * /reviews/user/{userId}/summarize:
 *   post:
 *     summary: Manually regenerate AI reviews summary for a user
 *     tags: [Reviews]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: AI summary regenerated.
 */
router.post('/user/:userId/summarize', protect, regenerateSummary);

/**
 * @openapi
 * /reviews/{id}:
 *   delete:
 *     summary: Delete a review (Admin only)
 *     tags: [Reviews]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Review deleted.
 */
router.delete('/:id', protect, admin, deleteReview);

/**
 * @openapi
 * /reviews/{id}/hide:
 *   put:
 *     summary: Hide or unhide a review (Admin only)
 *     tags: [Reviews]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Review visibility toggled.
 */
router.put('/:id/hide', protect, admin, toggleHideReview);

export default router;
