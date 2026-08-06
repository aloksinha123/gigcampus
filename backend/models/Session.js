import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    tokenId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    deviceName: {
        type: String,
        default: 'Unknown Device'
    },
    browser: {
        type: String,
        default: 'Unknown Browser'
    },
    operatingSystem: {
        type: String,
        default: 'Unknown OS'
    },
    ipAddress: {
        type: String,
        default: '127.0.0.1'
    },
    country: {
        type: String,
        default: 'Unknown'
    },
    city: {
        type: String,
        default: 'Unknown'
    },
    userAgent: {
        type: String,
        default: ''
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    lastActivity: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

const Session = mongoose.model('Session', sessionSchema);
export default Session;
