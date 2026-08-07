import express from 'express';
import {
    submitBid,
    getProjectBids,
    getMyBids,
    updateBid,
    withdrawBid
} from '../controllers/bidController.js';
import { protect, freelancer } from '../middleware/auth.js';

const router = express.Router();

/**
 * @openapi
 * /bids:
 *   post:
 *     summary: Submit a proposal bid on a project (Freelancer only)
 *     tags: [Bids]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [projectId, amount, deliveryTime, proposal]
 *             properties:
 *               projectId: { type: string, example: '66a1b2c3d4e5f67890987654' }
 *               amount: { type: number, example: 450 }
 *               deliveryTime: { type: integer, example: 5 }
 *               proposal: { type: string, example: 'I can complete this project with full React tests.' }
 *     responses:
 *       201:
 *         description: Bid submitted successfully.
 *         content: { application/json: { schema: { $ref: '#/components/schemas/Bid' } } }
 */
router.post('/', protect, freelancer, submitBid);

/**
 * @openapi
 * /bids/my:
 *   get:
 *     summary: Get all bids submitted by the logged-in freelancer
 *     tags: [Bids]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List of freelancer bids.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Bid' }
 */
router.get('/my', protect, freelancer, getMyBids);

/**
 * @openapi
 * /bids/project/{projectId}:
 *   get:
 *     summary: Get all bids submitted for a specific project
 *     tags: [Bids]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Bids list for target project.
 */
router.get('/project/:projectId', protect, getProjectBids);

/**
 * @openapi
 * /bids/{id}:
 *   put:
 *     summary: Update proposal bid details (Freelancer only)
 *     tags: [Bids]
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
 *               amount: { type: number }
 *               deliveryTime: { type: integer }
 *               proposal: { type: string }
 *     responses:
 *       200:
 *         description: Updated bid object.
 *   delete:
 *     summary: Withdraw a proposal bid (Freelancer only)
 *     tags: [Bids]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Bid withdrawn successfully.
 */
router.route('/:id')
    .put(protect, freelancer, updateBid)
    .delete(protect, freelancer, withdrawBid);

export default router;
