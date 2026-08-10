import Project from '../models/Project.js';
import Bid from '../models/Bid.js';
import User from '../models/User.js';
import Payment from '../models/Payment.js';
import Transaction from '../models/Transaction.js';
import Activity from '../models/Activity.js';
import Notification from '../models/Notification.js';
import { createNotification } from './notificationController.js';
import { sendBidAcceptedEmail, sendBidRejectedEmail } from '../services/emailService.js';
import { logActivity } from '../services/activityService.js';

// @desc    Create new project
// @route   POST /api/projects
// @access  Private (Student/Client)
export const createProject = async (req, res) => {
    try {
        // Whitelist allowed fields to prevent mass assignment
        const { title, description, category, budget, timeline, deadline, requirements, skills, experienceLevel, attachments } = req.body;
        const project = await Project.create({
            title,
            description,
            category,
            budget,
            timeline,
            deadline,
            requirements,
            skills,
            experienceLevel,
            attachments,
            client: req.user._id
        });

        // Log PROJECT_CREATED Activity Event
        await logActivity({
            project: project._id,
            user: req.user._id,
            action: 'PROJECT_CREATED',
            description: `Project "${project.title}" was created`,
            metadata: { budget: project.budget, category: project.category }
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

        // Whitelist allowed fields to prevent mass assignment
        const { title, description, category, budget, timeline, deadline, requirements, skills, experienceLevel, attachments } = req.body;
        if (title !== undefined) project.title = title;
        if (description !== undefined) project.description = description;
        if (category !== undefined) project.category = category;
        if (budget !== undefined) project.budget = budget;
        if (timeline !== undefined) project.timeline = timeline;
        if (deadline !== undefined) project.deadline = deadline;
        if (requirements !== undefined) project.requirements = requirements;
        if (skills !== undefined) project.skills = skills;
        if (experienceLevel !== undefined) project.experienceLevel = experienceLevel;
        if (attachments !== undefined) project.attachments = attachments;
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

        // Fetch details of other bids before rejecting
        const otherBids = await Bid.find({ project: project._id, _id: { $ne: bid._id } }).populate('freelancer', 'username email');

        // Reject other bids
        await Bid.updateMany(
            { project: project._id, _id: { $ne: bid._id } },
            { status: 'rejected' }
        );

        // Send Bid Rejected Emails to other freelancers (non-blocking)
        for (const otherBid of otherBids) {
            try {
                if (otherBid.freelancer?.email) {
                    await sendBidRejectedEmail({
                        freelancerEmail: otherBid.freelancer.email,
                        freelancerName: otherBid.freelancer.username || 'Freelancer',
                        projectTitle: project.title,
                        bidAmount: otherBid.price,
                        projectId: project._id,
                        requestId: `reject-bid-${otherBid._id}`
                    });
                }
            } catch (rejectErr) {
                console.error(`⚠️ Bid rejection email dispatch failed for bid ${otherBid._id}:`, rejectErr.message);
            }
        }

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

        // Log BID_ACCEPTED and ESCROW_CREATED Activity Events
        await logActivity({
            project: project._id,
            user: req.user._id,
            action: 'BID_ACCEPTED',
            description: `Accepted bid proposal from freelancer`,
            metadata: { bidId: bid._id, freelancerId }
        });

        await logActivity({
            project: project._id,
            user: req.user._id,
            action: 'ESCROW_CREATED',
            description: `Escrow payment of ₹${bidAmount} created and funds held in escrow`,
            metadata: { amount: bidAmount, paymentId: payment._id }
        });

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
                    projectId: project._id,
                    requestId: `accept-bid-${bid._id}`
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

        if (project.status !== 'in_progress' && project.status !== 'completed') {
            return res.status(400).json({
                success: false,
                message: 'Project must be in progress to complete'
            });
        }

        // If project was already auto-completed by milestone service, return success gracefully
        if (project.status === 'completed') {
            return res.status(200).json({
                success: true,
                alreadyCompleted: true,
                message: 'Project was already completed (all milestones released).',
                project
            });
        }

        // Find active escrow payment — accept both 'escrowed' and 'SUCCESS' statuses
        const payment = await Payment.findOne({
            project: project._id,
            status: { $in: ['escrowed', 'SUCCESS'] }
        });
        if (!payment) {
            return res.status(400).json({
                success: false,
                message: 'No active escrowed payment found for this project.'
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

        // Log PAYMENT_RELEASED and PROJECT_COMPLETED Activity Events
        await logActivity({
            project: project._id,
            user: req.user._id,
            action: 'PAYMENT_RELEASED',
            description: `Released escrow payment of ₹${freelancerAmount.toFixed(2)} to freelancer`,
            metadata: { freelancerAmount, platformCommission }
        });

        await logActivity({
            project: project._id,
            user: req.user._id,
            action: 'PROJECT_COMPLETED',
            description: `Marked project as completed`,
            metadata: { completedAt: project.completedAt }
        });

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

        // Log DELIVERABLE_SUBMITTED Activity Event
        await logActivity({
            project: project._id,
            user: req.user._id,
            action: 'DELIVERABLE_SUBMITTED',
            description: `Submitted deliverable: "${title || 'Work submission'}"`,
            metadata: { title, filesCount: files?.length || 0 }
        });

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

// @desc    Get project activity timeline
// @route   GET /api/projects/:id/timeline
// @access  Private (Student, Freelancer, Admin)
export const getProjectTimeline = async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);

        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        // Step 7 Validation: Only users involved in the project (Client, Freelancer, Admin) can view timeline
        const isClient = project.client.toString() === req.user._id.toString();
        const isFreelancer = project.freelancer && project.freelancer.toString() === req.user._id.toString();
        const isAdmin = req.user.role === 'admin';

        if (!isClient && !isFreelancer && !isAdmin) {
            return res.status(403).json({ message: 'Not authorized to view project timeline' });
        }

        const activities = await Activity.find({ project: req.params.id })
            .populate('user', 'username profile.fullName profile.avatar')
            .sort({ createdAt: -1 });

        return res.json(activities);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// @desc    Invite a freelancer to bid/apply on a project
// @route   POST /api/v1/projects/:id/invite
// @access  Private (Project Client / Owner)
export const inviteFreelancerToProject = async (req, res) => {
    try {
        const { freelancerId } = req.body;
        const projectId = req.params.id;

        if (!freelancerId) {
            return res.status(400).json({ success: false, message: 'freelancerId is required.' });
        }

        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found.' });
        }

        // Authorization check: only project client owner or admin
        if (project.client.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Only project owner can invite freelancers.' });
        }

        const freelancer = await User.findById(freelancerId);
        if (!freelancer) {
            return res.status(404).json({ success: false, message: 'Target freelancer not found.' });
        }

        const clientName = req.user.profile?.fullName || req.user.username || 'Client';

        // Create Real MongoDB Notification for target freelancer
        const notification = await Notification.create({
            user: freelancer._id,
            type: 'project',
            message: `✉️ Invitation Received! ${clientName} invited you to bid on project: "${project.title}"`,
            project: project._id,
            relatedUser: req.user._id
        });

        // Real-time Socket Notification
        const io = req.app.get('socketio');
        if (io) {
            io.to(freelancer._id.toString()).emit('newNotification', notification);
        }

        // Log Activity Event
        await logActivity({
            project: project._id,
            user: req.user._id,
            action: 'FREELANCER_INVITED',
            description: `Invited freelancer ${freelancer.profile?.fullName || freelancer.username} to bid on project`,
            metadata: { freelancerId: freelancer._id }
        });

        return res.status(200).json({
            success: true,
            message: `Invitation successfully sent to ${freelancer.profile?.fullName || freelancer.username}!`,
            notification
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};
