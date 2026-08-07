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

/**
 * @openapi
 * /milestones:
 *   post:
 *     summary: Create project payment milestone (Student only)
 *     tags: [Payments]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [projectId, title, amount]
 *             properties:
 *               projectId: { type: string }
 *               title: { type: string, example: 'Frontend UI Implementation' }
 *               amount: { type: number, example: 250 }
 *               dueDate: { type: string, format: 'date-time' }
 *     responses:
 *       201:
 *         description: Milestone created.
 */
router.post('/', protect, student, createMilestone);

/**
 * @openapi
 * /milestones/project/{projectId}:
 *   get:
 *     summary: Get project milestones list
 *     tags: [Payments]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: List of project milestones.
 */
router.get('/project/:projectId', protect, getProjectMilestones);

/**
 * @openapi
 * /milestones/{id}:
 *   put:
 *     summary: Update pending milestone details (Student only)
 *     tags: [Payments]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Milestone updated.
 *   delete:
 *     summary: Delete pending milestone (Student only)
 *     tags: [Payments]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Milestone deleted.
 */
router.put('/:id', protect, student, updateMilestone);
router.delete('/:id', protect, student, deleteMilestone);

/**
 * @openapi
 * /milestones/{id}/submit:
 *   put:
 *     summary: Submit deliverable for milestone (Freelancer only)
 *     tags: [Payments]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Milestone deliverable submitted.
 */
router.put('/:id/submit', protect, freelancer, submitMilestone);

/**
 * @openapi
 * /milestones/{id}/approve:
 *   put:
 *     summary: Approve milestone & release funds to freelancer (Student only)
 *     tags: [Payments]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Milestone approved and funds released.
 */
router.put('/:id/approve', protect, student, approveMilestone);

/**
 * @openapi
 * /milestones/{id}/reject:
 *   put:
 *     summary: Reject milestone deliverable submission (Student only)
 *     tags: [Payments]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Milestone rejected.
 */
router.put('/:id/reject', protect, student, rejectMilestone);

export default router;
