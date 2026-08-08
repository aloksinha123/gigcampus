import mongoose from 'mongoose';

const savedFilterSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    type: {
        type: String,
        enum: ['projects', 'freelancers'],
        required: true
    },
    filters: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Index to retrieve user's saved filters by type
savedFilterSchema.index({ user: 1, type: 1 });

const SavedFilter = mongoose.model('SavedFilter', savedFilterSchema);
export default SavedFilter;
