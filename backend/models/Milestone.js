import mongoose from 'mongoose';

const milestoneSchema = new mongoose.Schema(
    {
        project: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Project',
            required: true,
            index: true
        },
        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        freelancer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        title: {
            type: String,
            required: true,
            trim: true
        },
        description: {
            type: String,
            default: ''
        },
        amount: {
            type: Number,
            required: true,
            min: [1, 'Milestone amount must be greater than 0']
        },
        dueDate: {
            type: Date
        },
        status: {
            type: String,
            enum: ['pending', 'submitted', 'approved', 'rejected', 'released'],
            default: 'pending'
        },
        order: {
            type: Number,
            default: 1
        },
        submittedAt: {
            type: Date
        },
        approvedAt: {
            type: Date
        },
        releasedAt: {
            type: Date
        },
        feedback: {
            type: String,
            default: ''
        },
        deliverableUrl: {
            type: String,
            default: ''
        }
    },
    {
        timestamps: true
    }
);

milestoneSchema.index({ project: 1, order: 1 });

const Milestone = mongoose.model('Milestone', milestoneSchema);
export default Milestone;
