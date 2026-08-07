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
    raiseDispute,
    getProjectTimeline
} from '../controllers/projectController.js';
import { protect, student } from '../middleware/auth.js';

const router = express.Router();

/**
 * @openapi
 * /projects:
 *   get:
 *     summary: Browse and filter marketplace projects
 *     tags: [Projects]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [open, in_progress, completed, cancelled] }
 *     responses:
 *       200:
 *         description: List of projects matching query.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Project' }
 *   post:
 *     summary: Create a new project listing (Student only)
 *     tags: [Projects]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, description, budget]
 *             properties:
 *               title: { type: string, example: 'Build React Marketplace Dashboard' }
 *               description: { type: string, example: 'Looking for a skilled developer to build a modern dashboard.' }
 *               category: { type: string, example: 'Web Development' }
 *               budget: { type: number, example: 500 }
 *               deadline: { type: string, format: 'date-time' }
 *               skillsRequired: { type: array, items: { type: string }, example: ['React', 'Node.js'] }
 *     responses:
 *       201:
 *         description: Project created successfully.
 *         content: { application/json: { schema: { $ref: '#/components/schemas/Project' } } }
 */
router.route('/')
    .get(getProjects)
    .post(protect, student, createProject);

/**
 * @openapi
 * /projects/my/all:
 *   get:
 *     summary: Get all projects owned or assigned to logged-in user
 *     tags: [Projects]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: User projects list.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Project' }
 */
router.get('/my/all', protect, getMyProjects);

/**
 * @openapi
 * /projects/{id}:
 *   get:
 *     summary: Get single project details by ID
 *     tags: [Projects]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Detailed project information.
 *         content: { application/json: { schema: { $ref: '#/components/schemas/Project' } } }
 *       404:
 *         description: Project not found.
 *   put:
 *     summary: Update project details (Owner only)
 *     tags: [Projects]
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
 *           schema: { $ref: '#/components/schemas/Project' }
 *     responses:
 *       200:
 *         description: Updated project object.
 *   delete:
 *     summary: Delete/Cancel project (Owner or Admin)
 *     tags: [Projects]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Project deleted successfully.
 */
router.route('/:id')
    .get(getProject)
    .put(protect, updateProject)
    .delete(protect, deleteProject);

/**
 * @openapi
 * /projects/{id}/timeline:
 *   get:
 *     summary: Get project milestone & activity timeline
 *     tags: [Projects]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Project timeline event logs.
 */
router.get('/:id/timeline', protect, getProjectTimeline);

/**
 * @openapi
 * /projects/{id}/accept-bid/{bidId}:
 *   put:
 *     summary: Accept a freelancer bid & hire for project (Student only)
 *     tags: [Projects]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: bidId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Bid accepted and freelancer hired.
 */
router.put('/:id/accept-bid/:bidId', protect, student, acceptBid);

/**
 * @openapi
 * /projects/{id}/complete:
 *   put:
 *     summary: Mark project as completed (Student only)
 *     tags: [Projects]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Project marked completed.
 */
router.put('/:id/complete', protect, student, completeProject);

/**
 * @openapi
 * /projects/{id}/deliverable:
 *   post:
 *     summary: Submit a project deliverable work sample (Freelancer)
 *     tags: [Projects]
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
 *             required: [title, description, fileUrl]
 *             properties:
 *               title: { type: string }
 *               description: { type: string }
 *               fileUrl: { type: string }
 *     responses:
 *       201:
 *         description: Deliverable submitted.
 */
router.post('/:id/deliverable', protect, submitDeliverable);

/**
 * @openapi
 * /projects/{id}/deliverable/{deliverableId}/approve:
 *   put:
 *     summary: Approve deliverable (Student only)
 *     tags: [Projects]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: deliverableId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Deliverable approved.
 */
router.put('/:id/deliverable/:deliverableId/approve', protect, student, approveDeliverable);

/**
 * @openapi
 * /projects/{id}/reject-bid/{bidId}:
 *   put:
 *     summary: Reject a freelancer proposal (Student only)
 *     tags: [Projects]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: bidId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Bid rejected.
 */
router.put('/:id/reject-bid/:bidId', protect, student, rejectBid);

/**
 * @openapi
 * /projects/{id}/dispute:
 *   put:
 *     summary: Raise a dispute on a project
 *     tags: [Projects]
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
 *             required: [reason]
 *             properties:
 *               reason: { type: string, example: 'Work incomplete and missed deadline.' }
 *     responses:
 *       200:
 *         description: Dispute raised successfully.
 */
router.put('/:id/dispute', protect, raiseDispute);

export default router;
