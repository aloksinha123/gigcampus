import mongoose from 'mongoose';

const webhookLogSchema = new mongoose.Schema({
    eventId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    eventType: {
        type: String,
        required: true,
        index: true
    },
    paymentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Payment',
        required: false
    },
    razorpayOrderId: String,
    razorpayPaymentId: String,
    verified: {
        type: Boolean,
        default: false
    },
    processed: {
        type: Boolean,
        default: false
    },
    receivedTime: {
        type: Date,
        default: Date.now
    },
    notes: String
}, {
    timestamps: true
});

const WebhookLog = mongoose.model('WebhookLog', webhookLogSchema);
export default WebhookLog;
