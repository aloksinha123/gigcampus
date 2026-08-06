import mongoose from 'mongoose';

const securityAuditSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true,
        default: null
    },
    userEmail: {
        type: String,
        index: true,
        default: 'Unknown'
    },
    action: {
        type: String,
        required: true,
        index: true
    },
    status: {
        type: String,
        enum: ['SUCCESS', 'FAILURE', 'WARNING', 'BLOCKED'],
        default: 'SUCCESS',
        index: true
    },
    ipAddress: {
        type: String,
        default: '127.0.0.1'
    },
    userAgent: {
        type: String,
        default: ''
    },
    device: {
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
    location: {
        type: String,
        default: 'Unknown'
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    }
}, {
    timestamps: true
});

const SecurityAudit = mongoose.model('SecurityAudit', securityAuditSchema);
export default SecurityAudit;
