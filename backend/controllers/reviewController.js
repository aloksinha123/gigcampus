import Review from '../models/Review.js';
import Project from '../models/Project.js';
import Payment from '../models/Payment.js';
import User from '../models/User.js';
import { createNotification } from './notificationController.js';
import { logActivity } from '../services/activityService.js';
import mongoose from 'mongoose';

// @desc    Submit review
// @route   POST /api/v1/reviews
// @access  Private
export const submitReview = async (req, res) => {
    try {
        const { project, reviewee, rating, review: reviewText, communicationRating, qualityRating, deadlineRating, professionalismRating, wouldRecommend } = req.body;

        // Verify project exists and is completed
        const projectDoc = await Project.findById(project);
        if (!projectDoc) {
            return res.status(404).json({ message: 'Project not found' });
        }

        if (projectDoc.status !== 'completed') {
            return res.status(400).json({ message: 'Project must be completed before reviewing.' });
        }

        // Verify payment is successful or released
        const payment = await Payment.findOne({
            project: projectDoc._id,
            status: { $in: ['SUCCESS', 'released', 'escrowed'] }
        });
        
        if (!payment) {
            return res.status(400).json({ message: 'Cannot review without a successful payment' });
        }

        // Verify user is involved in project
        const isInvolved =
            projectDoc.client.toString() === req.user._id.toString() ||
            projectDoc.freelancer?.toString() === req.user._id.toString();

        if (!isInvolved) {
            return res.status(403).json({ message: 'Not authorized to review this project' });
        }

        // Check if review already exists from this reviewer for this project
        const existingReview = await Review.findOne({
            project,
            reviewer: req.user._id
        });

        if (existingReview) {
            return res.status(409).json({ message: 'You have already reviewed this project.' });
        }

        // Validate lengths
        if (!reviewText || reviewText.length < 20 || reviewText.length > 1000) {
            return res.status(400).json({ message: 'Review must contain at least 20 characters.' });
        }

        // Create review
        const review = await Review.create({
            project,
            reviewer: req.user._id,
            reviewee,
            rating,
            review: reviewText,
            communicationRating,
            qualityRating,
            deadlineRating,
            professionalismRating,
            wouldRecommend
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
// @route   GET /api/v1/reviews/user/:userId
// @access  Public
export const getUserReviews = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;

        // Hide abusive/hidden reviews from public view
        const query = { reviewee: req.params.userId, isHidden: false };

        const reviews = await Review.find(query)
            .populate('reviewer', 'username profile.avatar')
            .populate('project', 'title')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const count = await Review.countDocuments(query);

        // Calculate average ratings
        const avgRatings = await Review.aggregate([
            { $match: { reviewee: new mongoose.Types.ObjectId(req.params.userId), isHidden: false } },
            {
                $group: {
                    _id: null,
                    avgRating: { $avg: '$rating' },
                    avgCommunication: { $avg: '$communicationRating' },
                    avgQuality: { $avg: '$qualityRating' },
                    avgProfessionalism: { $avg: '$professionalismRating' },
                    avgDeadline: { $avg: '$deadlineRating' },
                    wouldRecommendCount: {
                        $sum: { $cond: ['$wouldRecommend', 1, 0] }
                    },
                    totalReviews: { $sum: 1 }
                }
            }
        ]);

        res.json({
            reviews,
            totalPages: Math.ceil(count / limit),
            currentPage: Number(page),
            total: count,
            averages: avgRatings[0] || {}
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get reviews for a project
// @route   GET /api/v1/reviews/project/:projectId
// @access  Public
export const getProjectReviews = async (req, res) => {
    try {
        const reviews = await Review.find({ project: req.params.projectId, isHidden: false })
            .populate('reviewer', 'username profile.avatar')
            .populate('reviewee', 'username profile.avatar');

        res.json(reviews);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update/Respond to review
// @route   PUT /api/v1/reviews/:id
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

// @desc    Delete a review
// @route   DELETE /api/v1/reviews/:id
// @access  Private (Admin only)
export const deleteReview = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized to delete reviews' });
        }

        const review = await Review.findById(req.params.id);
        if (!review) {
            return res.status(404).json({ message: 'Review not found' });
        }

        const revieweeId = review.reviewee;
        await Review.findByIdAndDelete(req.params.id);

        // Manually trigger reputation update for user
        const ReviewModel = mongoose.model('Review');
        const reviews = await ReviewModel.find({ reviewee: revieweeId });
        const totalReviews = reviews.length;
        const avgRating = totalReviews > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews : 0;
        const recommendationCount = reviews.filter(r => r.wouldRecommend).length;
        
        const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        reviews.forEach(r => {
            if (distribution[r.rating] !== undefined) {
                distribution[r.rating]++;
            }
        });

        await User.findByIdAndUpdate(revieweeId, {
            'reputation.score': avgRating,
            'reputation.totalReviews': totalReviews,
            'reputation.recommendationCount': recommendationCount,
            'reputation.ratingDistribution': distribution
        });

        res.json({ message: 'Review deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Toggle hide status of a review
// @route   PUT /api/v1/reviews/:id/hide
// @access  Private (Admin only)
export const toggleHideReview = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized to hide reviews' });
        }

        const review = await Review.findById(req.params.id);
        if (!review) {
            return res.status(404).json({ message: 'Review not found' });
        }

        review.isHidden = !review.isHidden;
        await review.save();

        res.json({ message: review.isHidden ? 'Review hidden' : 'Review unhidden', review });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get my reviews (given and received)
// @route   GET /api/v1/reviews/my
// @access  Private
export const getMyReviews = async (req, res) => {
    try {
        const given = await Review.find({ reviewer: req.user._id })
            .populate('reviewee', 'username profile.avatar')
            .populate('project', 'title')
            .sort({ createdAt: -1 });

        const received = await Review.find({ reviewee: req.user._id, isHidden: false })
            .populate('reviewer', 'username profile.avatar')
            .populate('project', 'title')
            .sort({ createdAt: -1 });

        res.json({ given, received });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all reviews (Admin only)
// @route   GET /api/v1/reviews
// @access  Private (Admin only)
export const getAllReviews = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const { page = 1, limit = 20, search } = req.query;
        let query = {};

        if (search) {
            query.review = { $regex: search, $options: 'i' };
        }

        const reviews = await Review.find(query)
            .populate('reviewer', 'username email profile.avatar')
            .populate('reviewee', 'username email profile.avatar')
            .populate('project', 'title')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const count = await Review.countDocuments(query);

        res.json({
            reviews,
            totalPages: Math.ceil(count / limit),
            currentPage: Number(page),
            total: count
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update a review (Reviewer only)
// @route   PUT /api/v1/reviews/:id
// @access  Private (Reviewer only)
export const updateReview = async (req, res) => {
    try {
        const review = await Review.findById(req.params.id);

        if (!review) {
            return res.status(404).json({ message: 'Review not found' });
        }

        // Verify user is the reviewer
        if (review.reviewer.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to edit this review' });
        }

        const { rating, review: reviewText, communicationRating, qualityRating, deadlineRating, professionalismRating, wouldRecommend } = req.body;

        // Validate lengths if provided
        if (reviewText !== undefined && (reviewText.length < 20 || reviewText.length > 1000)) {
            return res.status(400).json({ message: 'Review must contain at least 20 characters.' });
        }

        // Update fields
        if (rating !== undefined) review.rating = rating;
        if (reviewText !== undefined) review.review = reviewText;
        if (communicationRating !== undefined) review.communicationRating = communicationRating;
        if (qualityRating !== undefined) review.qualityRating = qualityRating;
        if (deadlineRating !== undefined) review.deadlineRating = deadlineRating;
        if (professionalismRating !== undefined) review.professionalismRating = professionalismRating;
        if (wouldRecommend !== undefined) review.wouldRecommend = wouldRecommend;

        await review.save(); // Triggers post('save') hook to recalculate avg ratings

        const populatedReview = await Review.findById(review._id)
            .populate('reviewer', 'username profile.avatar')
            .populate('reviewee', 'username profile.avatar')
            .populate('project', 'title');

        res.json(populatedReview);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
