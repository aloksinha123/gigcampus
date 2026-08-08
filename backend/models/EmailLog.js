import mongoose from 'mongoose';

const emailLogSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    recipient: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    type: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['QUEUED', 'SENT', 'FAILED'],
        default: 'QUEUED'
    },
    providerMessageId: {
        type: String
    },
    failureReason: {
        type: String
    },
    requestId: {
        type: String,
        unique: true,
        sparse: true
    },
    sentAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Indexes for fast searching and duplicate prevention
emailLogSchema.index({ user: 1, type: 1 });
emailLogSchema.index({ requestId: 1 }, { unique: true, sparse: true });

const EmailLog = mongoose.model('EmailLog', emailLogSchema);
export default EmailLog;
