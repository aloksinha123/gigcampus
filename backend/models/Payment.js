import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: false
    },
    client: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    freelancer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    amount: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        default: 'INR'
    },
    platformCommission: {
        type: Number,
        default: 0
    },
    freelancerAmount: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: [
            'CREATED',
            'PENDING',
            'SUCCESS',
            'FAILED',
            'REFUNDED',
            'pending',
            'escrowed',
            'released',
            'refunded',
            'disputed',
            'completed',
            'verified'
        ],
        default: 'CREATED'
    },
    escrowedAt: Date,
    releasedAt: Date,
    refundedAt: Date,
    transactionId: String,
    razorpayOrderId: String,
    razorpayPaymentId: String,
    razorpaySignature: String,
    paymentMethod: {
        type: String,
        default: 'razorpay'
    },
    timeline: [{
        status: {
            type: String,
            required: true
        },
        message: {
            type: String,
            required: true
        },
        timestamp: {
            type: Date,
            default: Date.now
        }
    }],
    notes: String
}, {
    timestamps: true
});

// Indexes for query performance
paymentSchema.index({ project: 1 });
paymentSchema.index({ user: 1 });
paymentSchema.index({ client: 1, status: 1 });
paymentSchema.index({ freelancer: 1, status: 1 });
paymentSchema.index({ razorpayOrderId: 1 });
paymentSchema.index({ razorpayPaymentId: 1 });

const Payment = mongoose.model('Payment', paymentSchema);
export default Payment;
