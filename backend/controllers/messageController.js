import fs from 'fs';
import path from 'path';
import Message from '../models/Message.js';
import Project from '../models/Project.js';
import User from '../models/User.js';
import { createNotification } from './notificationController.js';
import { sendNewMessageEmail } from '../services/emailService.js';
import { recordFraudSignal } from '../services/fraudDetectionService.js';

// @desc    Upload message attachment
// @route   POST /api/messages/upload
// @access  Private
export const uploadAttachment = async (req, res) => {
    const cleanupFile = () => {
        if (req.file) {
            const filePath = path.join(process.cwd(), 'uploads', req.file.filename);
            fs.unlink(filePath, () => {});
        }
    };

    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded or file type/size invalid' });
        }

        const projectId = req.body.project || req.body.projectId;
        if (!projectId) {
            cleanupFile();
            return res.status(400).json({ message: 'projectId is required' });
        }

        const project = await Project.findById(projectId);
        if (!project) {
            cleanupFile();
            return res.status(404).json({ message: 'Project not found' });
        }

        const isInvolved =
            project.client.toString() === req.user._id.toString() ||
            project.freelancer?.toString() === req.user._id.toString();

        if (!isInvolved) {
            cleanupFile();
            return res.status(403).json({ message: 'Not authorized to upload files for this project' });
        }

        const fileUrl = `/uploads/${req.file.filename}`;
        const attachmentData = {
            url: fileUrl,
            name: req.file.originalname,
            mimeType: req.file.mimetype,
            size: req.file.size
        };

        res.status(200).json(attachmentData);
    } catch (error) {
        cleanupFile();
        res.status(500).json({ message: 'Internal server error' });
    }
};

// @desc    Send message
// @route   POST /api/messages
// @access  Private
export const sendMessage = async (req, res) => {
    try {
        const { project, receiver, content, files, attachment } = req.body;

        // 1. Message frequency spam check: 10+ messages in 2 minutes
        const twoMinsAgo = new Date(Date.now() - 2 * 60 * 1000);
        const recentMsgCount = await Message.countDocuments({
            sender: req.user._id,
            createdAt: { $gte: twoMinsAgo }
        });
        if (recentMsgCount >= 10) {
            await recordFraudSignal(req.user._id, 'MESSAGE_SPAM', req, {
                reason: '10+ messages in 2 minutes',
                count: recentMsgCount + 1
            });
        }

        // 2. Duplicate content check (consecutive matching texts)
        if (content && content.trim()) {
            const lastMsgs = await Message.find({
                sender: req.user._id
            }).sort({ createdAt: -1 }).limit(2);
            
            const isDuplicate = lastMsgs.length === 2 && 
                lastMsgs[0].content === content.trim() && 
                lastMsgs[1].content === content.trim();
                
            if (isDuplicate) {
                await recordFraudSignal(req.user._id, 'MESSAGE_SPAM', req, {
                    reason: 'Duplicate identical messages consecutively',
                    messageSnippet: content.trim().substring(0, 30) // Only minimum snippet for security
                });
            }
        }

        if (!content && !attachment && (!files || files.length === 0)) {
            return res.status(400).json({ message: 'Message content or file attachment is required' });
        }

        // Verify project exists and user is involved
        const projectDoc = await Project.findById(project);
        if (!projectDoc) {
            return res.status(404).json({ message: 'Project not found' });
        }

        const isInvolved =
            projectDoc.client.toString() === req.user._id.toString() ||
            projectDoc.freelancer?.toString() === req.user._id.toString();

        if (!isInvolved) {
            return res.status(403).json({ message: 'Not authorized to send messages in this project' });
        }

        const messageData = {
            project,
            sender: req.user._id,
            receiver,
            content: content || '',
            files: files || []
        };

        if (attachment && attachment.url) {
            messageData.attachment = attachment;
        }

        const message = await Message.create(messageData);

        const populatedMessage = await Message.findById(message._id)
            .populate('sender', 'username profile.avatar')
            .populate('receiver', 'username profile.avatar');

        // Emit socket event
        const io = global.io;
        if (io) {
            io.to(`project_${project}`).emit('newMessage', populatedMessage);
        }

        // Create notification for receiver
        await createNotification(
            receiver,
            'message',
            `New message from ${req.user.username} for "${projectDoc.title}"`,
            {
                project: projectDoc._id,
                relatedUser: req.user._id,
                messageId: message._id
            }
        );

        // Send Email notification to receiver (non-blocking)
        try {
            const receiverUser = await User.findById(receiver);
            if (receiverUser && receiverUser.email) {
                await sendNewMessageEmail({
                    recipientEmail: receiverUser.email,
                    recipientName: receiverUser.username,
                    senderName: req.user.username,
                    projectTitle: projectDoc.title,
                    messageContent: content || 'Sent an attachment.',
                    projectId: projectDoc._id,
                    requestId: `new-message-${message._id}`
                });
            }
        } catch (emailErr) {
            console.error('⚠️ Message email dispatch failed:', emailErr.message);
        }

        res.status(201).json(populatedMessage);
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};

// @desc    Get conversation for a project
// @route   GET /api/messages/project/:projectId
// @access  Private
export const getProjectMessages = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { page = 1, limit = 50 } = req.query;

        // Verify user is involved in project
        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        const isInvolved =
            project.client.toString() === req.user._id.toString() ||
            project.freelancer?.toString() === req.user._id.toString();

        if (!isInvolved) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const messages = await Message.find({ project: projectId })
            .populate('sender', 'username profile.avatar')
            .populate('receiver', 'username profile.avatar')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const count = await Message.countDocuments({ project: projectId });

        res.json({
            messages: messages.reverse(), // Reverse to show oldest first
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            total: count
        });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};

// @desc    Mark messages as read
// @route   PUT /api/messages/read/:projectId
// @access  Private
export const markAsRead = async (req, res) => {
    try {
        const { projectId } = req.params;

        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        const isInvolved =
            project.client.toString() === req.user._id.toString() ||
            project.freelancer?.toString() === req.user._id.toString();

        if (!isInvolved) {
            return res.status(403).json({ message: 'Not authorized to access this project' });
        }

        const unreadMessages = await Message.find({
            project: projectId,
            receiver: req.user._id,
            status: { $ne: 'read' }
        }, '_id');

        const messageIds = unreadMessages.map(m => m._id.toString());
        const readAt = new Date();

        if (messageIds.length > 0) {
            await Message.updateMany(
                { _id: { $in: messageIds } },
                {
                    status: 'read',
                    read: true,
                    readAt
                }
            );

            const io = global.io;
            if (io) {
                io.to(`project_${projectId}`).emit('message-read', {
                    projectId,
                    messageIds,
                    readAt
                });
            }
        }

        res.json({ message: 'Messages marked as read', count: messageIds.length });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};

// @desc    Get unread message count
// @route   GET /api/messages/unread
// @access  Private
export const getUnreadCount = async (req, res) => {
    try {
        const count = await Message.countDocuments({
            receiver: req.user._id,
            read: false
        });

        res.json({ count });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};

// @desc    Get all conversations
// @route   GET /api/messages/conversations
// @access  Private
export const getConversations = async (req, res) => {
    try {
        // Get all projects where user is involved and has a freelancer assigned
        const projects = await Project.find({
            $or: [
                { client: req.user._id },
                { freelancer: req.user._id }
            ],
            freelancer: { $exists: true, $ne: null }
        })
            .populate('client', 'username email profile.avatar')
            .populate('freelancer', 'username email profile.avatar')
            .lean();

        // Get last message and unread count for each project
        const conversations = await Promise.all(
            projects.map(async (project) => {
                const lastMessage = await Message.findOne({ project: project._id })
                    .sort({ createdAt: -1 })
                    .populate('sender', 'username');

                const unreadCount = await Message.countDocuments({
                    project: project._id,
                    receiver: req.user._id,
                    read: false
                });

                // Determine the other user (not the current user)
                const otherUser = project.client._id.toString() === req.user._id.toString()
                    ? project.freelancer
                    : project.client;

                return {
                    projectId: project._id,
                    project: {
                        _id: project._id,
                        title: project.title,
                        status: project.status
                    },
                    otherUser,
                    lastMessage,
                    unreadCount
                };
            })
        );

        // Sort by last message time (most recent first)
        conversations.sort((a, b) => {
            if (!a.lastMessage) return 1;
            if (!b.lastMessage) return -1;
            return new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt);
        });

        res.json(conversations);
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};
