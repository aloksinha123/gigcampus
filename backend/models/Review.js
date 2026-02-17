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
    comment: {
        type: String,
        required: true
    },
    categories: {
        communication: { type: Number, min: 1, max: 5 },
        quality: { type: Number, min: 1, max: 5 },
        professionalism: { type: Number, min: 1, max: 5 },
        timeliness: { type: Number, min: 1, max: 5 }
    },
    response: {
        comment: String,
        createdAt: Date
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
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

    await User.findByIdAndUpdate(this.reviewee, {
        'reputation.score': avgRating,
        'reputation.totalReviews': reviews.length
    });
});

const Review = mongoose.model('Review', reviewSchema);
export default Review;
