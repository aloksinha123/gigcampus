import mongoose from 'mongoose';

const projectFavoriteSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Ensure a user can only bookmark a project once
projectFavoriteSchema.index({ user: 1, project: 1 }, { unique: true });

const ProjectFavorite = mongoose.model('ProjectFavorite', projectFavoriteSchema);
export default ProjectFavorite;
