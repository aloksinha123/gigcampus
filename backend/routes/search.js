import express from 'express';
import {
    searchProjects,
    searchFreelancers,
    getSearchSuggestions,
    getSearchHistory,
    addSearchHistory,
    clearSearchHistory,
    saveFilter,
    getSavedFilters,
    deleteSavedFilter
} from '../controllers/searchController.js';
import { protect } from '../middleware/auth.js';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();

// Self-contained optional auth middleware for search matching
const optionalProtect = async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = await User.findById(decoded.id).select('-password');
        } catch (error) {
            console.warn('Optional auth token validation skipped:', error.message);
        }
    }
    next();
};

/**
 * @swagger
 * /api/v1/search/projects:
 *   get:
 *     summary: Advanced project search with filters and intelligent sorting
 *     tags: [Search]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search keyword
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Project category filter
 *       - in: query
 *         name: minBudget
 *         schema:
 *           type: number
 *         description: Minimum budget limit
 *       - in: query
 *         name: maxBudget
 *         schema:
 *           type: number
 *         description: Maximum budget limit
 *       - in: query
 *         name: experienceLevel
 *         schema:
 *           type: string
 *           enum: [entry, intermediate, expert]
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest, highestBudget, lowestBudget, mostBids, aiRecommended]
 *     responses:
 *       200:
 *         description: Projects list returned successfully
 */
router.get('/projects', optionalProtect, searchProjects);

/**
 * @swagger
 * /api/v1/search/freelancers:
 *   get:
 *     summary: Advanced freelancer search with filters and ratings sorting
 *     tags: [Search]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search keyword (username, biography details)
 *       - in: query
 *         name: skills
 *         schema:
 *           type: string
 *         description: Comma separated list of skills
 *       - in: query
 *         name: rating
 *         schema:
 *           type: number
 *         description: Minimum rating threshold
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [highestRating, mostProjects, mostReviews, newest, aiMatchScore]
 *     responses:
 *       200:
 *         description: Freelancers list returned successfully
 */
router.get('/freelancers', optionalProtect, searchFreelancers);

/**
 * @swagger
 * /api/v1/search/suggestions:
 *   get:
 *     summary: Get live search suggestions and auto-complete matches
 *     tags: [Search]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Suggestions array returned successfully
 */
router.get('/suggestions', getSearchSuggestions);

/**
 * @swagger
 * /api/v1/search/history:
 *   get:
 *     summary: Get authenticated user search history
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: History retrieved successfully
 *   post:
 *     summary: Add query to search history
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - query
 *             properties:
 *               query:
 *                 type: string
 *     responses:
 *       201:
 *         description: Added to history successfully
 *   delete:
 *     summary: Clear user search history
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: History cleared successfully
 */
router.route('/history')
    .get(protect, getSearchHistory)
    .post(protect, addSearchHistory)
    .delete(protect, clearSearchHistory);

/**
 * @swagger
 * /api/v1/search/saved-filters:
 *   get:
 *     summary: Get authenticated user saved filters
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Saved filters list
 *   post:
 *     summary: Save a custom search filter combination
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - type
 *               - filters
 *             properties:
 *               name:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [projects, freelancers]
 *               filters:
 *                 type: object
 *     responses:
 *       201:
 *         description: Filter saved successfully
 */
router.post('/save-filter', protect, saveFilter);
router.get('/saved-filters', protect, getSavedFilters);

/**
 * @swagger
 * /api/v1/search/saved-filters/{id}:
 *   delete:
 *     summary: Delete a saved filter combination
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Filter deleted successfully
 */
router.delete('/saved-filters/:id', protect, deleteSavedFilter);

export default router;
