import ProjectFavorite from '../models/ProjectFavorite.js';
import FreelancerFavorite from '../models/FreelancerFavorite.js';
import Project from '../models/Project.js';
import User from '../models/User.js';

// Logging helper for audits
const logFavoriteActivity = ({ userId, action, entityId, execTimeMs, resultsCount, requestId }) => {
    console.log(`
[FAVORITES AUDIT LOG]
Request ID: ${requestId || 'N/A'}
User ID: ${userId || 'Anonymous'}
Action: ${action}
Entity ID: ${entityId || 'N/A'}
Recommendation Request: false
Execution Time: ${execTimeMs}ms
Result Count: ${resultsCount}
Timestamp: ${new Date().toISOString()}
`);
};

// @desc    Bookmark a project
// @route   POST /api/v1/favorites/projects/:projectId
// @access  Private
export const bookmarkProject = async (req, res) => {
    const startTime = Date.now();
    try {
        const { projectId } = req.params;

        // Verify project exists
        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ message: 'Project not found.' });
        }

        // Check if duplicate bookmark
        const existing = await ProjectFavorite.findOne({ user: req.user._id, project: projectId });
        if (existing) {
            return res.status(409).json({ message: 'Project already bookmarked.' });
        }

        await ProjectFavorite.create({
            user: req.user._id,
            project: projectId
        });

        const execTime = Date.now() - startTime;
        logFavoriteActivity({
            userId: req.user._id,
            action: 'BOOKMARK_PROJECT',
            entityId: projectId,
            execTimeMs: execTime,
            resultsCount: 1,
            requestId: req.requestId
        });

        res.status(201).json({ bookmarked: true, message: 'Project bookmarked successfully.' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Remove bookmark from project
// @route   DELETE /api/v1/favorites/projects/:projectId
// @access  Private
export const unbookmarkProject = async (req, res) => {
    const startTime = Date.now();
    try {
        const { projectId } = req.params;

        const deleted = await ProjectFavorite.findOneAndDelete({ user: req.user._id, project: projectId });
        if (!deleted) {
            return res.status(404).json({ message: 'Bookmark not found.' });
        }

        const execTime = Date.now() - startTime;
        logFavoriteActivity({
            userId: req.user._id,
            action: 'UNBOOKMARK_PROJECT',
            entityId: projectId,
            execTimeMs: execTime,
            resultsCount: 1,
            requestId: req.requestId
        });

        res.json({ bookmarked: false, message: 'Bookmark removed successfully.' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Get user's bookmarked projects
// @route   GET /api/v1/favorites/projects
// @access  Private
export const getBookmarkedProjects = async (req, res) => {
    const startTime = Date.now();
    try {
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const total = await ProjectFavorite.countDocuments({ user: req.user._id });
        const bookmarks = await ProjectFavorite.find({ user: req.user._id })
            .populate({
                path: 'project',
                populate: {
                    path: 'client',
                    select: 'username profile.location'
                }
            })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const projectList = bookmarks.map(b => b.project).filter(Boolean);

        const execTime = Date.now() - startTime;
        logFavoriteActivity({
            userId: req.user._id,
            action: 'GET_BOOKMARKS',
            execTimeMs: execTime,
            resultsCount: projectList.length,
            requestId: req.requestId
        });

        res.json({
            projects: projectList,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Favorite a freelancer
// @route   POST /api/v1/favorites/freelancers/:freelancerId
// @access  Private
export const favoriteFreelancer = async (req, res) => {
    const startTime = Date.now();
    try {
        const { freelancerId } = req.params;

        // Prevent self-favoriting
        if (req.user._id.toString() === freelancerId.toString()) {
            return res.status(400).json({ message: 'You cannot favorite your own profile.' });
        }

        // Verify freelancer exists and has role freelancer
        const freelancer = await User.findOne({ _id: freelancerId, role: 'freelancer' });
        if (!freelancer) {
            return res.status(404).json({ message: 'Freelancer profile not found.' });
        }

        // Check if duplicate favorite
        const existing = await FreelancerFavorite.findOne({ user: req.user._id, freelancer: freelancerId });
        if (existing) {
            return res.status(409).json({ message: 'Freelancer already in favorites list.' });
        }

        await FreelancerFavorite.create({
            user: req.user._id,
            freelancer: freelancerId
        });

        const execTime = Date.now() - startTime;
        logFavoriteActivity({
            userId: req.user._id,
            action: 'FAVORITE_FREELANCER',
            entityId: freelancerId,
            execTimeMs: execTime,
            resultsCount: 1,
            requestId: req.requestId
        });

        res.status(201).json({ favorited: true, message: 'Freelancer added to favorites successfully.' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Remove freelancer from favorites
// @route   DELETE /api/v1/favorites/freelancers/:freelancerId
// @access  Private
export const unfavoriteFreelancer = async (req, res) => {
    const startTime = Date.now();
    try {
        const { freelancerId } = req.params;

        const deleted = await FreelancerFavorite.findOneAndDelete({ user: req.user._id, freelancer: freelancerId });
        if (!deleted) {
            return res.status(404).json({ message: 'Favorite entry not found.' });
        }

        const execTime = Date.now() - startTime;
        logFavoriteActivity({
            userId: req.user._id,
            action: 'UNFAVORITE_FREELANCER',
            entityId: freelancerId,
            execTimeMs: execTime,
            resultsCount: 1,
            requestId: req.requestId
        });

        res.json({ favorited: false, message: 'Freelancer removed from favorites successfully.' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Get user's favorite freelancers
// @route   GET /api/v1/favorites/freelancers
// @access  Private
export const getFavoriteFreelancers = async (req, res) => {
    const startTime = Date.now();
    try {
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const total = await FreelancerFavorite.countDocuments({ user: req.user._id });
        const favorites = await FreelancerFavorite.find({ user: req.user._id })
            .populate('freelancer', 'username profile reputation verified isOnline lastSeen')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const freelancerList = favorites.map(f => f.freelancer).filter(Boolean);

        // Sanitize return profiles
        const sanitizedList = freelancerList.map(f => {
            if (typeof f.getPublicProfile === 'function') {
                return f.getPublicProfile();
            }
            return f;
        });

        const execTime = Date.now() - startTime;
        logFavoriteActivity({
            userId: req.user._id,
            action: 'GET_FAVORITES',
            execTimeMs: execTime,
            resultsCount: sanitizedList.length,
            requestId: req.requestId
        });

        res.json({
            freelancers: sanitizedList,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
