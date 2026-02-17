import mongoose from 'mongoose';

const bidSchema = new mongoose.Schema({
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    },
    freelancer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    proposal: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    timeline: {
        type: String,
        required: true
    },
    deliverables: [String],
    status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected', 'withdrawn'],
        default: 'pending'
    },
    attachments: [{
        filename: String,
        url: String
    }]
}, {
    timestamps: true
});

// Index for queries
bidSchema.index({ project: 1, freelancer: 1 });
bidSchema.index({ freelancer: 1, status: 1 });

const Bid = mongoose.model('Bid', bidSchema);
export default Bid;
