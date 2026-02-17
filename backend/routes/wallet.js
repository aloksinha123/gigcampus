import express from 'express';
import {
    getWalletBalance,
    getWalletTransactions,
    withdrawFunds,
    depositFunds
} from '../controllers/walletController.js';
import { protect, freelancer } from '../middleware/auth.js';

const router = express.Router();

router.get('/balance', protect, getWalletBalance);
router.get('/transactions', protect, getWalletTransactions);
router.post('/withdraw', protect, freelancer, withdrawFunds);
router.post('/deposit', protect, depositFunds);

export default router;
