import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    },
    client: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    freelancer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    amount: {
        type: Number,
        required: true
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
        enum: ['pending', 'escrowed', 'released', 'refunded', 'disputed'],
        default: 'pending'
    },
    escrowedAt: Date,
    releasedAt: Date,
    refundedAt: Date,
    transactionId: String,
    paymentMethod: {
        type: String,
        enum: ['card', 'paypal', 'bank_transfer', 'wallet'],
        default: 'card'
    },
    notes: String
}, {
    timestamps: true
});

// Index for payment queries
paymentSchema.index({ project: 1 });
paymentSchema.index({ client: 1, status: 1 });
paymentSchema.index({ freelancer: 1, status: 1 });

const Payment = mongoose.model('Payment', paymentSchema);
export default Payment;
