import express from 'express';
import User from '../models/User.js';
import { protect, admin } from '../middleware/auth.js';

const router = express.Router();

/**
 * @openapi
 * /users:
 *   get:
 *     summary: Get all users list (Admin only)
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List of all platform users.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/User' }
 *       403:
 *         description: Forbidden. Admin access required.
 */
router.get('/', protect, admin, async (req, res) => {
    try {
        const users = await User.find({}).select('-password');
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

/**
 * @openapi
 * /users/{id}:
 *   get:
 *     summary: Get user public profile by ID
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: User public profile data.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id: { type: string }
 *                 username: { type: string }
 *                 role: { type: string }
 *                 profile:
 *                   type: object
 *                   properties:
 *                     fullName: { type: string }
 *                     avatar: { type: string }
 *                     bio: { type: string }
 *                     skills: { type: array, items: { type: string } }
 *                 reputation:
 *                   type: object
 *                   properties:
 *                     score: { type: number }
 *                     totalReviews: { type: integer }
 *                     completedProjects: { type: integer }
 *                 verified: { type: boolean }
 *       404:
 *         description: User not found.
 */
router.get('/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const publicProfile = {
            _id: user._id,
            username: user.username,
            role: user.role,
            profile: {
                fullName: user.profile?.fullName || '',
                avatar: user.profile?.avatar || '',
                bio: user.profile?.bio || '',
                skills: user.profile?.skills || []
            },
            reputation: {
                score: user.reputation?.score || 0,
                totalReviews: user.reputation?.totalReviews || 0,
                completedProjects: user.reputation?.completedProjects || 0
            },
            verified: user.verified || false
        };

        res.json(publicProfile);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

/**
 * @openapi
 * /users/{id}:
 *   put:
 *     summary: Update user verification, role, or active status (Admin only)
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               verified: { type: boolean }
 *               isActive: { type: boolean }
 *               role: { type: string, enum: [student, freelancer, admin] }
 *     responses:
 *       200:
 *         description: Updated user profile.
 *       404:
 *         description: User not found.
 */
router.put('/:id', protect, admin, async (req, res) => {
    try {
        if (req.params.id === req.user._id.toString()) {
            return res.status(403).json({ message: 'Admins cannot modify their own account.' });
        }

        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.verified = req.body.verified ?? user.verified;
        user.isActive = req.body.isActive ?? user.isActive;
        user.role = req.body.role || user.role;

        const updatedUser = await user.save();
        res.json(updatedUser.getPublicProfile());
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

/**
 * @openapi
 * /users/{id}:
 *   delete:
 *     summary: Delete a user account (Admin only)
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: User deleted successfully.
 *       404:
 *         description: User not found.
 */
router.delete('/:id', protect, admin, async (req, res) => {
    try {
        if (req.params.id === req.user._id.toString()) {
            return res.status(403).json({ message: 'Admins cannot delete their own account.' });
        }

        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        await user.deleteOne();
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export default router;
