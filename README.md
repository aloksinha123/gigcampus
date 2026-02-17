# 🚀 GigCampus - Student Freelance Hub

A full-stack marketplace platform connecting student freelancers with clients, featuring real-time chat, secure payments, bidding system, and portfolio showcase.

## ✨ Features

- **🔐 Authentication** - JWT-based auth with role-based access (Student, Freelancer, Admin)
- **📋 Project Marketplace** - Create, browse, and manage projects with advanced filtering
- **💰 Bidding System** - Competitive bidding with proposal submissions
- **💬 Real-Time Chat** - Socket.io powered messaging with file sharing
- **💳 Secure Payments** - Escrow system with automatic release
- **⭐ Reviews & Ratings** - Comprehensive rating system with automatic reputation updates
- **🎨 Portfolio** - Showcase completed work with likes and views
- **📁 File Uploads** - Support for images, PDFs, and documents (10MB limit)

## 🛠️ Tech Stack

### Backend
- **Node.js** + **Express** - Server framework
- **MongoDB** + **Mongoose** - Database
- **Socket.io** - Real-time features
- **JWT** - Authentication
- **Bcrypt** - Password hashing
- **Multer** - File uploads

### Frontend
- **React** + **Vite** - UI framework
- **React Router** - Navigation
- **Axios** - HTTP client
- **Socket.io Client** - Real-time features
- **Tailwind CSS** - Styling
- **Context API** - State management

## 📁 Project Structure

```
GigCampus/
├── backend/
│   ├── models/              # 7 Mongoose models
│   ├── controllers/         # 7 controllers
│   ├── routes/              # 8 route files
│   ├── middleware/          # Auth, upload, error handling
│   ├── config/              # Database configuration
│   ├── public/uploads/      # File storage
│   ├── server.js            # Main server file
│   └── .env                 # Environment variables
│
├── src/
│   ├── context/             # Auth, Socket, Notification contexts
│   ├── services/            # API service layer
│   ├── pages/               # 13 page components
│   ├── App.jsx              # Main app with routing
│   └── main.jsx             # Entry point
│
└── package.json
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or Atlas)
- npm or yarn

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd GigCampus
```

2. **Install frontend dependencies**
```bash
npm install
```

3. **Install backend dependencies**
```bash
cd backend
npm install
```

4. **Configure environment variables**

Create `backend/.env`:
```env
PORT=5003
MONGODB_URI=mongodb://localhost:27017/gigcampus
JWT_SECRET=your_jwt_secret_key_here
NODE_ENV=development
CLIENT_URL=http://localhost:5173
```

5. **Start MongoDB**
```bash
# If using local MongoDB
mongod
```

### Running the Application

1. **Start the backend server**
```bash
cd backend
npm run dev
```
Backend runs on `http://localhost:5003`

2. **Start the frontend (in a new terminal)**
```bash
npm run dev
```
Frontend runs on `http://localhost:5173`

## 📡 API Endpoints

### Authentication (`/api/auth`)
- `POST /register` - Register new user
- `POST /login` - Login user
- `GET /me` - Get current user
- `PUT /profile` - Update profile

### Projects (`/api/projects`)
- `GET /` - Get all projects
- `POST /` - Create project
- `GET /:id` - Get project details
- `PUT /:id` - Update project
- `DELETE /:id` - Delete project
- `GET /my/all` - Get my projects
- `PUT /:id/accept-bid/:bidId` - Accept bid
- `PUT /:id/complete` - Mark as completed

### Bids (`/api/bids`)
- `POST /` - Submit bid
- `GET /my` - Get my bids
- `GET /project/:projectId` - Get project bids
- `PUT /:id` - Update bid
- `DELETE /:id` - Withdraw bid

### Messages (`/api/messages`)
- `POST /` - Send message
- `GET /conversations` - Get all conversations
- `GET /project/:projectId` - Get project messages
- `PUT /read/:projectId` - Mark as read
- `GET /unread` - Get unread count

### Payments (`/api/payments`)
- `POST /` - Create payment
- `GET /my` - Get my payments
- `GET /project/:projectId` - Get payment by project
- `PUT /:id/release` - Release payment
- `PUT /:id/refund` - Request refund
- `PUT /:id/dispute` - Dispute payment

### Reviews (`/api/reviews`)
- `POST /` - Submit review
- `GET /my` - Get my reviews
- `GET /user/:userId` - Get user reviews
- `GET /project/:projectId` - Get project reviews
- `PUT /:id/respond` - Respond to review

### Portfolio (`/api/portfolio`)
- `GET /` - Browse all portfolios
- `POST /` - Add portfolio item
- `GET /my` - Get my portfolio
- `GET /user/:userId` - Get user portfolio
- `GET /:id` - Get portfolio item
- `PUT /:id` - Update item
- `DELETE /:id` - Delete item
- `PUT /:id/feature` - Toggle featured
- `PUT /:id/like` - Like item

### Users (`/api/users`)
- `GET /` - Get all users (Admin)
- `GET /:id` - Get user by ID
- `PUT /:id` - Update user (Admin)
- `DELETE /:id` - Delete user (Admin)

**Total: 46 API Endpoints**

## 🔒 Security Features

- JWT authentication with secure token storage
- Password hashing using bcrypt
- Role-based access control (RBAC)
- Input validation and sanitization
- File upload validation (type and size)
- CORS configuration
- Error handling middleware
- MongoDB injection prevention

## 🎨 User Roles

### Student
- Post projects
- Review and accept bids
- Manage payments
- Chat with freelancers
- Leave reviews

### Freelancer
- Browse projects
- Submit bids
- Complete projects
- Manage portfolio
- Build reputation

### Admin
- User management
- Platform oversight
- Dispute resolution
- View analytics

## 🌟 Key Features Explained

### Escrow Payment System
- Funds are held securely until project completion
- Automatic release upon client approval
- Refund and dispute resolution options
- Complete payment history tracking

### Real-Time Chat
- Socket.io powered instant messaging
- File sharing capabilities
- Read receipts
- Typing indicators
- Project-based conversations

### Reputation System
- Automatic score calculation from reviews
- Category-based ratings (communication, quality, professionalism, timeliness)
- Review responses
- Completed project tracking

### Portfolio System
- Showcase completed work
- Featured items
- Social features (likes, views)
- Category filtering
- Search functionality

## 📱 Pages

1. **Home** - Landing page with features showcase
2. **Login** - User authentication
3. **Register** - New user registration
4. **Student Dashboard** - Project management for students
5. **Freelancer Dashboard** - Bid management for freelancers
6. **Admin Dashboard** - Platform administration
7. **Project Marketplace** - Browse and filter projects
8. **Project Detail** - View project details and submit bids
9. **My Projects** - Manage your projects
10. **My Bids** - Track your bids
11. **Messages** - Real-time chat interface
12. **Portfolio** - Browse and manage portfolios
13. **Profile** - User profile management

## 🧪 Testing

### Test the API
```bash
# Health check
curl http://localhost:5003/api/health

# Register user
curl -X POST http://localhost:5003/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"password123","role":"student"}'

# Login
curl -X POST http://localhost:5003/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

## 🚀 Deployment

### Backend Deployment (Railway/Heroku)
1. Set environment variables
2. Deploy from GitHub
3. Configure MongoDB Atlas connection

### Frontend Deployment (Vercel/Netlify)
1. Build the project: `npm run build`
2. Deploy the `dist` folder
3. Set environment variables (API URL)

## 📝 Environment Variables

### Backend (.env)
```env
PORT=5003
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
NODE_ENV=production
CLIENT_URL=your_frontend_url
```

### Frontend (.env)
```env
VITE_API_URL=your_backend_api_url
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 👥 Authors

- Your Name - Initial work

## 🙏 Acknowledgments

- Built with React, Node.js, and MongoDB
- Socket.io for real-time features
- Tailwind CSS for beautiful UI
- Express for robust backend

---

**Made with ❤️ for the student community**
