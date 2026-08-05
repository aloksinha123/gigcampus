import Payment from '../models/Payment.js';
import Project from '../models/Project.js';
import User from '../models/User.js';

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

// @desc    Release payment to freelancer
// @route   PUT /api/payments/:id/release
// @access  Private (Client)
export const releasePayment = async (req, res) => {
    try {
        const payment = await Payment.findById(req.params.id);

        if (!payment) {
            return res.status(404).json({ message: 'Payment not found' });
        }

        // Verify user is client
        if (payment.client.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        // Check payment status
        if (payment.status !== 'escrowed') {
            return res.status(400).json({ message: 'Payment cannot be released in current status' });
        }

        // Calculate amounts if not already set
        if (!payment.platformCommission || !payment.freelancerAmount) {
            const platformCommissionRate = 0.10; // 10% commission
            payment.platformCommission = payment.amount * platformCommissionRate;
            payment.freelancerAmount = payment.amount - payment.platformCommission;
        }

        // Transfer funds to freelancer's wallet
        await User.findByIdAndUpdate(payment.freelancer, {
            $inc: { 'wallet.balance': payment.freelancerAmount }
        });

        // Release payment
        payment.status = 'released';
        payment.releasedAt = new Date();
        await payment.save();

        // Update project status to completed if not already
        await Project.findByIdAndUpdate(payment.project, {
            status: 'completed',
            completedAt: new Date()
        });

        // Update freelancer's completed projects count
        await User.findByIdAndUpdate(payment.freelancer, {
            $inc: { 'reputation.completedProjects': 1 }
        });

        res.json({
            payment,
            message: `Payment released successfully. ₹${payment.freelancerAmount.toFixed(2)} transferred to freelancer's wallet.`
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
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

