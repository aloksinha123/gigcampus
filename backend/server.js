import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';

import connectDB from './config/db.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

// Routes
import authRoutes from './routes/auth.js';
import projectRoutes from './routes/projects.js';
import bidRoutes from './routes/bids.js';
import messageRoutes from './routes/messages.js';
import paymentRoutes from './routes/payments.js';
import razorpayPaymentRoutes from './routes/paymentRoutes.js';
import reviewRoutes from './routes/reviews.js';
import portfolioRoutes from './routes/portfolio.js';
import userRoutes from './routes/users.js';
import walletRoutes from './routes/wallet.js';
import notificationRoutes from './routes/notifications.js';
import adminRoutes from './routes/adminRoutes.js';
import emailRoutes from './routes/emailRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import milestoneRoutes from './routes/milestoneRoutes.js';
import { createRateLimiter } from './middleware/rateLimiter.js';
import { verifyEmailConnection } from './config/mail.js';
import jwt from 'jsonwebtoken';
import User from './models/User.js';
import Message from './models/Message.js';

// Connect to database & verify email service
connectDB();
verifyEmailConnection();

const app = express();
const httpServer = createServer(app);

// Socket.io setup
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true
  }
});

global.io = io; // Attach to global for easy access in controllers

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static('public/uploads'));

// Rate limiters for sensitive endpoints
const authLimiter = createRateLimiter(15 * 60 * 1000, 50, 'Too many auth requests. Please try again after 15 minutes.');
const aiLimiter = createRateLimiter(15 * 60 * 1000, 30, 'AI generation limit reached. Please wait a few minutes before trying again.');

// API Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/bids', bidRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/payments', razorpayPaymentRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/users', userRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/ai', aiLimiter, aiRoutes);
app.use('/api/milestones', milestoneRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'GigCampus API is running',
    timestamp: new Date().toISOString()
  });
});

// Active sockets tracking map: Map<userIdString, Set<socketId>>
const userSocketsMap = new Map();

// Socket Authentication Middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization;
    if (!token) {
      return next(new Error('Authentication error: Token missing'));
    }

    const cleanToken = token.startsWith('Bearer ') ? token.split(' ')[1] : token;
    const decoded = jwt.verify(cleanToken, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    next();
  } catch (err) {
    console.warn(`Socket auth rejected (${socket.id}):`, err.message);
    next(new Error('Authentication error: Invalid or expired token'));
  }
});

// Socket.io connection handling
io.on('connection', async (socket) => {
  const userId = socket.userId?.toString();
  console.log(`User connected socket ${socket.id} (User ID: ${userId || 'Unauthenticated'})`);

  if (userId) {
    if (!userSocketsMap.has(userId)) {
      userSocketsMap.set(userId, new Set());
    }
    const userSet = userSocketsMap.get(userId);
    const isFirstConnection = userSet.size === 0;
    userSet.add(socket.id);

    if (isFirstConnection) {
      try {
        await User.findByIdAndUpdate(userId, { isOnline: true });
        io.emit('user-online', {
          userId,
          isOnline: true
        });
        console.log(`🟢 User ${userId} is now ONLINE`);
      } catch (dbErr) {
        console.error('Error setting user online:', dbErr.message);
      }
    }
  }

  // Join project room
  socket.on('joinProject', (projectId) => {
    socket.join(`project_${projectId}`);
    console.log(`User ${socket.id} joined project ${projectId}`);
  });

  // Leave project room
  socket.on('leaveProject', (projectId) => {
    socket.leave(`project_${projectId}`);
    console.log(`User ${socket.id} left project ${projectId}`);
  });

  // Send message
  socket.on('sendMessage', (data) => {
    const { projectId, message } = data;
    socket.to(`project_${projectId}`).emit('newMessage', message);
  });

  // Typing indicator
  socket.on('typing', (data) => {
    const { projectId, username } = data;
    socket.to(`project_${projectId}`).emit('userTyping', { username });
  });

  socket.on('stopTyping', (data) => {
    const { projectId } = data;
    socket.to(`project_${projectId}`).emit('userStoppedTyping');
  });

  // Join personal room for notifications
  socket.on('joinPersonal', (roomUserId) => {
    socket.join(roomUserId.toString());
    console.log(`User ${socket.id} joined personal room ${roomUserId}`);
  });

  // New bid notification
  socket.on('newBid', (data) => {
    const { projectId, bid } = data;
    socket.to(`project_${projectId}`).emit('bidReceived', bid);
  });

  // Mark message delivered (Security check: only receiver can mark delivered)
  socket.on('markDelivered', async ({ messageId, projectId }) => {
    try {
      if (!userId || !messageId) return;
      const msg = await Message.findById(messageId);
      if (msg && msg.receiver.toString() === userId && msg.status === 'sent') {
        const deliveredAt = new Date();
        msg.status = 'delivered';
        msg.deliveredAt = deliveredAt;
        await msg.save();

        io.to(`project_${projectId || msg.project}`).emit('message-delivered', {
          messageId,
          deliveredAt,
          status: 'delivered'
        });
      }
    } catch (err) {
      console.error('Error marking message delivered:', err.message);
    }
  });

  // Mark messages read (Security check: only receiver can mark read)
  socket.on('markRead', async ({ projectId }) => {
    try {
      if (!userId || !projectId) return;
      const unreadMessages = await Message.find({
        project: projectId,
        receiver: userId,
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

        io.to(`project_${projectId}`).emit('message-read', {
          projectId,
          messageIds,
          readAt,
          status: 'read'
        });
      }
    } catch (err) {
      console.error('Error marking messages read:', err.message);
    }
  });

  // Disconnect
  socket.on('disconnect', async () => {
    console.log('User disconnected:', socket.id);
    if (userId && userSocketsMap.has(userId)) {
      const userSet = userSocketsMap.get(userId);
      userSet.delete(socket.id);

      if (userSet.size === 0) {
        userSocketsMap.delete(userId);
        const lastSeen = new Date();
        try {
          await User.findByIdAndUpdate(userId, {
            isOnline: false,
            lastSeen
          });
          io.emit('user-offline', {
            userId,
            isOnline: false,
            lastSeen
          });
          console.log(`⚪ User ${userId} is now OFFLINE (Last seen: ${lastSeen.toISOString()})`);
        } catch (dbErr) {
          console.error('Error setting user offline:', dbErr.message);
        }
      }
    }
  });
});

// Make io accessible to routes
app.set('io', io);

const printRegisteredRoutes = (expressApp) => {
  console.log('\n--- Registered Express Routes ---');
  const printStack = (stack, parentPath = '') => {
    stack.forEach((layer) => {
      if (layer.route) {
        const methods = Object.keys(layer.route.methods).map(m => m.toUpperCase()).join(', ');
        console.log(`${methods} ${parentPath}${layer.route.path}`);
      } else if (layer.name === 'router' && layer.handle && layer.handle.stack) {
        let path = '';
        if (layer.regexp) {
          const match = layer.regexp.toString().match(/^\/\^\\?(.*?)\\\/\?\(\?=\\\/\|\$\)\/i?/);
          if (match && match[1]) {
            path = match[1].replace(/\\/g, '');
          }
        }
        printStack(layer.handle.stack, '/' + path);
      }
    });
  };
  if (expressApp._router && expressApp._router.stack) {
    printStack(expressApp._router.stack);
  }
  console.log('-----------------------------------\n');
};

const PORT = process.env.PORT || 5003;

httpServer.listen(PORT, () => {
  console.log(`🚀 GigCampus server running on port ${PORT}`);
  console.log(`📡 Socket.io enabled for real-time features`);
  printRegisteredRoutes(app);
});