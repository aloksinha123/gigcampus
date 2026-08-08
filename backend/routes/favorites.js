import express from 'express';
import {
    bookmarkProject,
    unbookmarkProject,
    getBookmarkedProjects,
    favoriteFreelancer,
    unfavoriteFreelancer,
    getFavoriteFreelancers
} from '../controllers/favoriteController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

/**
 * @swagger
 * /api/v1/favorites/projects:
 *   get:
 *     summary: Retrieve authenticated user bookmarked projects
 *     tags: [Favorites]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Bookmarks list
 */
router.get('/projects', protect, getBookmarkedProjects);

/**
 * @swagger
 * /api/v1/favorites/projects/{projectId}:
 *   post:
 *     summary: Bookmark a project
 *     tags: [Favorites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: Bookmarked successfully
 *   delete:
 *     summary: Remove project bookmark
 *     tags: [Favorites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Bookmark removed successfully
 */
router.route('/projects/:projectId')
    .post(protect, bookmarkProject)
    .delete(protect, unbookmarkProject);

/**
 * @swagger
 * /api/v1/favorites/freelancers:
 *   get:
 *     summary: Retrieve authenticated user favorite freelancers
 *     tags: [Favorites]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Favorites list
 */
router.get('/freelancers', protect, getFavoriteFreelancers);

/**
 * @swagger
 * /api/v1/favorites/freelancers/{freelancerId}:
 *   post:
 *     summary: Favorite a freelancer profile
 *     tags: [Favorites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: freelancerId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: Added to favorites successfully
 *   delete:
 *     summary: Remove freelancer from favorites
 *     tags: [Favorites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: freelancerId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Favorite removed successfully
 */
router.route('/freelancers/:freelancerId')
    .post(protect, favoriteFreelancer)
    .delete(protect, unfavoriteFreelancer);

export default router;
