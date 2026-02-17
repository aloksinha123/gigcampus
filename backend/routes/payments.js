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

router.post('/', protect, student, createPayment);
router.get('/my', protect, getMyPayments);
router.get('/project/:projectId', protect, getPaymentByProject);

router.put('/:id/release', protect, student, releasePayment);
router.put('/:id/refund', protect, requestRefund);
router.put('/:id/dispute', protect, disputePayment);

export default router;
