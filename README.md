# 🚀 GigCampus – Production-Grade Student Freelance Marketplace

A full-stack, enterprise-ready freelance marketplace platform connecting students and clients with real-time chat, Razorpay payments & bank payouts, milestone-based escrow workflow, AI-powered assistance, deterministic fraud detection, advanced search, and comprehensive admin telemetry.

---

## 🌍 Live Links & API Specification

- **Frontend:** [https://gigcampus-dq3tec0ka-aloksinha123s-projects.vercel.app](https://gigcampus-dq3tec0ka-aloksinha123s-projects.vercel.app)
- **API Swagger Documentation:** `/api/docs` (Swagger UI / OpenAPI spec)

---

## 🧠 Architecture & Overview

GigCampus is a feature-rich, high-performance MERN stack application designed to simulate modern freelance marketplace platforms such as Upwork and Fiverr.

### Key Architectural Highlights:
- **Scalable Monorepo Architecture**: Clean separation of concerns between Node.js/Express REST APIs and React (Vite) frontend.
- **Escrow Financial Architecture**: Built-in wallet ledger, transaction logging, Razorpay payment gateway integration, and automated bank payouts (UPI, NEFT, IMPS).
- **Deterministic Risk & Fraud Engine**: Real-time signal logging, risk scoring (0–100), cooldown deduplication, and an Admin Telemetry Fraud Control Center.
- **AI Acceleration**: Powered by Google Gemini AI for smart proposal generation, project description enhancement, bid quality scoring, and risk evaluation.

---

## ✨ Core Features & Functionalities

### 1. 🔐 Security & Multi-Device Authentication
- **Role-Based Access Control (RBAC)**: Distinct permissions for `student`, `freelancer`, and `admin` users.
- **Multi-Device Session Management**: Track active sessions by IP and User-Agent, with remote single-session or all-session revocation.
- **Account Lockout & Protection**: Automatic account lockout after 5 consecutive failed login attempts with configurable unlock timers.
- **Email Verification & Password Reset**: Secure tokenized verification flows backed by HTML email templates.

### 2. 📊 Milestone-Based Escrow & Project Workflow
- **Flexible Project Milestones**: Clients create structured project milestones with custom amounts and due dates.
- **Budget Integrity Engine**: Automatic validation ensuring milestone totals do not exceed project budget limits.
- **Escrow Funding & Release**: Escrow funds locked per milestone and released to freelancer wallet upon client approval.
- **Deliverable & Revision Flow**: Multi-stage deliverable submission with client approval and revision requests.

### 3. 💳 Razorpay Payments & Automated Payout Engine
- **Razorpay Payment Gateway**: Seamless checkout for client project funding with order creation, signature verification, and webhook handling.
- **Internal Wallet & Transaction Ledger**: Double-entry ledger tracking balance changes (`deposit`, `escrow_payment`, `payment_received`, `withdrawal`, `refund`).
- **Bank Payouts Engine**: Direct freelancer withdrawals via Razorpay Payouts supporting UPI, NEFT, IMPS, and RTGS with real-time status tracking.
- **Platform Fee Calculator**: Configurable 10% platform commission logic.

### 4. 🚨 Deterministic Fraud Detection & Trust & Safety System
- **Real-Time Threat Signal Logging**: Monitors failed login bursts, payment duplicates, rapid deposit/withdrawal anomalies, bidding spam, AI abuse, and message spam.
- **Dynamic Risk Scoring (0–100)**: Maps aggregated signals to risk levels (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`).
- **Cooldown Window Deduplication**: Aggregates recurring signals within a 5-minute window into single actionable alerts.
- **Admin Fraud Control Panel**: Dark-themed telemetry dashboard with live stats, alert filters, false-positive tagging, manual resolution, and user suspension capabilities.

### 5. 🤖 AI-Powered Assistant & Smart Recommendations
- **Gemini AI Generator**: Enhances project titles & descriptions into professional specifications.
- **AI Proposal Draft Assistant**: Generates customized proposal letters based on freelancer skills and project requirements.
- **Bid Quality & Project Risk Analyzer**: Evaluates bid competitiveness and calculates project risk scores with actionable advice.
- **Smart Recommendation Engine**: Personalizes project and freelancer suggestions based on user interaction history and skills.

### 6. 🔍 Advanced Search, Saved Filters & Favorites
- **Full-Text Search Engine**: Real-time project & freelancer searching with live autocomplete suggestions.
- **Saved Filters & Search History**: Store search preference criteria and review past search queries.
- **Favorites & Bookmarks**: Save preferred projects and freelancers for quick access from the dashboard.
- **Recently Viewed Tracker**: Logs user browsing activity for contextual recommendations.

### 7. ⭐ Advanced Reviews, Reputation & Moderation
- **Category-Wise Rating Breakdown**: Rates projects across Quality, Communication, Timeliness, and Expertise.
- **Verified Purchase Requirement**: Restricts reviews strictly to completed projects and verified client-freelancer pairs.
- **Freelancer Responses & Community Voting**: Freelancers can respond to reviews, and users can upvote helpful feedback.
- **Admin Moderation Desk**: Review reporting workflow allowing admins to dismiss, hide, or remove inappropriate feedback.

### 8. 💬 Real-Time Messaging & Collaboration
- **Socket.io WebSocket Infrastructure**: Instant project-based chat with online/offline user status indicators.
- **File & Media Attachments**: Upload project files and assets directly inside conversations.
- **Message Spam Protection**: Automatically flags high-frequency duplicate messaging.

### 9. ✉️ Transactional Email & Telemetry Logging
- **Responsive HTML Templates**: Beautifully formatted emails for welcome, email verification, password reset, bid updates, payment receipts, payout status, and reviews.
- **Email Log Audit**: Tracks all outbound emails in the database with status logging (`SENT`, `DELIVERED`, `FAILED`).

---

## 🛠️ Tech Stack

### Backend
- **Runtime:** Node.js (ES Modules)
- **Framework:** Express.js
- **Database:** MongoDB & Mongoose ORM
- **Real-Time Engine:** Socket.io
- **Authentication:** JSON Web Tokens (JWT) & Bcrypt.js
- **Payment Processing:** Razorpay Node SDK
- **AI Engine:** Google Generative AI (@google/genai & @google/generative-ai)
- **Mailer:** Nodemailer

### Frontend
- **Framework:** React 18 (Vite + Rolldown)
- **Routing:** React Router v6
- **Styling:** Tailwind CSS & Lucide Icons
- **HTTP Client:** Axios with Interceptors
- **WebSockets:** Socket.io Client

### Infrastructure & Deployment
- **Frontend Hosting:** Vercel
- **Backend Hosting:** Render
- **Database Hosting:** MongoDB Atlas
- **Version Control:** GitHub (`main` branch)

---

## ⚙️ Local Setup Guide

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **MongoDB**: Local instance or MongoDB Atlas connection URI

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/aloksinha123/gigcampus.git
cd gigcampus

# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install
```

### 3. Environment Configuration

Create a `.env` file inside the `backend` directory:
```env
PORT=5003
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# Razorpay Credentials (Optional / Test Mode)
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret

# Google Gemini AI Key
GEMINI_API_KEY=your_gemini_api_key

# Email SMTP Credentials (Optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# Feature Flags & Dev Overrides
ENABLE_LOGIN_RATE_LIMIT=true
ENABLE_ACCOUNT_LOCK=true
ENABLE_EMAIL_VERIFICATION=true
```

Create a `.env` file in the root frontend directory:
```env
VITE_API_URL=http://localhost:5003
```

### 4. Running Locally

```bash
# Start Backend API (from /backend folder)
npm run dev

# Start Frontend App (from root folder)
npm run dev
```

Visit `http://localhost:5173` to open the application in your browser.

---

## 🛡️ Security Highlights

- **JWT Bearer Token Authentication** with explicit expiry & HTTP headers extraction.
- **Bcrypt Password Hashing** (10 salt rounds).
- **Express Rate Limiting** on Auth, Payment, and AI endpoints.
- **SQL / NoSQL Injection & Input Sanitization**.
- **Role-Based Middleware Authorization** on all sensitive administrative & financial APIs.

---

## 👨‍💻 Author

**Alok Sinha**
- **Role:** Computer Engineering Student & Full-Stack Developer
- **GitHub:** [https://github.com/aloksinha123](https://github.com/aloksinha123)

---

## 📜 License

This project is licensed under the [ISC License](LICENSE).
