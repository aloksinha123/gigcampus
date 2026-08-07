import express from 'express';
import {
    createPayment,
    releasePayment,
    requestRefund,
    disputePayment,
    getPaymentByProject,
    getMyPayments
} from '../controllers/paymentController.js';
import { protect, student, admin } from '../middleware/auth.js';

const router = express.Router();

/**
 * @openapi
 * /payments:
 *   post:
 *     summary: Deposit escrow payment for project (Student only)
 *     tags: [Payments]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [projectId, amount]
 *             properties:
 *               projectId: { type: string }
 *               amount: { type: number, example: 500 }
 *     responses:
 *       201:
 *         description: Escrow payment created and held.
 */
router.post('/', protect, student, createPayment);

/**
 * @openapi
 * /payments/my:
 *   get:
 *     summary: Get all payment history for logged-in user
 *     tags: [Payments]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List of payments.
 */
router.get('/my', protect, getMyPayments);

/**
 * @openapi
 * /payments/project/{projectId}:
 *   get:
 *     summary: Get escrow payment status for a project
 *     tags: [Payments]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Payment object.
 */
router.get('/project/:projectId', protect, getPaymentByProject);

/**
 * @openapi
 * /payments/{id}/release:
 *   put:
 *     summary: Release escrow funds to freelancer (Student only)
 *     tags: [Payments]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Escrow funds released to freelancer wallet.
 */
router.put('/:id/release', protect, student, releasePayment);

/**
 * @openapi
 * /payments/{id}/refund:
 *   put:
 *     summary: Request refund on held payment
 *     tags: [Payments]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Refund requested.
 */
router.put('/:id/refund', protect, requestRefund);

/**
 * @openapi
 * /payments/{id}/dispute:
 *   put:
 *     summary: Open a payment dispute for admin resolution
 *     tags: [Payments]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Payment dispute created.
 */
router.put('/:id/dispute', protect, disputePayment);

export default router;
