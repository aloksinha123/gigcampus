import express from 'express';
import {
    getWalletBalance,
    getWalletTransactions,
    withdrawFunds,
    depositFunds,
    saveBankDetails,
    getBankDetails,
    deleteBankDetails,
    getWithdrawalStatus
} from '../controllers/walletController.js';
import { protect, freelancer } from '../middleware/auth.js';

const router = express.Router();

/**
 * @openapi
 * /wallet/balance:
 *   get:
 *     summary: Get user wallet balance and bank details
 *     tags: [Wallet]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Current wallet balance, pending withdrawal, and bank details.
 */
router.get('/balance', protect, getWalletBalance);

/**
 * @openapi
 * /wallet/transactions:
 *   get:
 *     summary: Get wallet transaction ledger history
 *     tags: [Wallet]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List of wallet transactions.
 */
router.get('/transactions', protect, getWalletTransactions);

/**
 * @openapi
 * /wallet/bank-details:
 *   get:
 *     summary: Get saved bank/UPI details (masked)
 *     tags: [Wallet]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Saved bank or UPI details.
 *   post:
 *     summary: Save or update bank account / UPI ID for withdrawals
 *     tags: [Wallet]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [mode]
 *             properties:
 *               mode: { type: string, enum: [NEFT, UPI, RTGS, IMPS] }
 *               accountHolderName: { type: string }
 *               accountNumber: { type: string }
 *               ifscCode: { type: string }
 *               bankName: { type: string }
 *               upiId: { type: string }
 *     responses:
 *       200:
 *         description: Bank details saved and fund account created.
 *   delete:
 *     summary: Remove saved bank / UPI details
 *     tags: [Wallet]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Bank details removed.
 */
router.get('/bank-details', protect, getBankDetails);
router.post('/bank-details', protect, saveBankDetails);
router.delete('/bank-details', protect, deleteBankDetails);

/**
 * @openapi
 * /wallet/withdraw:
 *   post:
 *     summary: Initiate real Razorpay Payout to bank/UPI (Freelancer only)
 *     tags: [Wallet]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount]
 *             properties:
 *               amount: { type: number, minimum: 100, example: 500 }
 *     responses:
 *       200:
 *         description: Withdrawal initiated via Razorpay Payouts.
 */
router.post('/withdraw', protect, withdrawFunds);

/**
 * @openapi
 * /wallet/withdrawal/{id}/status:
 *   get:
 *     summary: Poll live status of a specific withdrawal payout
 *     tags: [Wallet]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Live payout status from Razorpay.
 */
router.get('/withdrawal/:id/status', protect, getWithdrawalStatus);

/**
 * @openapi
 * /wallet/deposit:
 *   post:
 *     summary: Deposit funds into wallet after Razorpay payment verification
 *     tags: [Wallet]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [razorpay_order_id, razorpay_payment_id, razorpay_signature]
 *             properties:
 *               razorpay_order_id: { type: string }
 *               razorpay_payment_id: { type: string }
 *               razorpay_signature: { type: string }
 *     responses:
 *       200:
 *         description: Deposit processed after verification.
 *       400:
 *         description: Missing verification parameters or payment not captured.
 *       409:
 *         description: Payment already processed (duplicate).
 */
router.post('/deposit', protect, depositFunds);

export default router;
