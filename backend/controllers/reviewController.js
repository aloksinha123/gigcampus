import Review from '../models/Review.js';
import Project from '../models/Project.js';
import Payment from '../models/Payment.js';
import User from '../models/User.js';
import { createNotification } from './notificationController.js';
import { sendReviewReceivedEmail } from '../services/emailService.js';
import { logActivity } from '../services/activityService.js';
import { analyzeReviewSentiment, generateUserReviewsSummary } from '../services/aiService.js';
import mongoose from 'mongoose';

/**
 * Helper to recalculate a user's reputation cached metrics:
 * score, totalReviews, recommendationCount, ratingDistribution, overallSentiment, strengths, weaknesses, totalHelpfulCount.
 */
export const recalculateUserReputation = async (userId) => {
    try {
        const reviews = await Review.find({ reviewee: userId, isHidden: false });
        const totalReviews = reviews.length;
        const avgRating = totalReviews > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews : 0;
        const recommendationCount = reviews.filter(r => r.wouldRecommend).length;

        // Rating distribution
        const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        reviews.forEach(r => {
            if (distribution[r.rating] !== undefined) {
                distribution[r.rating]++;
            }
        });

        // Overall sentiment
        const sentiments = reviews.map(r => r.sentiment).filter(Boolean);
        const counts = sentiments.reduce((acc, s) => {
            acc[s] = (acc[s] || 0) + 1;
            return acc;
        }, {});
        let overallSentiment = 'Neutral';
        let maxCount = 0;
        for (const [sentiment, count] of Object.entries(counts)) {
            if (count > maxCount) {
                maxCount = count;
                overallSentiment = sentiment;
            }
        }

        // Total helpful votes count
        const totalHelpfulCount = reviews.reduce((sum, r) => sum + (r.helpfulVotes?.length || 0), 0);

        const updateData = {
            'reputation.score': avgRating,
            'reputation.totalReviews': totalReviews,
            'reputation.recommendationCount': recommendationCount,
            'reputation.ratingDistribution': distribution,
            'reputation.overallSentiment': overallSentiment,
            'reputation.totalHelpfulCount': totalHelpfulCount
        };

        // Auto-generate AI summary if verified reviews count >= 5
        if (totalReviews >= 5) {
            try {
                const aiSummaryResult = await generateUserReviewsSummary(reviews);
                if (aiSummaryResult) {
                    updateData['reputation.aiSummary'] = aiSummaryResult.summary;
                    updateData['reputation.strengths'] = aiSummaryResult.strengths || [];
                    updateData['reputation.weaknesses'] = aiSummaryResult.weaknesses || [];
                }
            } catch (aiErr) {
                console.error('Failed to auto-generate AI reviews summary:', aiErr);
            }
        }

        await User.findByIdAndUpdate(userId, updateData);
        console.log(`📊 Reputation recalculated for User [${userId}]: Average=${avgRating}, Sentiment=${overallSentiment}, HelpfulCount=${totalHelpfulCount}`);
    } catch (err) {
        console.error(`Failed to recalculate reputation for user [${userId}]:`, err);
    }
};

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

        // Perform sentiment analysis
        let sentiment = 'Neutral';
        let sentimentConfidence = 50;
        try {
            const sentimentResult = await analyzeReviewSentiment(reviewText);
            if (sentimentResult && sentimentResult.sentiment) {
                sentiment = sentimentResult.sentiment;
                sentimentConfidence = sentimentResult.confidence || 100;
            }
        } catch (sentErr) {
            console.error('Failed to analyze sentiment:', sentErr);
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
            wouldRecommend,
            sentiment,
            sentimentConfidence
        });

        // Trigger reputation recalculation
        await recalculateUserReputation(reviewee);

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
            metadata: { rating, reviewId: review._id, sentiment }
        });

        const populatedReview = await Review.findById(review._id)
            .populate('reviewer', 'username profile.avatar')
            .populate('reviewee', 'username profile.avatar')
            .populate('project', 'title');

        // Send email notification for review (non-blocking)
        try {
            const revieweeUser = await User.findById(reviewee);
            if (revieweeUser && revieweeUser.email) {
                await sendReviewReceivedEmail({
                    recipientEmail: revieweeUser.email,
                    recipientName: revieweeUser.username,
                    reviewerName: req.user.username,
                    projectTitle: projectDoc.title,
                    rating,
                    reviewContent: reviewText,
                    projectId: projectDoc._id,
                    requestId: `new-review-${review._id}`
                });
            }
        } catch (emailErr) {
            console.error('⚠️ Review email dispatch failed:', emailErr.message);
        }

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

// @desc    Get reviews for a project
// @route   GET /api/v1/reviews/project/:projectId
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

// @desc    Submit or update review reply (Reviewee only)
// @route   PUT /api/v1/reviews/:id/respond or /api/v1/reviews/:id/reply
// @access  Private
export const respondToReview = async (req, res) => {
    try {
        const { comment, reply } = req.body;
        const replyText = reply || comment;

        if (!replyText) {
            return res.status(400).json({ message: 'Reply content is required.' });
        }

        const review = await Review.findById(req.params.id);
        if (!review) {
            return res.status(404).json({ message: 'Review not found' });
        }

        // Verify the user is the reviewee (the one receiving the review)
        if (review.reviewee.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Only the review recipient can reply' });
        }

        if (review.reply) {
            // Already replied, mark as edited
            review.reply = replyText;
            review.editedAt = new Date();
        } else {
            // First time replying
            review.reply = replyText;
            review.repliedAt = new Date();
        }

        await review.save();

        // Log Activity Event
        await logActivity({
            project: review.project,
            user: req.user._id,
            action: 'REVIEW_REPLIED',
            description: `Replied to review by ${req.user.username}`,
            metadata: { reviewId: review._id }
        });

        const populatedReview = await Review.findById(review._id)
            .populate('reviewer', 'username profile.avatar')
            .populate('reviewee', 'username profile.avatar')
            .populate('project', 'title');

        res.json(populatedReview);
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

// @desc    Delete review (Admin only)
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
        await review.deleteOne();

        // Recalculate reputation after deletion
        await recalculateUserReputation(revieweeId);

        res.json({ message: 'Review deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Hide or unhide a review (Admin only)
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

        // Recalculate reputation to exclude/include hidden reviews
        await recalculateUserReputation(review.reviewee);

        res.json({ message: review.isHidden ? 'Review hidden' : 'Review unhidden', review });
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

        // Perform sentiment analysis on new text
        if (reviewText !== undefined && reviewText !== review.review) {
            try {
                const sentimentResult = await analyzeReviewSentiment(reviewText);
                if (sentimentResult && sentimentResult.sentiment) {
                    review.sentiment = sentimentResult.sentiment;
                    review.sentimentConfidence = sentimentResult.confidence || 100;
                }
            } catch (sentErr) {
                console.error('Failed to analyze sentiment during update:', sentErr);
            }
        }

        // Update fields
        if (rating !== undefined) review.rating = rating;
        if (reviewText !== undefined) review.review = reviewText;
        if (communicationRating !== undefined) review.communicationRating = communicationRating;
        if (qualityRating !== undefined) review.qualityRating = qualityRating;
        if (deadlineRating !== undefined) review.deadlineRating = deadlineRating;
        if (professionalismRating !== undefined) review.professionalismRating = professionalismRating;
        if (wouldRecommend !== undefined) review.wouldRecommend = wouldRecommend;

        await review.save();

        // Recalculate reputation
        await recalculateUserReputation(review.reviewee);

        const populatedReview = await Review.findById(review._id)
            .populate('reviewer', 'username profile.avatar')
            .populate('reviewee', 'username profile.avatar')
            .populate('project', 'title');

        res.json(populatedReview);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Mark review as helpful
// @route   POST /api/v1/reviews/:reviewId/helpful
// @access  Private
export const markHelpful = async (req, res) => {
    try {
        const review = await Review.findById(req.params.reviewId);
        if (!review) {
            return res.status(404).json({ message: 'Review not found' });
        }

        // Check if user already voted
        const userHasVoted = review.helpfulVotes.some(id => id.toString() === req.user._id.toString());
        if (userHasVoted) {
            return res.status(400).json({ message: 'You have already voted this review as helpful' });
        }

        review.helpfulVotes.push(req.user._id);
        await review.save();

        // Recalculate reputation
        await recalculateUserReputation(review.reviewee);

        // Log Activity Event
        await logActivity({
            project: review.project,
            user: req.user._id,
            action: 'REVIEW_HELPFUL_VOTE',
            description: `Voted review by ${review.reviewer} helpful`,
            metadata: { reviewId: review._id }
        });

        res.json({
            helpfulCount: review.helpfulVotes.length,
            userMarkedHelpful: true
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Remove helpful mark from review
// @route   DELETE /api/v1/reviews/:reviewId/helpful
// @access  Private
export const unmarkHelpful = async (req, res) => {
    try {
        const review = await Review.findById(req.params.reviewId);
        if (!review) {
            return res.status(404).json({ message: 'Review not found' });
        }

        review.helpfulVotes = review.helpfulVotes.filter(id => id.toString() !== req.user._id.toString());
        await review.save();

        // Recalculate reputation
        await recalculateUserReputation(review.reviewee);

        res.json({
            helpfulCount: review.helpfulVotes.length,
            userMarkedHelpful: false
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Report a review
// @route   POST /api/v1/reviews/:reviewId/report
// @access  Private
export const reportReview = async (req, res) => {
    try {
        const { reason, description } = req.body;

        if (!reason) {
            return res.status(400).json({ message: 'Reason is required' });
        }

        const review = await Review.findById(req.params.reviewId);
        if (!review) {
            return res.status(404).json({ message: 'Review not found' });
        }

        // Prevent duplicate reports by same user
        const alreadyReported = review.reports.some(r => r.reporter.toString() === req.user._id.toString());
        if (alreadyReported) {
            return res.status(409).json({ message: 'You have already reported this review' });
        }

        review.reports.push({
            reporter: req.user._id,
            reason,
            description
        });

        await review.save();

        // Log Activity Event
        await logActivity({
            project: review.project,
            user: req.user._id,
            action: 'REVIEW_REPORTED',
            description: `Reported review for: ${reason}`,
            metadata: { reviewId: review._id, reason }
        });

        res.status(201).json({ message: 'Review reported successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get reported reviews (Admin only)
// @route   GET /api/v1/admin/reviews/reported
// @access  Private (Admin only)
export const getReportedReviews = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const reviews = await Review.find({ 'reports.0': { $exists: true } })
            .populate('reviewer', 'username email profile.avatar')
            .populate('reviewee', 'username email profile.avatar')
            .populate('project', 'title')
            .populate('reports.reporter', 'username email');

        res.json(reviews);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Dismiss reports for a review (Admin only)
// @route   PUT /api/v1/admin/reviews/:reviewId/reports/dismiss
// @access  Private (Admin only)
export const dismissReports = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const review = await Review.findById(req.params.reviewId);
        if (!review) {
            return res.status(404).json({ message: 'Review not found' });
        }

        review.reports = [];
        await review.save();

        res.json({ message: 'Reports dismissed successfully', review });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Manually regenerate AI summary for a user
// @route   POST /api/v1/reviews/user/:userId/summarize
// @access  Private
export const regenerateSummary = async (req, res) => {
    try {
        const userId = req.params.userId;
        const reviews = await Review.find({ reviewee: userId, isHidden: false });

        if (reviews.length < 5) {
            return res.status(400).json({ message: 'At least 5 reviews are required to generate an AI summary.' });
        }

        const aiSummaryResult = await generateUserReviewsSummary(reviews);
        if (!aiSummaryResult) {
            return res.status(500).json({ message: 'Failed to generate AI reviews summary' });
        }

        await User.findByIdAndUpdate(userId, {
            'reputation.aiSummary': aiSummaryResult.summary,
            'reputation.strengths': aiSummaryResult.strengths || [],
            'reputation.weaknesses': aiSummaryResult.weaknesses || []
        });

        // Log Activity Event
        await logActivity({
            user: req.user._id,
            action: 'REVIEW_SUMMARY_REGENERATED',
            description: `Regenerated AI reviews summary for user ${userId}`,
            metadata: { targetUser: userId }
        });

        res.json({
            message: 'AI summary regenerated successfully',
            aiSummary: aiSummaryResult.summary,
            strengths: aiSummaryResult.strengths,
            weaknesses: aiSummaryResult.weaknesses
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
