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
    },
    helpfulVotes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    reply: {
        type: String
    },
    repliedAt: {
        type: Date
    },
    editedAt: {
        type: Date
    },
    reports: [{
        reporter: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        reason: {
            type: String,
            enum: ['Spam', 'Abusive Language', 'Fake Review', 'Harassment', 'Other']
        },
        description: {
            type: String
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    sentiment: {
        type: String,
        enum: ['Positive', 'Neutral', 'Negative']
    },
    sentimentConfidence: {
        type: Number
    }
}, {
    timestamps: true
});

// Index for review queries
reviewSchema.index({ reviewee: 1, rating: -1 });
reviewSchema.index({ project: 1 });



const Review = mongoose.model('Review', reviewSchema);
export default Review;
