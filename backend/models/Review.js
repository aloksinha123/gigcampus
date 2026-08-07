import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    },
    reviewer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    reviewee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    review: {
        type: String,
        required: true,
        minlength: 20,
        maxlength: 1000
    },
    communicationRating: { type: Number, min: 1, max: 5, required: true },
    qualityRating: { type: Number, min: 1, max: 5, required: true },
    deadlineRating: { type: Number, min: 1, max: 5, required: true },
    professionalismRating: { type: Number, min: 1, max: 5, required: true },
    wouldRecommend: {
        type: Boolean,
        required: true,
        default: true
    },
    isHidden: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Index for review queries
reviewSchema.index({ reviewee: 1, rating: -1 });
reviewSchema.index({ project: 1 });

// Update user reputation after review
reviewSchema.post('save', async function () {
    const User = mongoose.model('User');
    const Review = mongoose.model('Review');

    const reviews = await Review.find({ reviewee: this.reviewee });
    const totalReviews = reviews.length;
    const avgRating = totalReviews > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews : 0;
    
    const recommendationCount = reviews.filter(r => r.wouldRecommend).length;
    
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach(r => {
        if (distribution[r.rating] !== undefined) {
            distribution[r.rating]++;
        }
    });

    await User.findByIdAndUpdate(this.reviewee, {
        'reputation.score': avgRating,
        'reputation.totalReviews': totalReviews,
        'reputation.recommendationCount': recommendationCount,
        'reputation.ratingDistribution': distribution
    });
});

const Review = mongoose.model('Review', reviewSchema);
export default Review;
