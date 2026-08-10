import mongoose from 'mongoose';

const portfolioSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project'
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true
    },
    images: [{
        url: String,
        caption: String
    }],
    files: [{
        filename: String,
        url: String,
        type: String
    }],
    skills: [String],
    link: String,
    featured: {
        type: Boolean,
        default: false
    },
    likes: {
        type: Number,
        default: 0
    },
    likedBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    views: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Index for portfolio queries
portfolioSchema.index({ user: 1, featured: -1 });
portfolioSchema.index({ category: 1, likes: -1 });

const Portfolio = mongoose.model('Portfolio', portfolioSchema);
export default Portfolio;
