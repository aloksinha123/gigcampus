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
        completedProjects: {
            type: Number,
            default: 0
        }
    },
    wallet: {
        balance: {
            type: Number,
            default: 0,
            min: 0
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
        createdAt: this.createdAt
    };
};

const User = mongoose.model('User', userSchema);
export default User;
