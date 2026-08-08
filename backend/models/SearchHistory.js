import mongoose from 'mongoose';

const searchHistorySchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    query: {
        type: String,
        required: true,
        trim: true
    },
    filters: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Index to retrieve a user's latest searches efficiently
searchHistorySchema.index({ user: 1, createdAt: -1 });

const SearchHistory = mongoose.model('SearchHistory', searchHistorySchema);
export default SearchHistory;
