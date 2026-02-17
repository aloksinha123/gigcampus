import express from 'express';
import {
    createProject,
    getProjects,
    getProject,
    updateProject,
    deleteProject,
    getMyProjects,
    acceptBid,
    completeProject,
    submitDeliverable,
    approveDeliverable,
    rejectBid,
    raiseDispute
} from '../controllers/projectController.js';
import { protect, student } from '../middleware/auth.js';

const router = express.Router();

router.route('/')
    .get(getProjects)
    .post(protect, student, createProject);

router.get('/my/all', protect, getMyProjects);

router.route('/:id')
    .get(getProject)
    .put(protect, updateProject)
    .delete(protect, deleteProject);

router.put('/:id/accept-bid/:bidId', protect, student, acceptBid);
router.put('/:id/complete', protect, student, completeProject);

// Deliverables
router.post('/:id/deliverable', protect, submitDeliverable);
router.put('/:id/deliverable/:deliverableId/approve', protect, student, approveDeliverable);

// Bid Management
router.put('/:id/reject-bid/:bidId', protect, student, rejectBid);

// Disputes
router.put('/:id/dispute', protect, raiseDispute);

export default router;
