import Milestone from '../models/Milestone.js';
import Project from '../models/Project.js';
import User from '../models/User.js';
import Payment from '../models/Payment.js';
import Transaction from '../models/Transaction.js';
import { createNotification } from '../controllers/notificationController.js';
import { logActivity } from './activityService.js';

/**
 * Releases milestone payment to freelancer upon milestone approval
 * @param {Object} milestone - Milestone document to release funds for
 * @param {Object} studentUser - Student (project owner) user object
 * @returns {Object} Result object containing updated milestone, payment, transaction, and project status
 */
export const releaseMilestonePayment = async (milestone, studentUser) => {
    const project = await Project.findById(milestone.project);
    if (!project) {
        throw new Error('Associated project not found');
    }

    const milestoneAmount = Number(milestone.amount);
    if (isNaN(milestoneAmount) || milestoneAmount <= 0) {
        throw new Error('Invalid milestone amount');
    }

    const freelancerId = milestone.freelancer;

    // Calculate Platform Commission (10%) and Freelancer Payout (90%)
    const platformCommissionRate = 0.10;
    const platformCommission = milestoneAmount * platformCommissionRate;
    const freelancerAmount = milestoneAmount - platformCommission;

    // Credit Freelancer Wallet atomically
    const updatedFreelancer = await User.findByIdAndUpdate(
        freelancerId,
        {
            $inc: {
                'wallet.balance': freelancerAmount
            }
        },
        { new: true }
    );

    if (!updatedFreelancer) {
        throw new Error('Freelancer user account not found');
    }

    const freelancerBalance = updatedFreelancer.wallet?.balance || freelancerAmount;

    // Create Payment record for milestone release
    const payment = await Payment.create({
        project: project._id,
        client: studentUser._id,
        freelancer: freelancerId,
        amount: milestoneAmount,
        platformCommission,
        freelancerAmount,
        status: 'released',
        escrowedAt: milestone.createdAt || new Date(),
        releasedAt: new Date(),
        transactionId: `MS-REL-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`.toUpperCase(),
        paymentMethod: 'wallet',
        notes: `Milestone Payment Released: ${milestone.title}`
    });

    // Create Transaction record
    const transaction = await Transaction.create({
        user: freelancerId,
        type: 'payment_received',
        amount: freelancerAmount,
        balanceAfter: freelancerBalance,
        status: 'completed',
        project: project._id,
        payment: payment._id,
        description: `Milestone payment received for "${milestone.title}": ₹${freelancerAmount.toFixed(2)} (after 10% platform fee)`,
        transactionId: `MS-TXN-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`.toUpperCase()
    });

    // Update Milestone status to released
    milestone.status = 'released';
    milestone.approvedAt = new Date();
    milestone.releasedAt = new Date();
    await milestone.save();

    // Check if ALL milestones for this project are released
    const allMilestones = await Milestone.find({ project: project._id });
    const allReleased = allMilestones.length > 0 && allMilestones.every(m => m.status === 'released');

    if (allReleased && project.status === 'in_progress') {
        project.status = 'completed';
        project.completedAt = new Date();
        await project.save();

        // Increment freelancer completedProjects count
        await User.findByIdAndUpdate(freelancerId, {
            $inc: { 'reputation.completedProjects': 1 }
        });

        logActivity({
            project: project._id,
            user: studentUser._id,
            action: 'PROJECT_COMPLETED',
            description: `Project "${project.title}" completed after all milestones were released.`
        });
    }

    // Timeline Activities
    logActivity({
        project: project._id,
        user: studentUser._id,
        action: 'MILESTONE_APPROVED',
        description: `Milestone approved: "${milestone.title}"`
    });

    logActivity({
        project: project._id,
        user: studentUser._id,
        action: 'MILESTONE_PAYMENT_RELEASED',
        description: `Milestone payment of ₹${milestoneAmount} released for "${milestone.title}"`
    });

    // Notifications
    try {
        await createNotification(
            freelancerId,
            'payment',
            `Milestone "${milestone.title}" approved! Payment of ₹${freelancerAmount.toFixed(2)} credited to your wallet.`,
            { project: project._id, milestone: milestone._id }
        );

        await createNotification(
            studentUser._id,
            'payment',
            `Milestone "${milestone.title}" approved and ₹${milestoneAmount} payment released.`,
            { project: project._id, milestone: milestone._id }
        );
    } catch (notifErr) {
        console.warn('⚠️ Milestone notification failed (non-blocking):', notifErr.message);
    }

    return {
        milestone,
        payment,
        transaction,
        freelancerAmount,
        platformCommission,
        projectCompleted: allReleased
    };
};

export default {
    releaseMilestonePayment
};
