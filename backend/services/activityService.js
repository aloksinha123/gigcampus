import Activity from '../models/Activity.js';

/**
 * Logs a project activity event safely without blocking core business logic
 * @param {Object} params - Contains project, user, action, description, metadata
 */
export const logActivity = async ({ project, user, action, description, metadata = {} }) => {
    try {
        if (!project || !user || !action || !description) {
            console.warn('⚠️ logActivity missing required parameters');
            return null;
        }

        const activity = await Activity.create({
            project,
            user,
            action,
            description,
            metadata
        });

        console.log(`📌 Timeline Activity Logged [${action}]: ${description}`);
        return activity;
    } catch (error) {
        console.error('⚠️ Activity logging failed (non-blocking):', error.message);
        return null;
    }
};

export default {
    logActivity
};
