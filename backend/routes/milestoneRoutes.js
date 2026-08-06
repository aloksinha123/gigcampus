import express from 'express';
import {
    createMilestone,
    getProjectMilestones,
    updateMilestone,
    deleteMilestone,
    submitMilestone,
    approveMilestone,
    rejectMilestone
} from '../controllers/milestoneController.js';
import { protect, student, freelancer } from '../middleware/auth.js';

const router = express.Router();

// POST /api/milestones - Create Milestone (Student only)
router.post('/', protect, student, createMilestone);

// GET /api/milestones/project/:projectId - Get Project Milestones (Student + Assigned Freelancer)
router.get('/project/:projectId', protect, getProjectMilestones);

// PUT /api/milestones/:id - Update Milestone (Student only, Pending status only)
router.put('/:id', protect, student, updateMilestone);

// DELETE /api/milestones/:id - Delete Milestone (Student only, Pending status only)
router.delete('/:id', protect, student, deleteMilestone);

// PUT /api/milestones/:id/submit - Submit Milestone Deliverable (Freelancer only)
router.put('/:id/submit', protect, freelancer, submitMilestone);

// PUT /api/milestones/:id/approve - Approve Milestone & Release Payment (Student only)
router.put('/:id/approve', protect, student, approveMilestone);

// PUT /api/milestones/:id/reject - Reject Milestone (Student only)
router.put('/:id/reject', protect, student, rejectMilestone);

export default router;
