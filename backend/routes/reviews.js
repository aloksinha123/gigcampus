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

router.post('/', protect, submitReview);
router.get('/my', protect, getMyReviews);
router.get('/user/:userId', getUserReviews);
router.get('/project/:projectId', getProjectReviews);
router.put('/:id/respond', protect, respondToReview);

export default router;
