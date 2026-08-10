# GigCampus

A full-stack freelance marketplace platform connecting students (clients) with freelancers, featuring milestone-based escrow payments, AI-powered assistance, real-time messaging, and a deterministic fraud detection system.

---

## Problem Statement

University students and young professionals need a reliable platform to hire skilled peers for projects — from web development to design and tutoring. Existing platforms charge high commissions, lack campus-focused trust mechanisms, and don't address the unique payment and workflow needs of student collaborations. There is no centralized system that combines project escrow, milestone tracking, AI-assisted proposals, and real-time collaboration in a single, accessible platform.

---

## Solution

GigCampus provides a purpose-built marketplace where students post projects, freelancers submit AI-enhanced proposals, and both parties collaborate through a structured milestone workflow with escrow-backed payments. The platform integrates Razorpay for payments and bank payouts, Google Gemini AI for proposal generation and risk analysis, Socket.IO for real-time chat, and a deterministic fraud detection engine — all administered through a dedicated admin dashboard.

---

## Key Features

### Authentication & Security
- JWT-based authentication with bcrypt password hashing (10 salt rounds)
- Multi-device session tracking with remote session termination
- Account lockout after 5 consecutive failed login attempts (configurable)
- Email verification with tokenized links and HTML email templates
- Password reset flow with 15-minute expiry tokens
- Role-based access control (Student, Freelancer, Admin)

### Project Marketplace
- Students create projects with category, budget range, timeline, deadline, and required skills
- Public marketplace with search, category filters, and budget range filters
- Project status lifecycle: `open` → `in_progress` → `completed` / `cancelled` / `disputed`
- Freelancer invite feature for students to directly invite talent
- AI-powered project description enhancement

### Project Bidding
- Freelancers submit proposals with price, timeline, and deliverables
- AI proposal generation in three tones: professional, persuasive, concise
- AI bid quality scoring (40–100) with win probability estimation
- Students accept or reject bids; rejected freelancers are notified
- Bid withdrawal by freelancers on pending proposals

### Milestone-Based Escrow Workflow
- Students create milestones with title, description, amount, and due dates
- Budget integrity validation (milestone totals cannot exceed project budget)
- Escrow funding per milestone with automated 10% platform commission
- Freelancers submit deliverables; students approve or request revisions
- Automatic payment release to freelancer wallet upon milestone approval
- Project auto-completes when all milestones are released

### Payment & Wallet System
- Razorpay payment gateway integration (order creation, signature verification, webhooks)
- Internal wallet with double-entry transaction ledger
- Transaction types: `deposit`, `escrow_payment`, `payment_received`, `withdrawal`, `refund`
- Bank payout via Razorpay X Payouts (UPI, NEFT, IMPS, RTGS)
- Bank details management with IFSC validation
- Wallet deposit via Razorpay checkout

### AI-Powered Features
- **Description Enhancement**: Transforms raw project descriptions into structured specifications with recommended skills and complexity ratings
- **Proposal Generation**: Generates customized freelancer proposals using Google Gemini AI in three configurable tones
- **Bid Quality Analysis**: Scores proposals on competitiveness, estimates win probability, and provides improvement suggestions
- **Project Risk Analysis**: Evaluates project complexity and risk factors with actionable recommendations
- **Freelancer Recommendations**: AI-powered talent matching based on skills, experience, and rating compatibility
- **Review Sentiment Analysis**: Analyzes review text for sentiment (Positive/Neutral/Negative) with confidence scores
- **User Review Summaries**: Generates AI summaries of freelancer reviews including strengths and weaknesses

All AI features include deterministic fallback logic when the Gemini API is unavailable.

### Real-Time Messaging
- Socket.IO WebSocket infrastructure for instant project-based chat
- Real-time typing indicators
- Read receipts and delivery confirmations
- Online/offline user presence tracking
- File and image attachments (20MB limit, executable file blocking)
- Conversation list with unread message counts

### Reviews & Ratings
- Category-wise ratings: Quality, Communication, Timeliness, Professionalism
- Overall rating with 1–5 star scale
- "Would Recommend" boolean flag
- Freelancer reply capability on reviews
- Community helpful vote system
- Review reporting workflow (Spam, Abusive Language, Fake Review, Harassment)
- AI-powered sentiment analysis on review text
- AI-generated user review summaries with strengths/weaknesses
- Admin moderation: hide, dismiss reports, or delete reviews

### Advanced Search & Discovery
- Full-text search across projects and freelancers
- Real-time autocomplete search suggestions
- Saved search filters with CRUD operations
- Search history tracking
- Favorites/bookmarks for projects and freelancers
- Recently viewed tracking for contextual recommendations
- AI-powered project and freelancer recommendations

### Notifications
- In-app notification system with types: bid, message, payment, review, project, system, AI, marketing
- Browser push notification permission handling
- Granular notification preferences (13 toggleable options)
- Email notification preferences per category
- Mark as read, clicked, dismissed, or delete

### Admin Dashboard
- Analytics overview with date range filtering (today, 7d, 30d, year, custom)
- KPI tracking: revenue, users, projects, AI requests
- Monthly revenue bar charts and project fulfillment visualization
- User management: search, filter by role/status, suspend, activate, verify freelancers
- Project moderation with search and status filtering
- Dispute resolution with release-to-freelancer or refund-to-student decisions
- Fraud event monitoring with statistics, status updates, resolution, and user blocking
- Email delivery statistics (sent/failed/queued by template type)
- Security audit trail with action and status filtering

### Fraud Detection Engine
- Real-time threat signal logging: failed login bursts, payment duplicates, rapid deposit/withdrawal anomalies, bidding spam, AI abuse, message spam
- Dynamic risk scoring (0–100) mapped to levels: LOW, MEDIUM, HIGH, CRITICAL
- Configurable signal weights (e.g., failed login burst = 35 points, duplicate payment = 25 points)
- 5-minute cooldown window deduplication for recurring signals
- Security audit logging for HIGH/CRITICAL events
- Admin fraud control panel with event resolution and user blocking

### Portfolio Management
- Freelancers create portfolio items with title, description, category, tags, and external links
- Image and file uploads per portfolio item
- Featured portfolio toggle
- Like/vote system
- Public browsing and user-specific portfolio views

---

## User Roles

### Student (Client)
- Create and manage projects with budgets, timelines, and milestones
- Browse and invite freelancers
- Review and accept/reject bids
- Fund escrow and release milestone payments
- Submit deliverable approvals or revision requests
- Raise disputes
- Write reviews for completed work

### Freelancer
- Browse and search available projects
- Submit proposals with AI-generated assistance
- Manage accepted projects and submit deliverables
- Respond to reviews
- Build and manage a public portfolio
- Track earnings through the wallet system

### Admin
- Full platform analytics and telemetry
- User management (suspend, activate, verify freelancers)
- Project moderation and dispute resolution
- Fraud event monitoring and resolution
- Email delivery statistics
- Security audit trail review
- Review moderation (hide, dismiss reports, delete)

---

## Core Workflow

1. **Student registers** as a Student and creates a project with category, budget, timeline, and skills
2. **Project appears** in the public marketplace; freelancers browse and discover it
3. **Freelancer submits a bid** (optionally AI-generated) with price, proposal, and timeline
4. **Student reviews bids**, optionally analyzes them with AI, then accepts one
5. **Student creates milestones** with individual amounts (total must not exceed project budget)
6. **Student funds escrow** via Razorpay for each milestone; 10% platform commission is deducted
7. **Freelancer works** and submits deliverables through the project workspace
8. **Student reviews deliverables** and approves or requests revisions
9. **Upon milestone approval**, funds are automatically released to the freelancer's wallet
10. **When all milestones complete**, the project auto-completes
11. **Both parties exchange reviews** with category ratings; AI analyzes sentiment
12. **Freelancer withdraws earnings** via Razorpay bank payout (UPI/NEFT/IMPS/RTGS)

---

## AI Features

All AI features use Google Gemini API with a model fallback chain: `gemini-2.0-flash-lite` → `gemini-2.0-flash` → `gemini-1.5-flash-latest`.

| Feature | What It Does | Where Used | Problem It Solves |
|---|---|---|---|
| Description Enhancement | Transforms raw descriptions into structured project specs with recommended skills and complexity | MyProjects (create modal) | Helps students write professional, complete project listings |
| Proposal Generation | Generates customized freelancer proposals in professional/persuasive/concise tones | ProjectDetail (bid modal) | Reduces proposal writing time for freelancers |
| Bid Quality Analysis | Scores proposals 40–100, estimates win probability, lists strengths/weaknesses | ProjectDetail (bid modal) | Helps freelancers improve proposal quality before submission |
| Project Risk Analysis | Evaluates project risk/complexity with actionable recommendations | MyProjects (create modal) | Alerts students to problematic project parameters |
| Freelancer Recommendations | Matches freelancers to projects with compatibility scores | ProjectDetail (recommend tab) | Helps students discover the best-fit talent |
| Review Sentiment | Analyzes review text sentiment with confidence scores | Profile page | Provides automated review quality assessment |
| Review Summaries | Generates AI summaries with strengths and weaknesses from review data | Profile page | Gives quick overview of freelancer reputation |

Each feature includes deterministic fallback logic when the Gemini API is unavailable, using keyword-based heuristics and statistical aggregation.

---

## Payment Architecture

### Razorpay Integration
- **Order Creation**: Frontend initiates deposit via Razorpay checkout; backend creates order via Razorpay API
- **Signature Verification**: HMAC SHA256 timing-safe comparison of payment signature
- **Webhook Handling**: Server-side webhook endpoint for payment confirmation with signature verification

### Wallet System
- Internal double-entry ledger tracking all balance changes
- Transaction types: `deposit`, `escrow_payment`, `payment_received`, `withdrawal`, `refund`
- Each transaction records `balanceAfter` for audit trail

### Escrow Flow
1. Student funds a milestone via Razorpay deposit
2. Funds are held in escrow (deducted from available balance)
3. Upon milestone approval, 10% platform commission is deducted
4. Remaining 90% is credited to freelancer's wallet
5. Freelancer can withdraw via Razorpay X Payouts (UPI/NEFT/IMPS/RTGS)

### Security Considerations
- Razorpay webhook signature verification prevents spoofed payment confirmations
- Payment signature verification on the frontend callback
- Idempotent webhook processing via WebhookLog model (unique eventId)
- Rate limiting on payment endpoints (30 requests/hour per user)

---

## Real-Time Features

### Socket.IO Implementation

**Server-side:**
- JWT token verification via handshake
- Dynamic room management: `user_{userId}` for personal notifications, `project_{projectId}` for project chat
- Online/offline tracking via `userSocketsMap` (Map of userId to Set of socketIds)

**Client-side events emitted:**
- `joinPersonal` — join personal notification room
- `joinProject` / `leaveProject` — manage project chat rooms
- `sendMessage` — send message to a project
- `typing-start` / `typing-stop` — typing indicators
- `markDelivered` / `markRead` — delivery and read receipts

**Client-side events listened:**
- `newMessage` — incoming messages
- `bidReceived` — new bid notifications
- `message-delivered` / `message-read` — delivery confirmations
- `user-online` / `user-offline` — presence updates

---

## Security

| Mechanism | Implementation |
|---|---|
| JWT Authentication | Bearer token in HTTP headers, verified on protected routes |
| Password Hashing | bcryptjs with 10 salt rounds, pre-save hook on User model |
| Role-Based Authorization | Middleware: `protect`, `admin`, `student`, `freelancer` |
| Rate Limiting | 5 limiters: auth (5/15min), AI (20/hr), payments (30/hr), uploads (20/hr), general (1500/15min) |
| Account Lockout | 5 failed login attempts triggers lockout (configurable via `ENABLE_ACCOUNT_LOCK`) |
| Session Management | Multi-device tracking with JWT tokenId, remote session termination |
| Input Validation | Mongoose schema validation, express.json parsing |
| File Upload Security | Multer with executable file blocking (.exe, .bat, .cmd, .sh, .js, .apk, etc.), 20MB limit |
| CORS | Configurable origin via `CLIENT_URL` environment variable |
| Request Tracking | `X-Request-ID` and `X-Response-Time` headers on all requests |
| Fraud Detection | Real-time threat signal logging with risk scoring and cooldown deduplication |
| Webhook Verification | Razorpay HMAC SHA256 signature verification on payment webhooks |
| Security Audit | `SecurityAudit` model logging all auth events with IP, user-agent, device info |

---

## Technology Stack

### Frontend

| Technology | Purpose |
|---|---|
| React 19 | UI framework |
| React Router v7 | Client-side routing |
| Vite (rolldown-vite 7.x) | Build tool and dev server |
| Tailwind CSS 3.4 | Utility-first CSS framework |
| Axios | HTTP client with interceptors |
| Socket.IO Client | Real-time WebSocket communication |
| Recharts | Data visualization (admin charts) |

### Backend

| Technology | Purpose |
|---|---|
| Node.js (ES Modules) | Runtime |
| Express.js 4.18 | Web framework |
| Mongoose 7.x | MongoDB ODM |
| Socket.IO 4.8 | WebSocket server |
| jsonwebtoken | Authentication |
| bcryptjs | Password hashing |
| Nodemailer | Transactional email |
| Multer | File upload handling |
| express-rate-limit | API rate limiting |
| swagger-jsdoc + swagger-ui-express | API documentation |

### Database

| Technology | Purpose |
|---|---|
| MongoDB | Primary database |
| MongoDB Atlas | Cloud database hosting |

### AI / Machine Learning

| Technology | Purpose |
|---|---|
| @google/genai 2.16 | Google Gemini AI SDK |
| @google/generative-ai 0.24 | Google Generative AI client |

### Payments

| Technology | Purpose |
|---|---|
| Razorpay Node SDK | Payment gateway |
| Razorpay X Payouts | Bank transfer payouts |

### Deployment

| Technology | Purpose |
|---|---|
| Vercel | Frontend hosting |
| Render | Backend hosting |
| MongoDB Atlas | Database hosting |
| GitHub | Version control |

---

## System Architecture

```
+-------------------+       +-------------------+       +-------------------+
|                   |       |                   |       |                   |
|  React Frontend   | <---> |  Express Backend  | <---> |     MongoDB       |
|  (Vite + Vercel)  | HTTP  |  (Node.js + Render) | Mongoose | (Atlas)      |
|                   | WSS   |                   |       |                   |
+-------------------+       +--------+----------+       +-------------------+
                                     |
                          +----------+----------+
                          |          |          |
                          v          v          v
                    +--------+ +--------+ +-----------+
                    |Razorpay| |Gemini  | |Nodemailer |
                    |Payment | |AI API  | |SMTP       |
                    +--------+ +--------+ +-----------+
```

- **Frontend** communicates with the backend via REST API (HTTP) and WebSocket (Socket.IO)
- **Backend** handles authentication, business logic, and external service integrations
- **MongoDB** stores all application data (users, projects, bids, payments, messages, etc.)
- **Razorpay** handles payment processing and bank payouts
- **Google Gemini AI** powers all AI features with deterministic fallbacks
- **Nodemailer** sends transactional emails via SMTP

---

## Database Overview

| Collection | Purpose |
|---|---|
| `users` | User accounts with profiles, wallets, reputation, and session tracking |
| `projects` | Project listings with budgets, milestones, deliverables, and status |
| `bids` | Freelancer proposals with pricing, timeline, and status |
| `messages` | Project-based chat messages with attachments and read tracking |
| `payments` | Payment records with Razorpay references and escrow status |
| `reviews` | User reviews with category ratings, sentiment, and reporting |
| `milestones` | Project milestones with amounts, status, and delivery tracking |
| `portfolios` | Freelancer portfolio items with images, files, and skills |
| `transactions` | Wallet ledger entries for all balance changes |
| `notifications` | In-app notifications with read/dismissed tracking |
| `sessions` | Multi-device session tracking with IP and device info |
| `activities` | Project timeline event log |
| `fraudevents` | Fraud detection events with risk scores and resolution status |
| `emaillogs` | Outbound email audit trail |
| `webhooklogs` | Razorpay webhook processing log |
| `securityaudits` | Security event audit trail |
| `freelancerfavorites` | User-to-freelancer bookmark relationships |
| `projectfavorites` | User-to-project bookmark relationships |
| `recentlyvieweds` | User browsing history for recommendations |
| `savedfilters` | Saved search filter configurations |
| `searchhistories` | User search query history |

---

## API Overview

All API routes are mounted under `/api/v1/` with legacy fallbacks at `/api/`.

| Route Group | Prefix | Key Endpoints |
|---|---|---|
| Authentication | `/auth` | register, login, email verification, password reset, sessions, profile |
| Projects | `/projects` | CRUD, accept/reject bids, complete, deliverables, disputes, timeline |
| Bids | `/bids` | submit, list by project/my, update, withdraw |
| Messages | `/messages` | send, upload, conversations, project messages, mark read |
| Payments | `/payments` | create, release, refund, dispute, project payments |
| Razorpay | `/payments` | create-order, verify, webhook, payment history |
| Reviews | `/reviews` | submit, respond, report, helpful votes, admin moderation |
| Portfolio | `/portfolio` | CRUD, featured toggle, likes, user portfolios |
| Wallet | `/wallet` | balance, transactions, bank details, withdraw, deposit |
| Notifications | `/notifications` | list, preferences, mark read/clicked/dismissed |
| Admin | `/admin` | analytics, stats, user/project/dispute management, fraud, email stats |
| AI | `/ai` | enhance description, generate proposal, analyze bid/risk, recommend freelancers |
| Milestones | `/milestones` | CRUD, submit, approve, reject |
| Security | `/security` | user history, admin logs, account unlock |
| Search | `/search` | projects, freelancers, suggestions, history, saved filters |
| Favorites | `/favorites` | bookmark/unbookmark projects and freelancers |
| Recommendations | `/recommendations` | project/freelancer recommendations, recently viewed |
| Health | `/health` | API health check |

Interactive API documentation is available at `/api/docs` (Swagger UI).

---

## Project Structure

```
gigcampus/
├── backend/
│   ├── config/           # Database, mail, Razorpay, rate limit, fraud configs
│   ├── controllers/      # Route handlers (auth, projects, bids, messages, etc.)
│   ├── emails/templates/ # 12 HTML email templates
│   ├── middleware/        # Auth, error handler, rate limiter, request ID, upload
│   ├── models/           # 19 Mongoose models
│   ├── routes/           # Express route definitions
│   ├── services/         # AI, Razorpay, email, fraud detection, milestones
│   ├── templates/        # Legacy JS email template generators
│   ├── utils/            # Email sender, user-agent parser
│   ├── docs/             # Swagger/OpenAPI spec
│   ├── server.js         # Express app entry point with Socket.IO
│   └── .env.example      # Environment variable documentation
├── src/
│   ├── assets/           # Static assets
│   ├── components/       # Reusable UI components (Navbar, modals, etc.)
│   ├── context/          # React contexts (Auth, Socket, Notification)
│   ├── pages/            # 27 page components
│   ├── services/         # Axios API client with all endpoint functions
│   ├── utils/            # Frontend utility functions
│   ├── App.jsx           # Route definitions and providers
│   ├── main.jsx          # React entry point
│   └── index.css         # Tailwind config and design system tokens
├── package.json          # Frontend dependencies and scripts
├── tailwind.config.js    # Tailwind theme configuration
├── vite.config.js        # Vite build configuration
├── index.html            # HTML entry point
└── vercel.json           # Vercel deployment config
```

---

## Installation & Setup

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **MongoDB**: Local instance or MongoDB Atlas connection URI
- **Razorpay Account**: For payment processing (optional for development)
- **Google AI Studio**: For Gemini API key (optional for development)

### 1. Clone the Repository

```bash
git clone https://github.com/aloksinha123/gigcampus.git
cd gigcampus
```

### 2. Install Frontend Dependencies

```bash
npm install
```

### 3. Install Backend Dependencies

```bash
cd backend
npm install
cd ..
```

### 4. Configure Environment Variables

Create `backend/.env`:

```env
PORT=5003
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# Razorpay (optional for development)
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret

# Google Gemini AI (optional for development)
GEMINI_API_KEY=your_gemini_api_key

# Email (optional for development)
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# Feature Flags
ENABLE_LOGIN_RATE_LIMIT=true
ENABLE_ACCOUNT_LOCK=true
ENABLE_EMAIL_VERIFICATION=true
```

Create `.env` in the project root:

```env
VITE_API_URL=http://localhost:5003
```

### 5. Start the Backend

```bash
cd backend
npm run dev
```

### 6. Start the Frontend

```bash
npm run dev
```

Visit `http://localhost:5173`.

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `5003` | Backend server port |
| `MONGODB_URI` | Yes | — | MongoDB connection string |
| `JWT_SECRET` | Yes | — | Secret key for JWT signing |
| `NODE_ENV` | No | `development` | Environment mode |
| `CLIENT_URL` | No | `http://localhost:5173` | Frontend URL for CORS |
| `RAZORPAY_KEY_ID` | No | — | Razorpay API key |
| `RAZORPAY_KEY_SECRET` | No | — | Razorpay API secret |
| `GEMINI_API_KEY` | No | — | Google Gemini AI key |
| `EMAIL_USER` | No | — | Gmail address for Nodemailer |
| `EMAIL_PASS` | No | — | Gmail app password |
| `ENABLE_LOGIN_RATE_LIMIT` | No | `true` | Toggle auth rate limiter |
| `ENABLE_ACCOUNT_LOCK` | No | `true` | Toggle account lockout |
| `ENABLE_EMAIL_VERIFICATION` | No | `true` | Toggle email verification |

### Frontend (root `.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `VITE_API_URL` | No | `http://localhost:5003` | Backend API base URL |

---

## Available Scripts

### Frontend

| Command | Description |
|---|---|
| `npm run dev` | Start Vite development server |
| `npm run build` | Build for production |
| `npm run lint` | Run ESLint |
| `npm run preview` | Preview production build |

### Backend

| Command | Description |
|---|---|
| `npm start` | Start production server |
| `npm run dev` | Start development server with nodemon |

---

## Challenges & Technical Highlights

### Milestone-Based Escrow Architecture
Implementing a financial escrow system required careful handling of atomic wallet operations, ensuring funds move correctly between student wallets, escrow holds, and freelancer wallets with a 10% platform commission deducted at release time. The `milestoneService` coordinates payment creation, transaction ledger updates, wallet balance modifications, and project auto-completion in a single workflow.

### Deterministic Fraud Detection
Rather than relying on ML models, the fraud engine uses a weighted signal accumulation system with cooldown deduplication. Each threat type has a configurable weight (e.g., failed login burst = 35 points), and signals aggregate within a 5-minute window. Risk levels map to score ranges (LOW: 0–29, MEDIUM: 30–59, HIGH: 60–79, CRITICAL: 80–100), enabling real-time threat assessment without model inference latency.

### AI Fallback Strategy
All 7 AI features implement a graceful degradation pattern. When the Gemini API is unavailable (quota exceeded, network failure, invalid key), each function falls back to deterministic logic — keyword heuristics for risk analysis, word-count scoring for bid quality, skill-matching algorithms for freelancer recommendations, and template-based proposals. This ensures the platform remains functional without AI dependency.

### Multi-Device Session Management
The session system tracks JWT token IDs across devices, allowing users to see active sessions with device/browser/IP details and remotely terminate specific sessions or all other sessions. The `protect` middleware validates session freshness on every request.

### Real-Time Infrastructure
Socket.IO handles project-scoped chat rooms with typing indicators, delivery confirmations, read receipts, and online/offline presence tracking. The server maintains a `userSocketsMap` to support users connected from multiple devices simultaneously.

### Comprehensive Email System
12 HTML email templates cover the full user lifecycle: welcome, verification, password reset, security alerts, bid notifications, payment confirmations, payout status, and review notifications. Each email is tracked via the `EmailLog` model with delivery status auditing.

---

## Future Scope

- **Mobile Application**: React Native or Flutter mobile app for on-the-go project management
- **Video Calls**: Integration of video calling for freelancer-client consultations
- **Advanced Analytics Dashboard**: More granular analytics with exportable reports for admins
- **Multi-Currency Support**: Support for payments in currencies beyond INR
- **Automated Matching**: More sophisticated AI matching that learns from bid acceptance patterns
- **Dispute Mediation Workflow**: Structured evidence submission and mediation process for disputes
- **Freelancer Verification Badges**: Automated skill assessments and verification badges
- **API Rate Limit Dashboard**: Real-time visibility into rate limit consumption for API consumers

---

## Author

**Alok Sinha**
- Computer Engineering Student & Full-Stack Developer
- GitHub: [github.com/aloksinha123](https://github.com/aloksinha123)

---

## License

This project is licensed under the ISC License.
