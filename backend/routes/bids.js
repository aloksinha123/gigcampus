import express from 'express';
import {
    submitBid,
    getProjectBids,
    getMyBids,
    updateBid,
    withdrawBid
} from '../controllers/bidController.js';
import { protect, freelancer } from '../middleware/auth.js';

const router = express.Router();

router.post('/', protect, freelancer, submitBid);
router.get('/my', protect, freelancer, getMyBids);
router.get('/project/:projectId', protect, getProjectBids);

router.route('/:id')
    .put(protect, freelancer, updateBid)
    .delete(protect, freelancer, withdrawBid);

export default router;
