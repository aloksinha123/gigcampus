import Bid from '../models/Bid.js';
import Project from '../models/Project.js';
import User from '../models/User.js';
import { createNotification } from './notificationController.js';
import { sendNewBidReceivedEmail } from '../services/emailService.js';

// @desc    Submit a bid
// @route   POST /api/bids
// @access  Private (Freelancer)
export const submitBid = async (req, res) => {
    try {
        let { project, proposal, price, bidAmount, timeline, deliverables } = req.body;

        // Map bidAmount to price if price is not provided
        if (bidAmount && !price) {
            price = bidAmount;
        }

        // Map deliveryTime to timeline if timeline is not provided
        if (req.body.deliveryTime && !timeline) {
            timeline = req.body.deliveryTime;
        }

        // Check if project exists and is open
        const projectDoc = await Project.findById(project);
        if (!projectDoc) {
            return res.status(404).json({ message: 'Project not found' });
        }

        if (projectDoc.status !== 'open') {
            return res.status(400).json({ message: 'Project is not accepting bids' });
        }

        // Check if user already bid on this project
        const existingBid = await Bid.findOne({
            project,
            freelancer: req.user._id
        });

        if (existingBid) {
            return res.status(400).json({ message: 'You have already bid on this project' });
        }

        // Create bid
        const bid = await Bid.create({
            project,
            freelancer: req.user._id,
            proposal,
            price,
            timeline,
            deliverables
        });

        // Update project bids count
        await Project.findByIdAndUpdate(project, {
            $inc: { bidsCount: 1 }
        });

        // Create notification for project owner
        await createNotification(
            projectDoc.client,
            'bid',
            `New bid received for project "${projectDoc.title}" from ${req.user.username}`,
            {
                project: projectDoc._id,
                relatedUser: req.user._id,
                bidId: bid._id
            }
        );

        // Send New Bid Received HTML Email to Project Owner (Non-blocking: Bid creation succeeds even if SMTP fails)
        try {
            const clientUser = await User.findById(projectDoc.client);
            if (clientUser && clientUser.email) {
                const studentEmail = clientUser.email;
                const studentName = clientUser.username || clientUser.profile?.name || 'Student';
                const freelancerName = req.user.username || req.user.profile?.name || 'Freelancer';

                await sendNewBidReceivedEmail({
                    studentEmail,
                    studentName,
                    projectTitle: projectDoc.title,
                    freelancerName,
                    bidAmount: price,
                    deliveryDays: timeline,
                    proposalMessage: proposal,
                    projectId: projectDoc._id
                });
            }
        } catch (emailErr) {
            console.error('⚠️ New bid email dispatch failed:', emailErr.message);
        }

        const populatedBid = await Bid.findById(bid._id)
            .populate('freelancer', 'username profile reputation');

        res.status(201).json(populatedBid);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get bids for a project
// @route   GET /api/bids/project/:projectId
// @access  Private (Project owner or admin)
export const getProjectBids = async (req, res) => {
    try {
        const project = await Project.findById(req.params.projectId);

        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        // Determine query based on role
        let query = { project: req.params.projectId };

        if (project.client.toString() === req.user._id.toString() || req.user.role === 'admin') {
            // Owner/Admin sees all bids
        } else if (req.user.role === 'freelancer') {
            // Freelancer only sees their own bid
            query.freelancer = req.user._id;
        } else {
            return res.status(403).json({ message: 'Not authorized to view bids' });
        }

        const bids = await Bid.find(query)
            .populate('freelancer', 'username profile reputation')
            .sort({ createdAt: -1 });

        res.json(bids);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get freelancer's bids
// @route   GET /api/bids/my
// @access  Private (Freelancer)
export const getMyBids = async (req, res) => {
    try {
        const bids = await Bid.find({ freelancer: req.user._id })
            .populate('project')
            .populate({
                path: 'project',
                populate: {
                    path: 'client',
                    select: 'username profile.avatar'
                }
            })
            .sort({ createdAt: -1 });

        res.json(bids);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update bid
// @route   PUT /api/bids/:id
// @access  Private (Bid owner)
export const updateBid = async (req, res) => {
    try {
        const bid = await Bid.findById(req.params.id);

        if (!bid) {
            return res.status(404).json({ message: 'Bid not found' });
        }

        // Check ownership
        if (bid.freelancer.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to update this bid' });
        }

        // Can only update pending bids
        if (bid.status !== 'pending') {
            return res.status(400).json({ message: 'Cannot update bid in current status' });
        }

        Object.assign(bid, req.body);
        const updatedBid = await bid.save();

        res.json(updatedBid);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Withdraw bid
// @route   DELETE /api/bids/:id
// @access  Private (Bid owner)
export const withdrawBid = async (req, res) => {
    try {
        const bid = await Bid.findById(req.params.id);

        if (!bid) {
            return res.status(404).json({ message: 'Bid not found' });
        }

        // Check ownership
        if (bid.freelancer.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to withdraw this bid' });
        }

        // Can only withdraw pending bids
        if (bid.status !== 'pending') {
            return res.status(400).json({ message: 'Cannot withdraw bid in current status' });
        }

        bid.status = 'withdrawn';
        await bid.save();

        // Decrement project bids count
        await Project.findByIdAndUpdate(bid.project, {
            $inc: { bidsCount: -1 }
        });

        res.json({ message: 'Bid withdrawn successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
