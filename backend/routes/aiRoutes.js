import express from 'express';
import { improveDescription, analyzeBid, recommendFreelancersController } from '../controllers/aiController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// POST /api/ai/improve-description
router.post('/improve-description', protect, improveDescription);

// POST /api/ai/analyze-bid
router.post('/analyze-bid', protect, analyzeBid);

// POST /api/ai/recommend-freelancers
router.post('/recommend-freelancers', protect, recommendFreelancersController);

export default router;
