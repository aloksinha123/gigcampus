import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        enum: ['deposit', 'withdrawal', 'escrow_payment', 'payment_received', 'refund'],
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    balanceAfter: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed'],
        default: 'completed'
    },
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project'
    },
    payment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Payment'
    },
    description: {
        type: String
    },
    transactionId: {
        type: String,
        unique: true,
        required: true
    },
    razorpayPayoutId: {
        type: String,
        default: null
    },
    withdrawalMode: {
        type: String,
        enum: ['NEFT', 'UPI', 'RTGS', 'IMPS', null],
        default: null
    },
    payoutStatus: {
        type: String,
        enum: ['pending', 'processing', 'processed', 'reversed', 'cancelled', 'queued', null],
        default: null
    },
    utrNumber: {
        type: String,
        default: null
    }
}, {
    timestamps: true
});

const Transaction = mongoose.model('Transaction', transactionSchema);

export default Transaction;
