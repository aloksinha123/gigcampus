import mongoose from 'mongoose';

const SENSITIVE_METADATA_KEYS = [
    'password', 'passwd', 'pwd',
    'token', 'accessToken', 'refreshToken', 'jwt',
    'emailVerificationToken', 'passwordResetToken',
    'authorization', 'cookie', 'secret', 'apiKey', 'api_key',
    'bankAccount', 'accountNumber', 'ifsc', 'cardNumber', 'cvv'
];

function sanitizeMetadata(value) {
    if (!value || typeof value !== 'object') return value;
    const cleaned = Array.isArray(value) ? [...value] : { ...value };
    for (const key of Object.keys(cleaned)) {
        if (SENSITIVE_METADATA_KEYS.includes(key.toLowerCase())) {
            delete cleaned[key];
        } else if (cleaned[key] && typeof cleaned[key] === 'object') {
            cleaned[key] = sanitizeMetadata(cleaned[key]);
        }
    }
    return cleaned;
}

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
        default: {},
        set: sanitizeMetadata
    }
}, {
    timestamps: true
});

const SecurityAudit = mongoose.model('SecurityAudit', securityAuditSchema);
export default SecurityAudit;
