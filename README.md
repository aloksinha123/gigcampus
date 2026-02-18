🚀 GigCampus – Student Freelance Marketplace

A full-stack freelance marketplace platform connecting students and clients with real-time chat, secure payments, bidding system, and portfolio showcase.

🌍 Live Demo:
Frontend: https://gigcampus-dq3tec0ka-aloksinha123s-projects.vercel.app

🧠 About The Project

GigCampus is a production-ready MERN stack application designed to simulate a real freelance marketplace platform.

It demonstrates:

Full-stack development

Authentication & authorization

Real-time communication

Escrow-style payment logic

Production deployment

Clean scalable architecture

✨ Features
🔐 Authentication

JWT-based login & registration

Role-based access (Student / Freelancer / Admin)

Secure password hashing

📋 Project Marketplace

Post and browse projects

Filter and manage listings

Project lifecycle handling

💰 Bidding System

Submit proposals

Accept bids

Track bid history

💬 Real-Time Chat

Socket.io powered messaging

Project-based conversations

Read receipts

💳 Payment Logic

Escrow-style flow

Release & dispute system

Transaction history

⭐ Reviews & Reputation

Rating system

Auto reputation updates

🎨 Portfolio Showcase

Upload work samples

Feature projects

Social interaction (likes/views)

🛠️ Tech Stack
Backend

Node.js

Express.js

MongoDB

Mongoose

JWT

Bcrypt

Socket.io

Frontend

React (Vite)

React Router

Axios

Socket.io Client

Tailwind CSS

Context API

Deployment

Frontend: Vercel

Backend: Render

Database: MongoDB Atlas

Version Control: GitHub

📂 Project Structure
gigcampus/
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   └── server.js
│
├── src/
│   ├── context/
│   ├── services/
│   ├── pages/
│   ├── components/
│   ├── App.jsx
│   └── main.jsx

⚙️ Local Setup

Clone the repository

git clone https://github.com/aloksinha123/gigcampus.git
cd gigcampus


Install dependencies

npm install
cd backend
npm install


Create environment variables

Backend .env

PORT=5003
MONGODB_URI=your_database_url
JWT_SECRET=your_secret_key
NODE_ENV=development
CLIENT_URL=http://localhost:5173


Frontend .env

VITE_API_URL=http://localhost:5003


Run the project

Backend:

npm run dev


Frontend:

npm run dev

🔐 Security Highlights

JWT token validation

Password hashing

Role-based route protection

Input validation

File upload restrictions

Centralized error handling

👨‍💻 Author

Alok Sinha
Computer Engineering Student
GitHub: https://github.com/aloksinha123

📌 Note

The backend is hosted on a free tier service.
The first request may take a few seconds due to cold start.

This version is:

✅ Safe
✅ Professional
✅ Recruiter-friendly
✅ No secrets exposed
✅ Clean and confident

