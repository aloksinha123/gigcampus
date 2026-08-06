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

router.post('/', protect, uploadMultiple, sendMessage);
router.post('/upload', protect, uploadLimiter, uploadSingle, uploadAttachment);
router.get('/conversations', protect, getConversations);
router.get('/unread', protect, getUnreadCount);
router.get('/project/:projectId', protect, getProjectMessages);
router.put('/read/:projectId', protect, markAsRead);

export default router;
