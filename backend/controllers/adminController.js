import User from '../models/User.js';
import Project from '../models/Project.js';
import Payment from '../models/Payment.js';
import Bid from '../models/Bid.js';

// ============ ANALYTICS ============
export const getAdminStats = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalStudents = await User.countDocuments({ role: 'student' });
        const totalFreelancers = await User.countDocuments({ role: 'freelancer' });
        const activeFreelancers = await User.countDocuments({ role: 'freelancer', isActive: true });

        const totalProjects = await Project.countDocuments();
        const openProjects = await Project.countDocuments({ status: 'open' });
        const activeProjects = await Project.countDocuments({ status: 'in_progress' });
        const completedProjects = await Project.countDocuments({ status: 'completed' });
        const disputedProjects = await Project.countDocuments({ status: 'disputed' });

        const payments = await Payment.find({ status: 'released' });
        const totalRevenue = payments.reduce((sum, p) => sum + (p.platformCommission || 0), 0);

        const recentUsers = await User.find().sort({ createdAt: -1 }).limit(5).select('username email role createdAt isActive');
        const recentProjects = await Project.find().sort({ createdAt: -1 }).limit(5).populate('client', 'username');

        res.json({
            stats: {
                totalUsers,
                totalStudents,
                totalFreelancers,
                activeFreelancers,
                totalProjects,
                openProjects,
                activeProjects,
                completedProjects,
                totalRevenue,
                disputes: disputedProjects
            },
            recentUsers,
            recentProjects
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ============ USER MANAGEMENT ============
export const getAllUsers = async (req, res) => {
    try {
        const { role, status, search, page = 1, limit = 20 } = req.query;

        let query = {};

        if (role) query.role = role;
        if (status === 'active') query.isActive = true;
        if (status === 'suspended') query.isActive = false;
        if (search) {
            query.$or = [
                { username: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        const users = await User.find(query)
            .select('-password')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const count = await User.countDocuments(query);

        res.json({
            users,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            total: count
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const suspendUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.isActive = false;
        await user.save();

        res.json({ message: 'User suspended successfully', user });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const activateUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.isActive = true;
        await user.save();

        res.json({ message: 'User activated successfully', user });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const verifyFreelancer = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.role !== 'freelancer') {
            return res.status(400).json({ message: 'User is not a freelancer' });
        }

        user.isVerified = true;
        await user.save();

        res.json({ message: 'Freelancer verified successfully', user });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ============ PROJECT MANAGEMENT ============
export const getAllProjects = async (req, res) => {
    try {
        const { status, search, page = 1, limit = 20 } = req.query;

        let query = {};

        if (status) query.status = status;
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        const projects = await Project.find(query)
            .populate('client', 'username email')
            .populate('freelancer', 'username email')
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

export const deleteProject = async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);

        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        // Only allow deletion of open or cancelled projects
        if (project.status === 'in_progress') {
            return res.status(400).json({ message: 'Cannot delete active projects. Resolve disputes first.' });
        }

        await Project.findByIdAndDelete(req.params.id);

        res.json({ message: 'Project deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ============ DISPUTE RESOLUTION ============
export const getDisputedProjects = async (req, res) => {
    try {
        const projects = await Project.find({ status: 'disputed' })
            .populate('client', 'username email wallet')
            .populate('freelancer', 'username email wallet')
            .populate('selectedBid')
            .sort({ updatedAt: -1 });

        res.json(projects);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const resolveDispute = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { decision, reason } = req.body; // decision: 'refund' or 'release'

        const project = await Project.findById(projectId)
            .populate('client')
            .populate('freelancer')
            .populate('selectedBid');

        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        if (project.status !== 'disputed') {
            return res.status(400).json({ message: 'Project is not in disputed status' });
        }

        const payment = await Payment.findOne({ project: projectId, status: 'escrowed' });

        if (!payment) {
            return res.status(404).json({ message: 'No escrowed payment found' });
        }

        if (decision === 'release') {
            // Release payment to freelancer
            const freelancerAmount = payment.amount - payment.platformCommission;

            project.freelancer.wallet.balance += freelancerAmount;
            await project.freelancer.save();

            payment.status = 'released';
            payment.releasedAt = new Date();
            await payment.save();

            project.status = 'completed';
            project.completedAt = new Date();
            await project.save();

            res.json({
                message: 'Dispute resolved. Payment released to freelancer.',
                decision: 'release',
                amount: freelancerAmount
            });

        } else if (decision === 'refund') {
            // Refund to student
            project.client.wallet.balance += payment.amount;
            await project.client.save();

            payment.status = 'refunded';
            await payment.save();

            project.status = 'cancelled';
            await project.save();

            res.json({
                message: 'Dispute resolved. Payment refunded to student.',
                decision: 'refund',
                amount: payment.amount
            });

        } else {
            return res.status(400).json({ message: 'Invalid decision. Use "release" or "refund"' });
        }

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ============ BID MONITORING ============
export const getAllBids = async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;

        let query = {};
        if (status) query.status = status;

        const bids = await Bid.find(query)
            .populate('project', 'title status')
            .populate('freelancer', 'username email')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const count = await Bid.countDocuments(query);

        res.json({
            bids,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            total: count
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
