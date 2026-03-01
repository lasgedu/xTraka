# XTRAKA

> A decentralized platform where native speakers submit African language translations (text & audio) and earn cryptocurrency rewards. AI automatically checks submission quality, creating a crowdsourced translation data pipeline that pays contributors fairly.

**Live Site:** [https://xtraka.com](https://xtraka.com)

**Video Demo:** [https://youtu.be/YUBEwyFZSYo](https://youtu.be/YUBEwyFZSYo)

---

## Table of Contents

- [Overview](#overview)
- [How It Works](#how-it-works)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Admin System](#admin-system)
- [AI Verification Pipeline](#ai-verification-pipeline)
- [Payment System](#payment-system)
- [Utility Scripts](#utility-scripts)
- [Frontend Pages](#frontend-pages)
- [Deployment](#deployment)
- [Designs](#designs)

---

## Overview

Most AI translation tools perform poorly on African languages due to a lack of high-quality training data. XTRAKA addresses this by incentivising native speakers to contribute text and audio translations in exchange for cryptocurrency rewards (xUSDC on Arbitrum Sepolia testnet).

**Supported languages:** Igbo, Hausa, Pidgin

### Key Features

- **Wallet-based authentication** — No email/password; users sign in with MetaMask
- **Two task types** — Voice Prompt (read-aloud text) and Emotion Q/A (audio emotion recognition)
- **AI auto-verification** — Language detection, profanity filtering, audio quality analysis, and transcription matching
- **Trust score system** — Contributors earn a trust score based on approval rate
- **Badge progression** — Beginner → Intermediate → Expert based on approved submissions
- **On-chain withdrawals** — Approved rewards are paid out as xUSDC tokens on Arbitrum Sepolia
- **Admin dashboard** — Super Admins manage tasks, users, submissions, and payments; Sub-Admins review submissions for assigned languages
- **Responsive design** — Fully responsive admin and user-facing pages

---

## How It Works

### User Journey

1. **Connect Wallet** — User connects MetaMask and signs a message to authenticate. Backend issues a JWT valid for 24 hours.
2. **Browse Tasks** — Dashboard shows available Voice Prompt and Emotion Q/A tasks with reward amounts.
3. **Submit Work** — User types translations, records audio, or selects emotions and submits.
4. **AI Verification** — Submissions are queued for automated verification (2–5 seconds):
   - Language detection (franc)
   - Profanity filter (bad-words)
   - Text length & completeness check
   - Audio transcription matching (AssemblyAI)
5. **Scoring & Review:**

   | AI Score | Result | What Happens |
   |----------|--------|--------------|
   | 70–100% | Auto-approved | Rewards credited immediately |
   | 40–69% | Pending review | Sent to admin review queue |
   | 0–39% | Auto-rejected | User notified with rejection reason |

6. **Earn & Withdraw** — Approved rewards accumulate as xUSDC. Users request withdrawals which are processed on-chain.

---

## Tech Stack

### Frontend (`xtraka-interface-master/`)

| Technology | Purpose |
|---|---|
| React 19 + TypeScript | UI framework |
| Vite 7 | Build tool & dev server |
| Vanilla CSS | Styling (responsive media queries) |
| RainbowKit | Wallet connection UI |
| Wagmi v2 | Ethereum hooks |
| Viem | Low-level blockchain utilities |
| TanStack Query | Data fetching & caching |
| React Router v7 | Client-side routing |

### Backend (`backend/`)

| Technology | Purpose |
|---|---|
| Node.js + Express 5 | API server |
| MongoDB + Mongoose 8 | Database + ODM |
| GridFS | Audio file storage |
| JWT (jsonwebtoken) | Authentication tokens |
| ethers.js v6 | Blockchain interactions & wallet verification |
| AssemblyAI | Audio transcription for verification |
| OpenAI | AI verification assistance |
| franc | Language detection |
| bad-words | Profanity filtering |
| fluent-ffmpeg | Audio processing |
| bcrypt | Admin password hashing |
| Multer | File upload handling |

---

## Project Structure

```
xTraka/
├── backend/                          # Node.js + Express API server
│   ├── config/
│   │   └── database.js               # MongoDB connection + GridFS bucket setup
│   ├── controllers/
│   │   ├── authController.js          # Wallet authentication (get-message, verify)
│   │   ├── adminAuthController.js     # Admin login (username/password)
│   │   ├── adminController.js         # Admin CRUD (users, tasks, submissions, payments)
│   │   ├── taskController.js          # Public task listing
│   │   ├── submissionController.js    # Submission creation + AI verification trigger
│   │   ├── achievementController.js   # User stats & rewards
│   │   └── withdrawalController.js    # Withdrawal requests + on-chain processing
│   ├── middleware/
│   │   ├── auth.js                    # JWT verification, requireAdmin, requireReviewer
│   │   ├── upload.js                  # Multer config for audio uploads
│   │   └── errorHandler.js            # Global error handler
│   ├── models/
│   │   ├── User.js                    # User profile, trust score, rewards, badge
│   │   ├── Task.js                    # Task definition (language, type, reward, text/audio)
│   │   ├── Submission.js              # User submissions + AI verification results
│   │   ├── Admin.js                   # Admin accounts (username/password)
│   │   ├── Withdrawal.js              # Withdrawal requests + status tracking
│   │   ├── AdminReviewQueue.js        # Queue for submissions needing human review
│   │   ├── AuditLog.js                # Audit trail for admin actions
│   │   └── SystemSetting.js           # System-level configuration
│   ├── routes/
│   │   ├── auth.js                    # POST /auth/get-message, /auth/verify
│   │   ├── admin.js                   # Admin routes (tasks, users, submissions, payments)
│   │   ├── tasks.js                   # GET /tasks (public listing)
│   │   ├── submissions.js             # POST /submissions/submit
│   │   ├── achievements.js            # GET /achievements
│   │   └── withdrawals.js             # POST /withdrawals/request, GET /withdrawals/my-withdrawals
│   ├── utils/
│   │   ├── aiVerification.js          # AI scoring pipeline (language, profanity, audio, transcription)
│   │   ├── validationQueue.js         # Background queue for async AI verification
│   │   ├── paymentService.js          # On-chain payment processing (Arbitrum Sepolia)
│   │   ├── helpers.js                 # Trust score calculation, JWT signing, badge logic
│   │   ├── auditLogger.js             # Audit event logging
│   │   └── constants.js               # Shared constants
│   ├── scripts/                       # Admin & maintenance scripts (see Utility Scripts)
│   ├── contracts/                     # Smart contract source & ABI
│   ├── deployment-info.json           # Deployed contract addresses
│   ├── server.js                      # Express app entry point
│   └── start.sh                       # Build frontend + start backend
│
├── xtraka-interface-master/           # React frontend application
│   ├── public/
│   │   └── xtraka-images/             # Logos, icons, screenshots
│   ├── src/
│   │   ├── components/
│   │   │   ├── Sidebar.tsx            # Navigation sidebar (role-aware)
│   │   │   └── ...
│   │   ├── hooks/
│   │   │   └── useAuth.ts             # Wallet auth + JWT + role detection
│   │   ├── pages/                     # All page components + CSS (see Frontend Pages)
│   │   ├── App.tsx                    # Route definitions
│   │   ├── main.tsx                   # App entry point + providers
│   │   └── index.css                  # Global design tokens & base styles
│   ├── vite.config.ts
│   └── package.json
│
├── docs/
│   └── AI_VERIFICATION.md            # Detailed AI verification documentation
├── .env.example                       # Environment variable template (frontend)
└── README.md                          # This file
```

---

## Getting Started

### Prerequisites

- **Node.js 18+** (includes npm)
- **MongoDB** (Atlas or local instance)
- **MetaMask** browser extension (for wallet authentication)

### 1. Clone the repository

```bash
git clone https://github.com/lasgedu/xTraka.git
cd xTraka
```

### 2. Set up the backend

```bash
cd backend
cp .env.example .env
# Edit .env with your MongoDB URI, JWT secret, AssemblyAI key, etc.
npm install
```

### 3. Set up the frontend

```bash
cd xtraka-interface-master
cp .env.example .env
# Edit .env with your VITE_API_URL and VITE_REOWN_PROJECT_ID
npm install
```

### 4. Seed the database

```bash
cd backend
node scripts/seed.js              # Seed general prompt tasks
node scripts/seedEmotionTasks.js  # Seed emotion Q/A tasks
node scripts/createAdmin.js       # Create initial admin account
```

### 5. Start development

```bash
# Terminal 1 — Backend
cd backend
npm run dev                        # Starts on port 4000

# Terminal 2 — Frontend
cd xtraka-interface-master
npm run dev                        # Starts on port 5173
```

### 6. Build for production

```bash
cd xtraka-interface-master
npm run build                      # Outputs to dist/

# The backend serves the built frontend automatically via:
# express.static('../xtraka-interface-master/dist')
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret for signing JWT tokens |
| `PORT` | Server port (default: `4000`) |
| `ASSEMBLYAI_API_KEY` | AssemblyAI API key for audio transcription |
| `OPENAI_API_KEY` | OpenAI API key for AI verification |
| `PAYMENT_PRIVATE_KEY` | (Optional) Encrypted wallet private key for on-chain payments |
| `TOKEN_CONTRACT_ADDRESS` | xUSDC token contract address on Arbitrum Sepolia |
| `RPC_URL` | Arbitrum Sepolia RPC endpoint |

### Frontend (`xtraka-interface-master/.env`)

| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend API URL (e.g., `https://xtraka.com`) |
| `VITE_REOWN_PROJECT_ID` | Reown (WalletConnect) project ID |

---

## API Reference

Base URL: `https://xtraka.com` (or `http://localhost:4000` in development)

### Authentication

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/auth/get-message` | Get message to sign for wallet auth | No |
| `POST` | `/auth/verify` | Verify signature and receive JWT | No |

### Tasks

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/tasks` | List active tasks (with language filter) | Yes |
| `GET` | `/tasks/:id` | Get task details | Yes |

### Submissions

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/submissions/submit` | Submit text/audio for a task | Yes |
| `GET` | `/submissions/my-submissions` | List user's own submissions | Yes |

### Achievements

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/achievements` | Get user stats, rewards, trust score, badge | Yes |

### Withdrawals

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/withdrawals/request` | Request xUSDC withdrawal to wallet | Yes |
| `GET` | `/withdrawals/my-withdrawals` | List user's withdrawal history | Yes |

### Admin (requires admin token)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/admin/login` | Admin login (username/password) |
| `GET` | `/admin/users` | List all users (paginated) |
| `GET` | `/admin/submissions` | List submissions (paginated, filterable) |
| `GET` | `/admin/tasks` | List tasks with submission stats |
| `POST` | `/admin/tasks` | Create a new task |
| `PATCH` | `/admin/tasks/:id/toggle` | Toggle task active/inactive |
| `DELETE` | `/admin/tasks/:id` | Delete task (if no submissions) |
| `POST` | `/admin/approve/:id` | Approve a submission |
| `POST` | `/admin/reject/:id` | Reject a submission (with reason) |
| `PATCH` | `/admin/users/:id/toggle-subadmin` | Promote/demote Sub-Admin |
| `POST` | `/admin/payment-config` | Save payment wallet private key |
| `GET` | `/admin/payment-config` | Get payment config status |
| `GET` | `/admin/wallet-balance` | Get admin wallet token/ETH balances |
| `GET` | `/admin/pending-withdrawals` | List pending/failed withdrawals |

---

## Admin System

### Roles

| Role | Access | Auth Method |
|------|--------|-------------|
| **Super Admin** | Full access: manage users, tasks, submissions, payments | Username/password login at `/admin/login` |
| **Sub-Admin** | Review submissions for assigned languages only | Wallet login (promoted by Super Admin) |

### Admin Dashboard Tabs

1. **Submissions** — Review pending submissions (approve/reject with audio playback)
2. **Users** — View all users, trust scores, submission counts; promote/demote Sub-Admins
3. **Tasks** — View all tasks with submission stats; filter by category/language/status; toggle active/inactive; delete empty tasks
4. **Create Task** — Create Voice Prompt or Emotion Q/A tasks with language, reward, and source text/audio
5. **Payments** — Configure payment wallet, view token/ETH balances, monitor pending/failed withdrawals

---

## AI Verification Pipeline

When a user submits work, it enters a background validation queue:

1. **Language Detection** — Uses `franc` to verify the submission is in the expected language
2. **Profanity Filter** — Checks for offensive content using `bad-words`
3. **Text Validation** — Verifies text length meets minimum/maximum requirements
4. **Audio Analysis** — Checks audio file integrity and duration using `ffprobe`
5. **Transcription Matching** — Sends audio to AssemblyAI for transcription, then compares with the source text for accuracy
6. **Scoring** — Combines all checks into an overall confidence score (0–100%)

See [`docs/AI_VERIFICATION.md`](docs/AI_VERIFICATION.md) for full details.

---

## Payment System

- **Network:** Arbitrum Sepolia (testnet)
- **Token:** xUSDC (ERC-20 test token)
- **Flow:** User requests withdrawal → Backend verifies balance → Sends on-chain transaction via ethers.js → Updates withdrawal status
- **Contract:** Deployed at address in `backend/deployment-info.json`
- **Security:** Admin private key is encrypted before storage

---

## Utility Scripts

Run from inside the `backend/` directory.

| Script | Command | Description |
|--------|---------|-------------|
| Seed Tasks | `node scripts/seed.js` | Populate database with sample prompt tasks |
| Seed Emotion Tasks | `node scripts/seedEmotionTasks.js` | Populate emotion Q/A tasks |
| Create Admin | `node scripts/createAdmin.js` | Create a Super Admin account |
| Check Admins | `node scripts/checkAdmins.js` | List all admin accounts |
| Check Users | `node scripts/checkUsers.js` | List all users with stats |
| Fix Stuck Submissions | `node scripts/fixStuckSubmissions.js` | Mark submissions stuck without AI verification for manual review |
| Fix Stuck Withdrawals | `node scripts/fixStuckWithdrawals.js` | Mark stuck pending withdrawals as failed |
| Clear Failed Withdrawals | `node scripts/clearFailedWithdrawals.js` | Remove old failed withdrawal records |
| Fix User Counts | `node scripts/fixUserCounts.js` | Recalculate user submission counters from actual data |
| Recalculate Trust Scores | `node scripts/recalculateTrustScores.js` | Recalculate all user trust scores |
| Deploy Test Token | `node scripts/deployTestToken.js` | Deploy xUSDC ERC-20 contract to Arbitrum Sepolia |

---

## Frontend Pages

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | `Landing` | Marketing page with product overview |
| `/dashboard` | `Dashboard` | Task cards for Voice Prompt and Emotion Q/A |
| `/submit/:language` | `SubmitPrompt` | Read-aloud task submission (text + audio recording) |
| `/emotion-qa/:language` | `EmotionQA` | Emotion recognition task (listen + select emotion) |
| `/my-submissions` | `MySubmissions` | User's submission history with status |
| `/achievements` | `Achievements` | Stats, rewards breakdown, trust score, withdrawal |
| `/airdrop` | `Airdrop` | Airdrop information |
| `/tasks` | `Tasks` | Task discovery listing |
| `/admin` | `AdminDashboard` | Admin panel (Super Admin / Sub-Admin) |
| `/admin/login` | `AdminLogin` | Admin login form |
| `/solutions` | `Solutions` | Product solutions |
| `/case-studies` | `CaseStudies` | Real-world examples |
| `/contributors` | `Contributors` | Community spotlight |
| `/contact-us` | `ContactUs` | Contact form |
| `/quality-data` | `QualityData` | Data quality narrative |
| `/company` | `Company` | About the company |
| `/coming-soon` | `ComingSoon` | Upcoming features |

---

## Deployment

### Production Setup

1. **Build the frontend:**
   ```bash
   cd xtraka-interface-master && npm run build
   ```

2. **Set environment variables** in `backend/.env` and `xtraka-interface-master/.env`.

3. **Start the backend** — it serves both the API and the built frontend:
   ```bash
   cd backend && node server.js
   ```
   Or use the provided script:
   ```bash
   bash backend/start.sh
   ```

4. **SPA routing** is handled by the backend catch-all — all non-API routes serve `index.html`.

5. **Health check:** `GET /health` returns `{ "status": "ok" }`.

---

## Designs

- **Figma:** [Design Mockups](https://www.figma.com/design/zYn7RJEkOMQzZSUAOCDOYX/Untitled--Copy-?node-id=4029-349&t=96VCRcLEeyTt0zJl-1)

---

## License

ISC
