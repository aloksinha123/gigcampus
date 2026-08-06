import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema(
    {
        project: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Project',
            required: true
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        action: {
            type: String,
            enum: [
                'PROJECT_CREATED',
                'BID_SUBMITTED',
                'BID_ACCEPTED',
                'ESCROW_CREATED',
                'DELIVERABLE_SUBMITTED',
                'PAYMENT_RELEASED',
                'PROJECT_COMPLETED',
                'REVIEW_SUBMITTED'
            ],
            required: true
        },
        description: {
            type: String,
            required: true
        },
        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        }
    },
    {
        timestamps: true
    }
);

// Index for efficient timeline queries sorted newest first
activitySchema.index({ project: 1, createdAt: -1 });

const Activity = mongoose.model('Activity', activitySchema);
export default Activity;
