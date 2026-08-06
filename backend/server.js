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

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

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
    // Broadcast to all users in the project room except sender
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
  socket.on('joinPersonal', (userId) => {
    socket.join(userId.toString());
    console.log(`User ${socket.id} joined personal room ${userId}`);
  });

  // New bid notification
  socket.on('newBid', (data) => {
    const { projectId, bid } = data;
    socket.to(`project_${projectId}`).emit('bidReceived', bid);
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
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