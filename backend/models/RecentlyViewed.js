import mongoose from 'mongoose';

const recentlyViewedSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    entityType: {
        type: String,
        enum: ['project', 'freelancer'],
        required: true
    },
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: false,
        default: null
    },
    freelancer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false,
        default: null
    },
    viewedAt: {
        type: Date,
        default: Date.now
    }
});

// Compound unique index to allow easy upsert tracking (avoiding duplicate views logs)
recentlyViewedSchema.index({ user: 1, entityType: 1, project: 1, freelancer: 1 }, { unique: true });

// Sorting index for chronological queries
recentlyViewedSchema.index({ user: 1, entityType: 1, viewedAt: -1 });

const RecentlyViewed = mongoose.model('RecentlyViewed', recentlyViewedSchema);
export default RecentlyViewed;
