import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    role: {
        type: String,
        enum: ['student', 'freelancer', 'admin'],
        default: 'student'
    },
    profile: {
        fullName: String,
        bio: String,
        skills: [String],
        university: String,
        avatar: {
            type: String,
            default: 'https://ui-avatars.com/api/?name=User'
        },
        hourlyRate: Number,
        location: String,
        phone: String
    },
    reputation: {
        score: {
            type: Number,
            default: 0,
            min: 0,
            max: 5
        },
        totalReviews: {
            type: Number,
            default: 0
        },
        recommendationCount: {
            type: Number,
            default: 0
        },
        ratingDistribution: {
            1: { type: Number, default: 0 },
            2: { type: Number, default: 0 },
            3: { type: Number, default: 0 },
            4: { type: Number, default: 0 },
            5: { type: Number, default: 0 }
        },
        completedProjects: {
            type: Number,
            default: 0
        },
        aiSummary: {
            type: String
        },
        overallSentiment: {
            type: String
        },
        strengths: [{
            type: String
        }],
        weaknesses: [{
            type: String
        }],
        totalHelpfulCount: {
            type: Number,
            default: 0
        }
    },
    wallet: {
        balance: {
            type: Number,
            default: 0,
            min: 0
        },
        razorpayContactId: {
            type: String,
            default: null
        },
        bankDetails: {
            accountHolderName: String,
            accountNumber: String,
            ifscCode: String,
            bankName: String,
            upiId: String,
            mode: {
                type: String,
                enum: ['NEFT', 'UPI', 'RTGS', 'IMPS'],
                default: 'NEFT'
            },
            razorpayFundAccountId: String,
            isVerified: {
                type: Boolean,
                default: false
            },
            addedAt: Date
        },
        totalWithdrawn: {
            type: Number,
            default: 0
        },
        pendingWithdrawal: {
            type: Number,
            default: 0
        }
    },
    verified: {
        type: Boolean,
        default: false
    },
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    emailVerificationToken: String,
    emailVerificationExpires: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    failedLoginAttempts: {
        type: Number,
        default: 0
    },
    lockUntil: Date,
    isActive: {
        type: Boolean,
        default: true
    },
    isOnline: {
        type: Boolean,
        default: false
    },
    lastSeen: {
        type: Date,
        default: Date.now
    },
    notificationPreferences: {
        browserNotifications: { type: Boolean, default: true },
        messageNotifications: { type: Boolean, default: true },
        paymentNotifications: { type: Boolean, default: true },
        bidNotifications: { type: Boolean, default: true },
        projectNotifications: { type: Boolean, default: true },
        aiNotifications: { type: Boolean, default: true },
        marketingNotifications: { type: Boolean, default: false },
        emailNotifications: { type: Boolean, default: true },
        messageEmails: { type: Boolean, default: true },
        bidEmails: { type: Boolean, default: true },
        paymentEmails: { type: Boolean, default: true },
        projectEmails: { type: Boolean, default: true },
        reviewEmails: { type: Boolean, default: true }
    }
}, {
    timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        return next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Method to compare password
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// Method to get public profile
userSchema.methods.getPublicProfile = function () {
    return {
        _id: this._id,
        username: this.username,
        email: this.email,
        role: this.role,
        profile: this.profile,
        reputation: this.reputation,
        verified: this.verified,
        isEmailVerified: this.isEmailVerified,
        isOnline: this.isOnline,
        lastSeen: this.lastSeen,
        notificationPreferences: this.notificationPreferences,
        createdAt: this.createdAt
    };
};

// Indexes for fast searching and sorting
userSchema.index({ username: 'text', 'profile.fullName': 'text', 'profile.skills': 'text', 'profile.bio': 'text' });
userSchema.index({ role: 1, 'reputation.score': -1 });
userSchema.index({ role: 1, 'profile.hourlyRate': 1 });
userSchema.index({ role: 1, 'reputation.completedProjects': -1 });
userSchema.index({ role: 1, 'reputation.totalReviews': -1 });

const User = mongoose.model('User', userSchema);
export default User;
