import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true,
        enum: ['development', 'design', 'writing', 'tutoring', 'marketing', 'other']
    },
    budget: {
        min: {
            type: Number,
            required: true
        },
        max: {
            type: Number,
            required: true
        }
    },
    timeline: {
        type: String,
        required: true
    },
    deadline: {
        type: Date,
        required: true
    },
    requirements: [String],
    skills: [String],
    status: {
        type: String,
        enum: ['open', 'in_progress', 'completed', 'cancelled', 'disputed'],
        default: 'open'
    },
    experienceLevel: {
        type: String,
        enum: ['entry', 'intermediate', 'expert'],
        default: 'entry'
    },
    client: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    selectedBid: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Bid'
    },
    freelancer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    bidsCount: {
        type: Number,
        default: 0
    },
    attachments: [{
        filename: String,
        url: String,
        uploadedAt: Date
    }],
    deliverables: [{
        freelancer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        title: String,
        description: String,
        files: [{
            name: String,
            url: String
        }],
        submittedAt: {
            type: Date,
            default: Date.now
        },
        status: {
            type: String,
            enum: ['pending', 'submitted', 'approved', 'requested_changes'],
            default: 'pending'
        },
        feedback: String
    }],
    milestones: [{
        title: {
            type: String,
            required: true
        },
        description: String,
        amount: {
            type: Number,
            required: true
        },
        status: {
            type: String,
            enum: ['pending', 'escrowed', 'released'],
            default: 'pending'
        },
        dueDate: Date,
        completedAt: Date
    }],
    completedAt: Date
}, {
    timestamps: true
});

// Index for searching and performance optimization
projectSchema.index({ title: 'text', description: 'text' });
projectSchema.index({ category: 1, status: 1 });
projectSchema.index({ client: 1, status: 1 });
projectSchema.index({ status: 1, createdAt: -1 });
projectSchema.index({ freelancer: 1, status: 1 });
projectSchema.index({ 'budget.min': 1, 'budget.max': 1 });
projectSchema.index({ experienceLevel: 1 });

const Project = mongoose.model('Project', projectSchema);
export default Project;
