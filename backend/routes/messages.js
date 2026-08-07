import express from 'express';
import {
    sendMessage,
    uploadAttachment,
    getProjectMessages,
    markAsRead,
    getUnreadCount,
    getConversations
} from '../controllers/messageController.js';
import { protect } from '../middleware/auth.js';
import { uploadSingle, uploadMultiple } from '../middleware/upload.js';
import { uploadLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

/**
 * @openapi
 * /messages:
 *   post:
 *     summary: Send a project chat message with optional attachments
 *     tags: [Messages]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [projectId, receiverId]
 *             properties:
 *               projectId: { type: string }
 *               receiverId: { type: string }
 *               text: { type: string, example: 'Hello, here is the requested code update.' }
 *               attachments: { type: array, items: { type: string, format: binary } }
 *     responses:
 *       201:
 *         description: Message sent successfully.
 *         content: { application/json: { schema: { $ref: '#/components/schemas/Message' } } }
 */
router.post('/', protect, uploadMultiple, sendMessage);

/**
 * @openapi
 * /messages/upload:
 *   post:
 *     summary: Upload chat file attachment (Rate limited to 20/hr)
 *     tags: [Messages]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file: { type: string, format: binary }
 *     responses:
 *       200:
 *         description: File uploaded. Returns file URL and metadata.
 */
router.post('/upload', protect, uploadLimiter, uploadSingle, uploadAttachment);

/**
 * @openapi
 * /messages/conversations:
 *   get:
 *     summary: Get list of active project conversations for user
 *     tags: [Messages]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Active conversation threads.
 */
router.get('/conversations', protect, getConversations);

/**
 * @openapi
 * /messages/unread:
 *   get:
 *     summary: Get total count of unread chat messages
 *     tags: [Messages]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Unread message count.
 */
router.get('/unread', protect, getUnreadCount);

/**
 * @openapi
 * /messages/project/{projectId}:
 *   get:
 *     summary: Get chat message history for a project
 *     tags: [Messages]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Message thread history.
 */
router.get('/project/:projectId', protect, getProjectMessages);

/**
 * @openapi
 * /messages/read/{projectId}:
 *   put:
 *     summary: Mark all project messages as read
 *     tags: [Messages]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Messages marked as read.
 */
router.put('/read/:projectId', protect, markAsRead);

export default router;
