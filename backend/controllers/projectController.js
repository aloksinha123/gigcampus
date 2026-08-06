import Project from '../models/Project.js';
import Bid from '../models/Bid.js';
import User from '../models/User.js';
import Payment from '../models/Payment.js';
import Transaction from '../models/Transaction.js';
import { createNotification } from './notificationController.js';
import { sendBidAcceptedEmail } from '../services/emailService.js';

// @desc    Create new project
// @route   POST /api/projects
// @access  Private (Student/Client)
export const createProject = async (req, res) => {
    try {
        const project = await Project.create({
            ...req.body,
            client: req.user._id
        });

        res.status(201).json(project);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all projects
// @route   GET /api/projects
// @access  Public
export const getProjects = async (req, res) => {
    try {
        const { category, status, search, minBudget, maxBudget, page = 1, limit = 10 } = req.query;

        const query = {};

        if (category) query.category = category;
        if (status) query.status = status;
        if (search) {
            query.$text = { $search: search };
        }
        if (minBudget || maxBudget) {
            query['budget.min'] = {};
            if (minBudget) query['budget.min'].$gte = Number(minBudget);
            if (maxBudget) query['budget.max'].$lte = Number(maxBudget);
        }

        const projects = await Project.find(query)
            .populate('client', 'username profile.avatar reputation')
            .populate('freelancer', 'username profile.avatar reputation')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const count = await Project.countDocuments(query);

        res.json({
            projects,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            total: count
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get single project
// @route   GET /api/projects/:id
// @access  Public
export const getProject = async (req, res) => {
    try {
        const project = await Project.findById(req.params.id)
            .populate('client', 'username email profile reputation')
            .populate('freelancer', 'username email profile reputation')
            .populate('selectedBid');

        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        res.json(project);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update project
// @route   PUT /api/projects/:id
// @access  Private (Owner only)
export const updateProject = async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);

        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        // Check ownership
        if (project.client.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to update this project' });
        }

        // Don't allow updates if project is in progress or completed
        if (project.status !== 'open') {
            return res.status(400).json({ message: 'Cannot update project in current status' });
        }

        Object.assign(project, req.body);
        const updatedProject = await project.save();

        res.json(updatedProject);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete project
// @route   DELETE /api/projects/:id
// @access  Private (Owner only)
export const deleteProject = async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);

        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        // Check ownership
        if (project.client.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to delete this project' });
        }

        // Don't allow deletion if project is in progress
        if (project.status === 'in_progress') {
            return res.status(400).json({ message: 'Cannot delete project in progress' });
        }

        await project.deleteOne();
        res.json({ message: 'Project deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get user's projects
// @route   GET /api/projects/my/all
// @access  Private
export const getMyProjects = async (req, res) => {
    try {
        const query = req.user.role === 'freelancer'
            ? { freelancer: req.user._id }
            : { client: req.user._id };

        const projects = await Project.find(query)
            .populate('client', 'username profile.avatar')
            .populate('freelancer', 'username profile.avatar')
            .sort({ createdAt: -1 });

        res.json(projects);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Accept bid and assign freelancer (Wallet -> Escrow Connection)
// @route   PUT /api/projects/:id/accept-bid/:bidId
// @access  Private (Owner only)
export const acceptBid = async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);
        const bid = await Bid.findById(req.params.bidId).populate('freelancer');

        if (!project || !bid) {
            return res.status(404).json({ message: 'Project or bid not found' });
        }

        // Check ownership
        if (project.client.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        // Check if project is still open
        if (project.status !== 'open') {
            return res.status(400).json({ message: 'Project is not open for bids' });
        }

        // Prevent duplicate escrow creation
        const existingPayment = await Payment.findOne({ project: project._id, status: 'escrowed' });
        if (existingPayment) {
            return res.status(400).json({
                success: false,
                message: 'Escrow payment already exists for this project.'
            });
        }

        const bidAmount = bid.price;

        // Step 1: Fetch client's latest wallet balance from MongoDB (Never trust frontend)
        const client = await User.findById(req.user._id);
        if (!client || !client.wallet || client.wallet.balance < bidAmount) {
            // Step 2: Return HTTP 400 if balance is insufficient (without modifying project status or creating escrow)
            return res.status(400).json({
                success: false,
                message: 'Insufficient wallet balance. Please add money to continue.'
            });
        }

        // Step 3: Atomic database deduction using $inc with atomic balance check ($gte: bidAmount)
        const updatedClient = await User.findOneAndUpdate(
            { _id: req.user._id, 'wallet.balance': { $gte: bidAmount } },
            { $inc: { 'wallet.balance': -bidAmount } },
            { new: true }
        );

        if (!updatedClient) {
            return res.status(400).json({
                success: false,
                message: 'Insufficient wallet balance. Please add money to continue.'
            });
        }

        // Step 4: Create Escrow Payment record
        const platformCommissionRate = 0.10; // 10% commission
        const platformCommission = bidAmount * platformCommissionRate;
        const freelancerAmount = bidAmount - platformCommission;
        const freelancerId = bid.freelancer._id || bid.freelancer;

        const payment = await Payment.create({
            project: project._id,
            client: req.user._id,
            freelancer: freelancerId,
            amount: bidAmount,
            platformCommission: platformCommission,
            freelancerAmount: freelancerAmount,
            status: 'escrowed',
            escrowedAt: new Date(),
            paymentMethod: 'wallet',
            transactionId: `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            notes: `Escrow payment for project: ${project.title}`
        });

        // Step 5: Create Transaction record
        const transaction = await Transaction.create({
            user: req.user._id,
            type: 'escrow_payment',
            amount: bidAmount,
            balanceAfter: updatedClient.wallet.balance,
            project: project._id,
            payment: payment._id,
            description: `Escrow payment for project: ${project.title}`,
            transactionId: payment.transactionId
        });

        // Step 6: Continue existing workflow (Update project status, assign freelancer, accept bid, reject remaining bids)
        project.selectedBid = bid._id;
        project.freelancer = freelancerId;
        project.status = 'in_progress';
        await project.save();

        bid.status = 'accepted';
        await bid.save();

        // Reject other bids
        await Bid.updateMany(
            { project: project._id, _id: { $ne: bid._id } },
            { status: 'rejected' }
        );

        // Create notification for freelancer
        await createNotification(
            freelancerId,
            'project',
            `Your bid for "${project.title}" has been accepted! You can now start working.`,
            {
                project: project._id,
                relatedUser: req.user._id,
                bidId: bid._id
            }
        );

        // Send Bid Accepted HTML Email to Freelancer (Non-blocking: Bid acceptance succeeds even if SMTP fails)
        try {
            const freelancerEmail = bid.freelancer?.email;
            const freelancerName = bid.freelancer?.username || bid.freelancer?.profile?.name || 'Freelancer';
            const studentName = req.user?.username || req.user?.profile?.name || 'Student';

            if (freelancerEmail) {
                await sendBidAcceptedEmail({
                    freelancerEmail,
                    freelancerName,
                    projectTitle: project.title,
                    bidAmount,
                    studentName,
                    projectId: project._id
                });
            }
        } catch (emailErr) {
            console.error('⚠️ Bid accepted email dispatch failed:', emailErr.message);
        }

        return res.json({
            success: true,
            project,
            bid,
            payment,
            transaction,
            walletBalance: updatedClient.wallet.balance,
            message: 'Bid accepted successfully. Payment has been escrowed.'
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// @desc    Mark project as completed and release escrow payment
// @route   PUT /api/projects/:id/complete
// @access  Private (Client only)
export const completeProject = async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);

        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

        if (project.client.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to complete this project'
            });
        }

        if (project.status !== 'in_progress') {
            return res.status(400).json({
                success: false,
                message: 'Project must be in progress to complete'
            });
        }

        // Find active escrow payment
        const payment = await Payment.findOne({ project: project._id, status: 'escrowed' });
        if (!payment) {
            return res.status(400).json({
                success: false,
                message: 'Payment is not in escrowed status or has already been released.'
            });
        }

        const escrowAmount = payment.amount;
        const platformCommissionRate = 0.10; // 10% platform fee
        const platformCommission = escrowAmount * platformCommissionRate;
        const freelancerAmount = escrowAmount - platformCommission;
        const freelancerId = payment.freelancer;

        // Atomic Wallet Credit for Freelancer using $inc
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

        const freelancerBalanceAfter = updatedFreelancer?.wallet?.balance || freelancerAmount;

        // Create Transaction record for freelancer
        const transactionId = `REL-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`.toUpperCase();
        const transaction = await Transaction.create({
            user: freelancerId,
            type: 'payment_received',
            amount: freelancerAmount,
            platformCommission: platformCommission,
            balanceAfter: freelancerBalanceAfter,
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
        await payment.save();

        // Update Project record
        project.status = 'completed';
        project.completedAt = new Date();
        await project.save();

        // Send Notifications to Client and Freelancer
        try {
            await createNotification(
                req.user._id,
                'payment',
                `Payment released successfully.`,
                { project: project._id, payment: payment._id }
            );

            await createNotification(
                freelancerId,
                'payment',
                `Payment has been credited to your wallet.`,
                { project: project._id, payment: payment._id }
            );
        } catch (notifyErr) {
            console.warn('Notification failed:', notifyErr.message);
        }

        return res.json({
            success: true,
            message: 'Payment released successfully.',
            project,
            payment,
            transaction
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// @desc    Submit a deliverable
// @route   POST /api/projects/:id/deliverable
// @access  Private (Freelancer)
export const submitDeliverable = async (req, res) => {
    try {
        const { title, description, files } = req.body;
        const project = await Project.findById(req.params.id);

        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        if (project.freelancer.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Only the assigned freelancer can submit deliverables' });
        }

        const deliverable = {
            freelancer: req.user._id,
            title,
            description,
            files: files || [],
            submittedAt: new Date(),
            status: 'submitted'
        };

        project.deliverables.push(deliverable);
        await project.save();

        // Notify client
        await createNotification(
            project.client,
            'project',
            `New deliverable submitted for "${project.title}" by ${req.user.username}`,
            { project: project._id, relatedUser: req.user._id }
        );

        res.status(201).json({ message: 'Deliverable submitted successfully', project });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Approve a deliverable
// @route   PUT /api/projects/:id/deliverable/:deliverableId/approve
// @access  Private (Client)
export const approveDeliverable = async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);

        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        if (project.client.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const deliverable = project.deliverables.id(req.params.deliverableId);
        if (!deliverable) {
            return res.status(404).json({ message: 'Deliverable not found' });
        }

        deliverable.status = 'approved';
        await project.save();

        // Notify freelancer
        await createNotification(
            project.freelancer,
            'project',
            `Your deliverable for "${project.title}" has been approved!`,
            { project: project._id, relatedUser: req.user._id }
        );

        res.json({ message: 'Deliverable approved', project });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Reject a bid
// @route   PUT /api/projects/:id/reject-bid/:bidId
// @access  Private (Client)
export const rejectBid = async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);
        const bid = await Bid.findById(req.params.bidId);

        if (!project || !bid) {
            return res.status(404).json({ message: 'Project or Bid not found' });
        }

        if (project.client.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        bid.status = 'rejected';
        await bid.save();

        res.json({ message: 'Bid rejected', bid });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Raise a dispute
// @route   PUT /api/projects/:id/dispute
// @access  Private (Client/Freelancer)
export const raiseDispute = async (req, res) => {
    try {
        const { reason } = req.body;
        const project = await Project.findById(req.params.id);

        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        // Only involved parties can dispute
        if (project.client.toString() !== req.user._id.toString() &&
            project.freelancer.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        project.status = 'disputed';
        await project.save();

        // Notify other party
        const otherPartyId = project.client.toString() === req.user._id.toString()
            ? project.freelancer
            : project.client;

        await createNotification(
            otherPartyId,
            'project',
            `A dispute has been raised for project "${project.title}". Admin will review.`,
            { project: project._id, relatedUser: req.user._id }
        );

        res.json({ message: 'Dispute raised successfully. Status set to disputed.', project });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
