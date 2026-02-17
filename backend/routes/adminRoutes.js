import express from 'express';
import { protect, admin } from '../middleware/auth.js';
import {
    getAdminStats,
    getAllUsers,
    suspendUser,
    activateUser,
    verifyFreelancer,
    getAllProjects,
    deleteProject,
    getDisputedProjects,
    resolveDispute,
    getAllBids
} from '../controllers/adminController.js';

const router = express.Router();

// Analytics
router.get('/stats', protect, admin, getAdminStats);

// User Management
router.get('/users', protect, admin, getAllUsers);
router.put('/users/:id/suspend', protect, admin, suspendUser);
router.put('/users/:id/activate', protect, admin, activateUser);
router.put('/users/:id/verify', protect, admin, verifyFreelancer);

// Project Management
router.get('/projects', protect, admin, getAllProjects);
router.delete('/projects/:id', protect, admin, deleteProject);

// Dispute Resolution
router.get('/disputes', protect, admin, getDisputedProjects);
router.post('/disputes/:projectId/resolve', protect, admin, resolveDispute);

// Bid Monitoring
router.get('/bids', protect, admin, getAllBids);

export default router;
