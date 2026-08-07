import express from 'express';
import {
    addPortfolioItem,
    getUserPortfolio,
    getPortfolioItem,
    updatePortfolioItem,
    deletePortfolioItem,
    toggleFeatured,
    likePortfolioItem,
    getMyPortfolio,
    browsePortfolios
} from '../controllers/portfolioController.js';
import { protect } from '../middleware/auth.js';
import { uploadMultiple } from '../middleware/upload.js';

const router = express.Router();

/**
 * @openapi
 * /portfolio:
 *   get:
 *     summary: Browse public freelancer portfolios
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: List of portfolio showcase items.
 *   post:
 *     summary: Create a portfolio showcase item
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [title, description]
 *             properties:
 *               title: { type: string }
 *               description: { type: string }
 *               category: { type: string }
 *               projectUrl: { type: string }
 *     responses:
 *       201:
 *         description: Portfolio item created.
 */
router.route('/')
    .get(browsePortfolios)
    .post(protect, uploadMultiple, addPortfolioItem);

/**
 * @openapi
 * /portfolio/my:
 *   get:
 *     summary: Get logged-in user portfolio items
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: User portfolio list.
 */
router.get('/my', protect, getMyPortfolio);

/**
 * @openapi
 * /portfolio/user/{userId}:
 *   get:
 *     summary: Get portfolio items of a specific user
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Target user portfolio list.
 */
router.get('/user/:userId', getUserPortfolio);

/**
 * @openapi
 * /portfolio/{id}:
 *   get:
 *     summary: Get single portfolio item details
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Portfolio item.
 *   put:
 *     summary: Update portfolio item
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Portfolio item updated.
 *   delete:
 *     summary: Delete portfolio item
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Portfolio item deleted.
 */
router.route('/:id')
    .get(getPortfolioItem)
    .put(protect, uploadMultiple, updatePortfolioItem)
    .delete(protect, deletePortfolioItem);

/**
 * @openapi
 * /portfolio/{id}/feature:
 *   put:
 *     summary: Toggle featured status of a portfolio item
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Featured status toggled.
 */
router.put('/:id/feature', protect, toggleFeatured);

/**
 * @openapi
 * /portfolio/{id}/like:
 *   put:
 *     summary: Like a portfolio item
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Portfolio item liked.
 */
router.put('/:id/like', protect, likePortfolioItem);

export default router;
