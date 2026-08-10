import Payment from '../models/Payment.js';
import Project from '../models/Project.js';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import { createNotification } from './notificationController.js';
import { sendProjectCompletedEmail, sendPayoutStatusEmail } from '../services/emailService.js';
import { recordFraudSignal } from '../services/fraudDetectionService.js';

/**
 * Utility helper for structured payment logging
 */
const logPaymentEvent = (event, req, details) => {
    const requestId = req.requestId || 'N/A';
    const userId = req.user?._id ? req.user._id.toString() : 'Unauthenticated';
    const timestamp = new Date().toISOString();

    console.log(`
[PAYMENT LOG - ${event}]
Request ID: ${requestId}
User: ${userId}
Payment ID: ${details.paymentId || 'N/A'}
Razorpay Order ID: ${details.razorpayOrderId || 'N/A'}
Timestamp: ${timestamp}
Details: ${JSON.stringify(details)}
`);
};

// @desc    Create payment (escrow funds)
// @route   POST /api/payments
// @access  Private (Client)
export const createPayment = async (req, res) => {
    try {
        const { project, amount, paymentMethod } = req.body;

        // Verify project
        const projectDoc = await Project.findById(project);
        if (!projectDoc) {
            return res.status(404).json({ message: 'Project not found' });
        }

        // Verify user is client
        if (projectDoc.client.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        // Check if payment already exists
        const existingPayment = await Payment.findOne({ project });
        if (existingPayment) {
            await recordFraudSignal(req.user._id, 'DUPLICATE_PAYMENT', req, {
                project,
                amount,
                reason: 'Attempted duplicate payment creation for project'
            });
            return res.status(400).json({ message: 'Payment already exists for this project' });
        }

        // Create payment
        const payment = await Payment.create({
            project,
            client: req.user._id,
            freelancer: projectDoc.freelancer,
            amount,
            paymentMethod: paymentMethod || 'razorpay',
            status: 'escrowed',
            escrowedAt: new Date(),
            transactionId: `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timeline: [
                {
                    status: 'CREATED',
                    message: 'Payment initialized',
                    timestamp: new Date()
                },
                {
                    status: 'escrowed',
                    message: `₹${amount} held in escrow`,
                    timestamp: new Date()
                }
            ]
        });

        logPaymentEvent('ESCROW CREATED', req, { paymentId: payment._id.toString(), amount });

        res.status(201).json(payment);
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};

// @desc    Release escrow payment to freelancer wallet
// @route   PUT /api/payments/:id/release
// @access  Private (Client only)
export const releasePayment = async (req, res) => {
    try {
        const payment = await Payment.findById(req.params.id);

        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'Payment not found.'
            });
        }

        // Verify user is client
        if (payment.client.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to release this payment.'
            });
        }

        // Validation: Prevent duplicate payment releases
        if (payment.status === 'released' || payment.status === 'SUCCESS' && payment.releasedAt) {
            return res.status(400).json({
                success: false,
                message: 'Payment has already been released.'
            });
        }

        // Verify associated project status == in_progress
        const project = await Project.findById(payment.project);
        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Associated project not found.'
            });
        }

        const escrowAmount = payment.amount;

        // Calculate Platform Commission (10%) and Freelancer Net Payout (90%)
        const platformCommissionRate = 0.10;
        const platformCommission = escrowAmount * platformCommissionRate;
        const freelancerAmount = escrowAmount - platformCommission;
        const freelancerId = payment.freelancer;

        // Credit Freelancer Wallet
        const updatedFreelancer = await User.findByIdAndUpdate(
            freelancerId,
            {
                $inc: {
                    'wallet.balance': freelancerAmount,
                    'reputation.completedProjects': 1
                }
            },
            { new: true }
        );

        if (!updatedFreelancer) {
            return res.status(400).json({
                success: false,
                message: 'Freelancer account not found.'
            });
        }

        const freelancerUpdatedBalance = updatedFreelancer.wallet?.balance || freelancerAmount;

        // Create Transaction record
        const transactionId = `REL-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`.toUpperCase();
        const transaction = await Transaction.create({
            user: freelancerId,
            type: 'payment_received',
            amount: freelancerAmount,
            platformCommission: platformCommission,
            balanceAfter: freelancerUpdatedBalance,
            project: project._id,
            payment: payment._id,
            status: 'completed',
            description: `Payment received for project: ${project.title} (₹${freelancerAmount.toFixed(2)} after 10% platform fee)`,
            transactionId: transactionId
        });

        // Update Payment record
        payment.status = 'released';
        payment.releasedAt = new Date();
        payment.platformCommission = platformCommission;
        payment.freelancerAmount = freelancerAmount;
        payment.timeline.push({
            status: 'released',
            message: `Funds released to freelancer wallet (₹${freelancerAmount.toFixed(2)})`,
            timestamp: new Date()
        });
        await payment.save();

        // Update Project record
        project.status = 'completed';
        project.completedAt = new Date();
        await project.save();

        // Send Notifications
        try {
            await createNotification(
                req.user._id,
                'payment',
                `Payment of ₹${escrowAmount.toFixed(2)} released successfully for project "${project.title}".`,
                { project: project._id, payment: payment._id }
            );

            await createNotification(
                freelancerId,
                'payment',
                `Payment of ₹${freelancerAmount.toFixed(2)} has been credited to your wallet for project "${project.title}".`,
                { project: project._id, payment: payment._id }
            );
        } catch (notifyErr) {
            console.warn('Notification failed:', notifyErr.message);
        }

        // Send email notifications (non-blocking)
        try {
            // A. Project completed email to Client
            await sendProjectCompletedEmail({
                recipientEmail: req.user.email,
                recipientName: req.user.username,
                projectTitle: project.title,
                partnerName: updatedFreelancer.username,
                amount: escrowAmount,
                projectId: project._id,
                requestId: `complete-client-${project._id}`
            });

            // B. Project completed email to Freelancer
            await sendProjectCompletedEmail({
                recipientEmail: updatedFreelancer.email,
                recipientName: updatedFreelancer.username,
                projectTitle: project.title,
                partnerName: req.user.username,
                amount: escrowAmount,
                projectId: project._id,
                requestId: `complete-free-${project._id}`
            });

            // C. Payout processed email to Freelancer
            await sendPayoutStatusEmail({
                recipientEmail: updatedFreelancer.email,
                recipientName: updatedFreelancer.username,
                amount: escrowAmount,
                fee: platformCommission,
                netAmount: freelancerAmount,
                transactionId: transactionId,
                projectTitle: project.title,
                requestId: `payout-${transactionId}`
            });
        } catch (emailErr) {
            console.error('⚠️ Escrow release emails dispatch failed:', emailErr.message);
        }

        logPaymentEvent('FUNDS RELEASED', req, {
            paymentId: payment._id.toString(),
            freelancerId: freelancerId.toString(),
            amount: freelancerAmount
        });

        return res.status(200).json({
            success: true,
            message: 'Payment released successfully.',
            payment,
            project,
            transaction,
            freelancerAmount,
            platformCommission
        });
    } catch (error) {
        logPaymentEvent('RELEASE FAILURE', req, { error: error.message });
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// @desc    Request refund
// @route   PUT /api/payments/:id/refund
// @access  Private (Client or Admin)
export const requestRefund = async (req, res) => {
    try {
        const payment = await Payment.findById(req.params.id);

        if (!payment) {
            return res.status(404).json({ message: 'Payment not found' });
        }

        // Verify user is client or admin
        const isAuthorized =
            payment.client.toString() === req.user._id.toString() ||
            req.user.role === 'admin';

        if (!isAuthorized) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        if (payment.status === 'released') {
            return res.status(400).json({ message: 'Payment already released, cannot refund' });
        }

        payment.status = 'REFUNDED';
        payment.refundedAt = new Date();
        payment.notes = req.body.reason || 'Refund requested';
        payment.timeline.push({
            status: 'REFUNDED',
            message: `Refund processed: ${req.body.reason || 'Refund issued'}`,
            timestamp: new Date()
        });
        await payment.save();

        if (payment.project) {
            await Project.findByIdAndUpdate(payment.project, {
                status: 'cancelled'
            });
        }

        logPaymentEvent('REFUND PROCESSED', req, {
            paymentId: payment._id.toString(),
            amount: payment.amount
        });

        res.json({ success: true, payment });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};

// @desc    Mark payment as disputed
// @route   PUT /api/payments/:id/dispute
// @access  Private
export const disputePayment = async (req, res) => {
    try {
        const payment = await Payment.findById(req.params.id);

        if (!payment) {
            return res.status(404).json({ message: 'Payment not found' });
        }

        // Verify user is involved
        const isInvolved =
            payment.client.toString() === req.user._id.toString() ||
            payment.freelancer.toString() === req.user._id.toString() ||
            req.user.role === 'admin';

        if (!isInvolved) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        payment.status = 'disputed';
        payment.notes = req.body.reason || 'Payment disputed';
        payment.timeline.push({
            status: 'disputed',
            message: `Dispute opened: ${req.body.reason || 'Payment disputed'}`,
            timestamp: new Date()
        });
        await payment.save();

        if (payment.project) {
            await Project.findByIdAndUpdate(payment.project, {
                status: 'disputed'
            });
        }

        logPaymentEvent('DISPUTE OPENED', req, {
            paymentId: payment._id.toString(),
            reason: req.body.reason
        });

        res.json({ success: true, payment });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};

// @desc    Get payment by project
// @route   GET /api/payments/project/:projectId
// @access  Private
export const getPaymentByProject = async (req, res) => {
    try {
        // First, verify the project exists and user is authorized
        const project = await Project.findById(req.params.projectId);

        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        // Authorization: only project client, assigned freelancer, or admin can access payment info
        const isClient = project.client.toString() === req.user._id.toString();
        const isFreelancer = project.freelancer && project.freelancer.toString() === req.user._id.toString();
        const isAdmin = req.user.role === 'admin';

        if (!isClient && !isFreelancer && !isAdmin) {
            return res.status(403).json({ message: 'Not authorized to access payment information for this project' });
        }

        const payment = await Payment.findOne({ project: req.params.projectId })
            .populate('client', 'username email profile.fullName')
            .populate('freelancer', 'username email profile.fullName')
            .populate('project');

        if (!payment) {
            return res.status(404).json({ message: 'Payment not found' });
        }

        res.json({ success: true, payment });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};

// @desc    Get user's payment history
// @route   GET /api/payments/my
// @access  Private
export const getMyPayments = async (req, res) => {
    try {
        const query = req.user.role === 'freelancer'
            ? { freelancer: req.user._id }
            : { client: req.user._id };

        const payments = await Payment.find(query)
            .populate('project', 'title budget status')
            .populate('client', 'username email profile.fullName')
            .populate('freelancer', 'username email profile.fullName')
            .sort({ createdAt: -1 });

        res.json({ success: true, count: payments.length, payments });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};
