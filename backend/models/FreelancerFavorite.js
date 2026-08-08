import mongoose from 'mongoose';

const freelancerFavoriteSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    freelancer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Ensure a user can only favorite a freelancer once
freelancerFavoriteSchema.index({ user: 1, freelancer: 1 }, { unique: true });

const FreelancerFavorite = mongoose.model('FreelancerFavorite', freelancerFavoriteSchema);
export default FreelancerFavorite;
