import express from 'express';
import {
    getWalletBalance,
    getWalletTransactions,
    withdrawFunds,
    depositFunds
} from '../controllers/walletController.js';
import { protect, freelancer } from '../middleware/auth.js';

const router = express.Router();

/**
 * @openapi
 * /wallet/balance:
 *   get:
 *     summary: Get user wallet balance
 *     tags: [Payments]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Current wallet balance.
 */
router.get('/balance', protect, getWalletBalance);

/**
 * @openapi
 * /wallet/transactions:
 *   get:
 *     summary: Get wallet transaction ledger history
 *     tags: [Payments]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List of wallet transactions.
 */
router.get('/transactions', protect, getWalletTransactions);

/**
 * @openapi
 * /wallet/withdraw:
 *   post:
 *     summary: Request earnings withdrawal to bank account (Freelancer only)
 *     tags: [Payments]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount]
 *             properties:
 *               amount: { type: number, example: 200 }
 *     responses:
 *       200:
 *         description: Withdrawal requested.
 */
router.post('/withdraw', protect, freelancer, withdrawFunds);

/**
 * @openapi
 * /wallet/deposit:
 *   post:
 *     summary: Deposit funds into wallet
 *     tags: [Payments]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount]
 *             properties:
 *               amount: { type: number, example: 500 }
 *     responses:
 *       200:
 *         description: Deposit processed.
 */
router.post('/deposit', protect, depositFunds);

export default router;
