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

router.route('/')
    .get(browsePortfolios)
    .post(protect, uploadMultiple, addPortfolioItem);

router.get('/my', protect, getMyPortfolio);
router.get('/user/:userId', getUserPortfolio);

router.route('/:id')
    .get(getPortfolioItem)
    .put(protect, uploadMultiple, updatePortfolioItem)
    .delete(protect, deletePortfolioItem);

router.put('/:id/feature', protect, toggleFeatured);
router.put('/:id/like', protect, likePortfolioItem);

export default router;
