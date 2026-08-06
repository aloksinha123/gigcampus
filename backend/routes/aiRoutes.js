import express from 'express';
import { improveDescription } from '../controllers/aiController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// POST /api/ai/improve-description
router.post('/improve-description', protect, improveDescription);

export default router;
