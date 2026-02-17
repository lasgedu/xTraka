# Xtraka

## Description

XTRAKA is a decentralized platform where people submit African language translations (text and audio) and earn cryptocurrency (USDC) rewards. AI automatically checks submission quality, creating a crowdsourced translation factory that pays contributors fairly. MVP scope starts with Igbo only.

## GitHub Repository

https://github.com/lasgedu/xTraka

## Video Demo
https://youtu.be/YUBEwyFZSYo
## Features

- **Landing**: Marketing and product overview
- **Dashboard**: Key metrics and highlights
- **Tasks**: Task discovery and participation flow
- **Achievements**: Badges and progress highlights
- **Airdrop**: Airdrop information and updates
- **Solutions**: Product solutions and use cases
- **Case Studies**: Real-world examples and stories
- **Contributors**: Community and contributor spotlight
- **Quality Data**: Data quality narrative and value
- **Company**: About the company and mission
- **Contact Us**: Contact form and details
- **Coming Soon**: Upcoming features and roadmap

## Tech Stack

- **React 19** with TypeScript
- **Vite** for fast development and builds
- **Tailwind CSS** for styling
- **Reown AppKit** for wallet connection
- **Wagmi v2** for Ethereum interactions
- **Viem** for low-level blockchain utilities
- **TanStack Query** for data fetching

## Getting Started

### Environment Setup

1. Install Node.js 18+ (includes npm).
2. Create the local environment file:

```bash
cp .env.example .env
```

Windows PowerShell alternative:

```powershell
Copy-Item .env.example .env
```

3. Add your Reown project ID to `.env`:

```
VITE_REOWN_PROJECT_ID=your_project_id_here
```



### Installation

```bash
# Install dependencies
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) to view the app.

### Build

```bash
npm run build
```

### Lint

```bash
npm run lint
```

### Preview

```bash
npm run preview
```

## Designs

- Figma mockups: https://www.figma.com/design/zYn7RJEkOMQzZSUAOCDOYX/Untitled--Copy-?node-id=4029-349&t=96VCRcLEeyTt0zJl-1
- App interface screenshots :
  - Landingscreen: ![Landingscreen](<xtraka-interface-master/public/xtraka-images/Landingscreen.png>)
  - dasbardscreen: ![dasbardscreen](<xtraka-interface-master/public/xtraka-images/dasbardscreen.png>)
  - achievementsscreen: ![achievementsscreen](<xtraka-interface-master/public/xtraka-images/achievementsscreen.png>)

## Deployment Plan

1. **Build**: run `npm run build` to generate the production bundle in `dist/`.
2. **Environment variables**: ensure `VITE_REOWN_PROJECT_ID` is set in the hosting environment.
3. **Static hosting**: deploy `dist/` to a static host (Vercel, Netlify, GitHub Pages, or an S3 bucket + CDN).
4. **SPA routing**: configure the host to redirect all routes to `index.html`.
5. **Smoke test**: verify wallet connection, dashboard loading, and navigation in production.

## XTRAKA Development Guide for Developers

### Project Overview

**What we are building**

A decentralized platform where people submit African language translations (text and audio) and earn cryptocurrency (USDC) rewards. AI automatically checks if submissions meet quality standards. It functions as a crowdsourced translation factory that pays contributors fairly.

**Why it matters**

Most AI translation tools do not work well for African languages. We are collecting high-quality data to fix this problem while creating income opportunities for native speakers.

**MVP scope**

Start with Igbo language only.

### How It Works (User Journey)

1. **Login (No Email/Password)**
   - User clicks "Connect Wallet"
   - MetaMask popup appears
   - User clicks "Sign" to prove they own the wallet
   - Backend issues a login token (JWT)
   - User stays logged in for 1 day

2. **Browse Available Tasks**
   - User sees tasks like: "Igbo Translation Task - Earn 0.2 USDC."
   - Each task shows the language, requirements (text + audio), and reward amount.

3. **Submit Work**
   - User types the Igbo translation, uploads or records audio, and clicks "Submit."
   - AI verification occurs within 2-5 seconds.

4. **AI Auto-Verification**
   - Language Detection: Is it actually Igbo?
   - Profanity Filter: Are there offensive words?
   - Completeness: Is the text length sufficient?
   - Audio Quality: Is the file clear and uncorrupted?

| Score | Status | User Notification |
| --- | --- | --- |
| 70-100% | Auto-approved | "Approved! +0.2 USDC earned" |
| 40-69% | Sent to reviewer | "Pending review..." |
| 0-39% | Auto-rejected | "Rejected: Audio quality too low. Please try again." |

5. **Track Earnings and Stats**
   - Trust Score: (Approved ÷ Total) × 100%
   - Approved Rewards: USDC ready for withdrawal.
   - Pending Rewards: USDC awaiting human review.

### Tech Stack and Tools

- **Backend**: Node.js + Express
- **Database**: MongoDB (GridFS for audio storage)
- **Authentication**: ethers.js + JWT
- **AI Verification**: franc, bad-words, ffprobe

### Implementation Roadmap

1. **Phase 1: Basic Backend Setup**
   - Install Node.js and Express
   - Connect to MongoDB Atlas
   - Test initial server response with Postman
2. **Phase 2: Wallet Authentication**
   - Integrate ethers.js and JWT
   - Create `/auth/verify`
   - Connect frontend login to backend
3. **Phase 3: Task and Submission System**
   - Build `/tasks` and `/submissions/submit`
   - Implement Multer and GridFS for audio
4. **Phase 4: AI Logic and Review**
   - Integrate franc, bad-words, ffprobe
   - Automate scoring logic
   - Create Admin Review Panel for "Pending"
5. **Phase 5: Testing and Blockchain**
   - End-to-end testing and bug fixing
   - (Optional) Deploy USDC withdrawal smart contracts to Sepolia Testnet


## Project Structure

```
backend/                     # Node.js + Express API
├── config/
│   └── database.js          # MongoDB + GridFS setup
├── controllers/             # Route handlers
├── middleware/              # Auth + error handling
├── models/                  # Mongoose schemas
├── routes/                  # API routes
├── scripts/                 # Seed scripts
├── utils/                   # AI verification + helpers
└── server.js                # App entry point

xtraka-interface-master/     # React frontend app
├── public/
│   └── xtraka-images/        # UI assets
├── src/
│   ├── components/           # Reusable UI components
│   ├── pages/                # Page components
│   ├── App.tsx               # App routing
│   └── main.tsx              # App entry point
└── vite.config.ts            # Vite config
```
# xTraka
# xTraka
# xTraka
