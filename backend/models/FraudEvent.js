import mongoose from 'mongoose';

const fraudEventSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },
        eventType: {
            type: String,
            required: true,
            index: true
        },
        riskScore: {
            type: Number,
            required: true,
            min: 0,
            max: 100
        },
        riskLevel: {
            type: String,
            enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
            required: true,
            index: true
        },
        signals: {
            type: [String],
            default: []
        },
        entityType: {
            type: String,
            default: null
        },
        entityId: {
            type: mongoose.Schema.Types.ObjectId,
            default: null
        },
        status: {
            type: String,
            enum: ['OPEN', 'REVIEWING', 'RESOLVED', 'FALSE_POSITIVE', 'BLOCKED'],
            default: 'OPEN',
            index: true
        },
        metadata: {
            type: Map,
            of: mongoose.Schema.Types.Mixed,
            default: {}
        },
        reviewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        },
        reviewedAt: {
            type: Date,
            default: null
        },
        resolutionReason: {
            type: String,
            default: ''
        }
    },
    {
        timestamps: true
    }
);

// Compound search optimization index
fraudEventSchema.index({ userId: 1, eventType: 1, status: 1 });
fraudEventSchema.index({ createdAt: -1 });

const FraudEvent = mongoose.model('FraudEvent', fraudEventSchema);
export default FraudEvent;
