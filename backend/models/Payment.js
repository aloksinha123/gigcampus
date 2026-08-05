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
        enum: ['pending', 'escrowed', 'released', 'refunded', 'disputed', 'completed', 'verified'],
        default: 'pending'
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
        enum: ['card', 'paypal', 'bank_transfer', 'wallet', 'razorpay', 'upi', 'netbanking'],
        default: 'card'
    },
    notes: String
}, {
    timestamps: true
});

// Index for payment queries
paymentSchema.index({ project: 1 });
paymentSchema.index({ user: 1 });
paymentSchema.index({ client: 1, status: 1 });
paymentSchema.index({ freelancer: 1, status: 1 });

const Payment = mongoose.model('Payment', paymentSchema);
export default Payment;
