import express from 'express';
import {
    sendMessage,
    getProjectMessages,
    markAsRead,
    getUnreadCount,
    getConversations
} from '../controllers/messageController.js';
import { protect } from '../middleware/auth.js';
import { uploadMultiple } from '../middleware/upload.js';

const router = express.Router();

router.post('/', protect, uploadMultiple, sendMessage);
router.get('/conversations', protect, getConversations);
router.get('/unread', protect, getUnreadCount);
router.get('/project/:projectId', protect, getProjectMessages);
router.put('/read/:projectId', protect, markAsRead);

export default router;
