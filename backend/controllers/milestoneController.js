import Milestone from '../models/Milestone.js';
import Project from '../models/Project.js';
import Bid from '../models/Bid.js';
import { releaseMilestonePayment } from '../services/milestoneService.js';
import { logActivity } from '../services/activityService.js';
import { createNotification } from './notificationController.js';

/**
 * Helper to calculate accepted project amount
 */
const getAcceptedProjectAmount = async (project) => {
    if (project.selectedBid) {
        const bid = await Bid.findById(project.selectedBid);
        if (bid) return Number(bid.price || bid.bidAmount || 0);
    }
    return Number(project.budget?.max || project.budget?.min || 0);
};

// @desc    Create new milestone
// @route   POST /api/milestones
// @access  Private (Student only, project owner)
export const createMilestone = async (req, res) => {
    try {
        const { projectId, title, description, amount, dueDate, order } = req.body;

        if (!projectId || !title || !amount) {
            return res.status(400).json({
                success: false,
                message: 'projectId, title, and amount are required.'
            });
        }

        const numAmount = Number(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Milestone amount must be a positive number greater than 0.'
            });
        }

        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found.'
            });
        }

        // Verify project ownership
        if (project.client.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Forbidden: Only the project owner can create milestones.'
            });
        }

        if (!project.freelancer) {
            return res.status(400).json({
                success: false,
                message: 'Cannot create milestone: No freelancer has been assigned to this project yet.'
            });
        }

        // Check milestone sum vs project accepted amount
        const acceptedAmount = await getAcceptedProjectAmount(project);
        const existingMilestones = await Milestone.find({ project: projectId });
        const currentSum = existingMilestones.reduce((acc, m) => acc + Number(m.amount || 0), 0);

        if (acceptedAmount > 0 && (currentSum + numAmount) > acceptedAmount) {
            return res.status(400).json({
                success: false,
                message: `Total milestone amount (₹${currentSum + numAmount}) exceeds project accepted budget (₹${acceptedAmount}).`
            });
        }

        const milestoneCount = existingMilestones.length;
        const milestone = await Milestone.create({
            project: projectId,
            student: req.user._id,
            freelancer: project.freelancer,
            title: title.trim(),
            description: description ? description.trim() : '',
            amount: numAmount,
            dueDate: dueDate ? new Date(dueDate) : undefined,
            order: order ? Number(order) : milestoneCount + 1,
            status: 'pending'
        });

        // Activity timeline
        logActivity({
            project: project._id,
            user: req.user._id,
            action: 'MILESTONE_CREATED',
            description: `Milestone created: "${milestone.title}" (₹${numAmount})`
        });

        // Notification
        try {
            await createNotification(
                project.freelancer,
                'project',
                `New milestone created for project "${project.title}": "${milestone.title}" (₹${numAmount}).`,
                { project: project._id, milestone: milestone._id }
            );
        } catch (notifErr) {
            console.warn('Notification failed:', notifErr.message);
        }

        return res.status(201).json({
            success: true,
            milestone
        });
    } catch (error) {
        console.error('Create Milestone Error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to create milestone.'
        });
    }
};

// @desc    Get project milestones
// @route   GET /api/milestones/project/:projectId
// @access  Private (Student + Assigned Freelancer only)
export const getProjectMilestones = async (req, res) => {
    try {
        const { projectId } = req.params;

        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found.'
            });
        }

        const userId = req.user._id.toString();
        const isClient = project.client.toString() === userId;
        const isFreelancer = project.freelancer && project.freelancer.toString() === userId;
        const isAdmin = req.user.role === 'admin';

        if (!isClient && !isFreelancer && !isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Forbidden: You do not have permission to view milestones for this project.'
            });
        }

        const milestones = await Milestone.find({ project: projectId }).sort({ order: 1, createdAt: 1 });

        return res.status(200).json({
            success: true,
            milestones
        });
    } catch (error) {
        console.error('Get Milestones Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve milestones.'
        });
    }
};

// @desc    Update milestone (Pending only)
// @route   PUT /api/milestones/:id
// @access  Private (Student only)
export const updateMilestone = async (req, res) => {
    try {
        const milestone = await Milestone.findById(req.params.id);
        if (!milestone) {
            return res.status(404).json({
                success: false,
                message: 'Milestone not found.'
            });
        }

        if (milestone.student.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Forbidden: You are not authorized to edit this milestone.'
            });
        }

        if (milestone.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Invalid transition: Only pending milestones can be updated.'
            });
        }

        const { title, description, amount, dueDate, order } = req.body;

        if (amount !== undefined) {
            const numAmount = Number(amount);
            if (isNaN(numAmount) || numAmount <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Milestone amount must be a positive number.'
                });
            }

            const project = await Project.findById(milestone.project);
            if (project) {
                const acceptedAmount = await getAcceptedProjectAmount(project);
                const existingMilestones = await Milestone.find({ project: milestone.project, _id: { $ne: milestone._id } });
                const otherSum = existingMilestones.reduce((acc, m) => acc + Number(m.amount || 0), 0);

                if (acceptedAmount > 0 && (otherSum + numAmount) > acceptedAmount) {
                    return res.status(400).json({
                        success: false,
                        message: `Total milestone amount (₹${otherSum + numAmount}) exceeds project accepted budget (₹${acceptedAmount}).`
                    });
                }
            }
            milestone.amount = numAmount;
        }

        if (title) milestone.title = title.trim();
        if (description !== undefined) milestone.description = description.trim();
        if (dueDate) milestone.dueDate = new Date(dueDate);
        if (order !== undefined) milestone.order = Number(order);

        await milestone.save();

        return res.status(200).json({
            success: true,
            milestone
        });
    } catch (error) {
        console.error('Update Milestone Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to update milestone.'
        });
    }
};

// @desc    Delete milestone (Pending only)
// @route   DELETE /api/milestones/:id
// @access  Private (Student only)
export const deleteMilestone = async (req, res) => {
    try {
        const milestone = await Milestone.findById(req.params.id);
        if (!milestone) {
            return res.status(404).json({
                success: false,
                message: 'Milestone not found.'
            });
        }

        if (milestone.student.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Forbidden: You are not authorized to delete this milestone.'
            });
        }

        if (milestone.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Invalid transition: Only pending milestones can be deleted.'
            });
        }

        await milestone.deleteOne();

        return res.status(200).json({
            success: true,
            message: 'Milestone deleted successfully.'
        });
    } catch (error) {
        console.error('Delete Milestone Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to delete milestone.'
        });
    }
};

// @desc    Submit milestone deliverable
// @route   PUT /api/milestones/:id/submit
// @access  Private (Freelancer only)
export const submitMilestone = async (req, res) => {
    try {
        const { deliverableUrl, feedback } = req.body;

        if (!deliverableUrl || typeof deliverableUrl !== 'string' || !deliverableUrl.trim()) {
            return res.status(400).json({
                success: false,
                message: 'deliverableUrl is required for submitting milestone.'
            });
        }

        const milestone = await Milestone.findById(req.params.id);
        if (!milestone) {
            return res.status(404).json({
                success: false,
                message: 'Milestone not found.'
            });
        }

        if (milestone.freelancer.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Forbidden: Only the assigned freelancer can submit this milestone.'
            });
        }

        // Allowed status transition: pending -> submitted OR rejected -> submitted
        if (milestone.status !== 'pending' && milestone.status !== 'rejected') {
            return res.status(400).json({
                success: false,
                message: `Invalid status transition: Cannot submit milestone with current status "${milestone.status}".`
            });
        }

        milestone.status = 'submitted';
        milestone.submittedAt = new Date();
        milestone.deliverableUrl = deliverableUrl.trim();
        if (feedback) milestone.feedback = feedback.trim();

        await milestone.save();

        // Activity timeline
        logActivity({
            project: milestone.project,
            user: req.user._id,
            action: 'MILESTONE_SUBMITTED',
            description: `Milestone submitted: "${milestone.title}"`
        });

        // Notification to Student
        try {
            await createNotification(
                milestone.student,
                'project',
                `Freelancer submitted deliverable for milestone "${milestone.title}".`,
                { project: milestone.project, milestone: milestone._id }
            );
        } catch (notifErr) {
            console.warn('Notification failed:', notifErr.message);
        }

        return res.status(200).json({
            success: true,
            milestone
        });
    } catch (error) {
        console.error('Submit Milestone Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to submit milestone.'
        });
    }
};

// @desc    Approve milestone & release payment
// @route   PUT /api/milestones/:id/approve
// @access  Private (Student only)
export const approveMilestone = async (req, res) => {
    try {
        const milestone = await Milestone.findById(req.params.id);
        if (!milestone) {
            return res.status(404).json({
                success: false,
                message: 'Milestone not found.'
            });
        }

        if (milestone.student.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Forbidden: Only the project owner can approve this milestone.'
            });
        }

        // Allowed transition: submitted -> approved/released
        if (milestone.status !== 'submitted') {
            return res.status(400).json({
                success: false,
                message: `Invalid status transition: Milestone must be in "submitted" status to approve. Current status: "${milestone.status}".`
            });
        }

        const result = await releaseMilestonePayment(milestone, req.user);

        return res.status(200).json({
            success: true,
            message: 'Milestone approved and payment released successfully.',
            milestone: result.milestone,
            payment: result.payment,
            transaction: result.transaction,
            projectCompleted: result.projectCompleted
        });
    } catch (error) {
        console.error('Approve Milestone Error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to approve milestone.'
        });
    }
};

// @desc    Reject milestone
// @route   PUT /api/milestones/:id/reject
// @access  Private (Student only)
export const rejectMilestone = async (req, res) => {
    try {
        const { feedback } = req.body;

        if (!feedback || typeof feedback !== 'string' || !feedback.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Rejection feedback reason is required.'
            });
        }

        const milestone = await Milestone.findById(req.params.id);
        if (!milestone) {
            return res.status(404).json({
                success: false,
                message: 'Milestone not found.'
            });
        }

        if (milestone.student.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Forbidden: Only the project owner can reject this milestone.'
            });
        }

        if (milestone.status !== 'submitted') {
            return res.status(400).json({
                success: false,
                message: `Invalid status transition: Only submitted milestones can be rejected. Current status: "${milestone.status}".`
            });
        }

        milestone.status = 'rejected';
        milestone.feedback = feedback.trim();
        await milestone.save();

        // Activity timeline
        logActivity({
            project: milestone.project,
            user: req.user._id,
            action: 'MILESTONE_REJECTED',
            description: `Milestone rejected: "${milestone.title}" (Reason: ${feedback.trim()})`
        });

        // Notification to Freelancer
        try {
            await createNotification(
                milestone.freelancer,
                'project',
                `Milestone "${milestone.title}" was rejected by client. Feedback: "${feedback.trim()}".`,
                { project: milestone.project, milestone: milestone._id }
            );
        } catch (notifErr) {
            console.warn('Notification failed:', notifErr.message);
        }

        return res.status(200).json({
            success: true,
            milestone
        });
    } catch (error) {
        console.error('Reject Milestone Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to reject milestone.'
        });
    }
};

export default {
    createMilestone,
    getProjectMilestones,
    updateMilestone,
    deleteMilestone,
    submitMilestone,
    approveMilestone,
    rejectMilestone
};
