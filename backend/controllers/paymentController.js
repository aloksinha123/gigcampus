import Payment from '../models/Payment.js';
import Project from '../models/Project.js';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import { createNotification } from './notificationController.js';

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
            return res.status(400).json({ message: 'Payment already exists for this project' });
        }

        // Create payment
        const payment = await Payment.create({
            project,
            client: req.user._id,
            freelancer: projectDoc.freelancer,
            amount,
            paymentMethod,
            status: 'escrowed',
            escrowedAt: new Date(),
            transactionId: `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        });

        res.status(201).json(payment);
    } catch (error) {
        res.status(500).json({ message: error.message });
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
        if (payment.client.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to release this payment.'
            });
        }

        // Validation: If payment status is not escrowed, return HTTP 400 (Prevents duplicate payment releases)
        if (payment.status !== 'escrowed') {
            return res.status(400).json({
                success: false,
                message: 'Payment is not in escrowed status or has already been released.'
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

        if (project.status !== 'in_progress') {
            return res.status(400).json({
                success: false,
                message: 'Project must be in progress to release payment.'
            });
        }

        const escrowAmount = payment.amount;

        // Step 5: Calculate Platform Commission (10%) and Freelancer Net Payout (90%)
        const platformCommissionRate = 0.10;
        const platformCommission = escrowAmount * platformCommissionRate;
        const freelancerAmount = escrowAmount - platformCommission;
        const freelancerId = payment.freelancer;

        // Step 6: Credit Freelancer Wallet using atomic MongoDB update ($inc)
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

        // Step 7: Create Transaction record (type: 'payment_received')
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

        // Step 8: Update Payment record (status: 'released')
        payment.status = 'released';
        payment.releasedAt = new Date();
        payment.platformCommission = platformCommission;
        payment.freelancerAmount = freelancerAmount;
        await payment.save();

        // Step 9: Update Project record (status: 'completed')
        project.status = 'completed';
        project.completedAt = new Date();
        await payment.save();
        await project.save();

        // Step 10: Send Notifications to Client and Freelancer
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

        // Step 11: Return Success Response
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
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to release payment.'
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

        // Check payment status
        if (payment.status === 'released') {
            return res.status(400).json({ message: 'Payment already released, cannot refund' });
        }

        payment.status = 'refunded';
        payment.refundedAt = new Date();
        payment.notes = req.body.reason || 'Refund requested';
        await payment.save();

        // Update project status
        await Project.findByIdAndUpdate(payment.project, {
            status: 'cancelled'
        });

        res.json(payment);
    } catch (error) {
        res.status(500).json({ message: error.message });
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
            payment.freelancer.toString() === req.user._id.toString();

        if (!isInvolved) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        payment.status = 'disputed';
        payment.notes = req.body.reason || 'Payment disputed';
        await payment.save();

        // Update project status
        await Project.findByIdAndUpdate(payment.project, {
            status: 'disputed'
        });

        res.json(payment);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get payment by project
// @route   GET /api/payments/project/:projectId
// @access  Private
export const getPaymentByProject = async (req, res) => {
    try {
        const payment = await Payment.findOne({ project: req.params.projectId })
            .populate('client', 'username email')
            .populate('freelancer', 'username email')
            .populate('project');

        if (!payment) {
            return res.status(404).json({ message: 'Payment not found' });
        }

        // Verify user is involved
        const isInvolved =
            payment.client._id.toString() === req.user._id.toString() ||
            payment.freelancer._id.toString() === req.user._id.toString() ||
            req.user.role === 'admin';

        if (!isInvolved) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        res.json(payment);
    } catch (error) {
        res.status(500).json({ message: error.message });
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
            .populate('project', 'title')
            .populate('client', 'username')
            .populate('freelancer', 'username')
            .sort({ createdAt: -1 });

        res.json(payments);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
