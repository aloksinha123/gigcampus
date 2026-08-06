import Review from '../models/Review.js';
import Project from '../models/Project.js';
import { createNotification } from './notificationController.js';
import { logActivity } from '../services/activityService.js';

// @desc    Submit review
// @route   POST /api/reviews
// @access  Private
export const submitReview = async (req, res) => {
    try {
        const { project, reviewee, rating, comment, categories } = req.body;

        // Verify project exists and is completed
        const projectDoc = await Project.findById(project);
        if (!projectDoc) {
            return res.status(404).json({ message: 'Project not found' });
        }

        if (projectDoc.status !== 'completed') {
            return res.status(400).json({ message: 'Can only review completed projects' });
        }

        // Verify user is involved in project
        const isInvolved =
            projectDoc.client.toString() === req.user._id.toString() ||
            projectDoc.freelancer?.toString() === req.user._id.toString();

        if (!isInvolved) {
            return res.status(403).json({ message: 'Not authorized to review this project' });
        }

        // Check if review already exists
        const existingReview = await Review.findOne({
            project,
            reviewer: req.user._id
        });

        if (existingReview) {
            return res.status(400).json({ message: 'You have already reviewed this project' });
        }

        // Create review
        const review = await Review.create({
            project,
            reviewer: req.user._id,
            reviewee,
            rating,
            comment,
            categories
        });

        // Create notification for reviewee
        await createNotification(
            reviewee,
            'review',
            `You received a ${rating}-star review from ${req.user.username} for "${projectDoc.title}"`,
            {
                project: projectDoc._id,
                relatedUser: req.user._id,
                reviewId: review._id
            }
        );

        // Log REVIEW_SUBMITTED Activity Event
        await logActivity({
            project: projectDoc._id,
            user: req.user._id,
            action: 'REVIEW_SUBMITTED',
            description: `Submitted a ${rating}-star review`,
            metadata: { rating, reviewId: review._id }
        });

        const populatedReview = await Review.findById(review._id)
            .populate('reviewer', 'username profile.avatar')
            .populate('reviewee', 'username profile.avatar')
            .populate('project', 'title');

        res.status(201).json(populatedReview);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get reviews for a user
// @route   GET /api/reviews/user/:userId
// @access  Public
export const getUserReviews = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;

        const reviews = await Review.find({ reviewee: req.params.userId })
            .populate('reviewer', 'username profile.avatar')
            .populate('project', 'title')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const count = await Review.countDocuments({ reviewee: req.params.userId });

        // Calculate average ratings
        const avgRatings = await Review.aggregate([
            { $match: { reviewee: mongoose.Types.ObjectId(req.params.userId) } },
            {
                $group: {
                    _id: null,
                    avgRating: { $avg: '$rating' },
                    avgCommunication: { $avg: '$categories.communication' },
                    avgQuality: { $avg: '$categories.quality' },
                    avgProfessionalism: { $avg: '$categories.professionalism' },
                    avgTimeliness: { $avg: '$categories.timeliness' }
                }
            }
        ]);

        res.json({
            reviews,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            total: count,
            averages: avgRatings[0] || {}
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get reviews for a project
// @route   GET /api/reviews/project/:projectId
// @access  Public
export const getProjectReviews = async (req, res) => {
    try {
        const reviews = await Review.find({ project: req.params.projectId })
            .populate('reviewer', 'username profile.avatar')
            .populate('reviewee', 'username profile.avatar');

        res.json(reviews);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Respond to review
// @route   PUT /api/reviews/:id/respond
// @access  Private (Reviewee only)
export const respondToReview = async (req, res) => {
    try {
        const review = await Review.findById(req.params.id);

        if (!review) {
            return res.status(404).json({ message: 'Review not found' });
        }

        // Verify user is the reviewee
        if (review.reviewee.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        review.response = {
            comment: req.body.comment,
            createdAt: new Date()
        };

        await review.save();

        res.json(review);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get my reviews (given and received)
// @route   GET /api/reviews/my
// @access  Private
export const getMyReviews = async (req, res) => {
    try {
        const given = await Review.find({ reviewer: req.user._id })
            .populate('reviewee', 'username profile.avatar')
            .populate('project', 'title')
            .sort({ createdAt: -1 });

        const received = await Review.find({ reviewee: req.user._id })
            .populate('reviewer', 'username profile.avatar')
            .populate('project', 'title')
            .sort({ createdAt: -1 });

        res.json({ given, received });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
