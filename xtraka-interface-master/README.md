# Xtraka PoQ Protocol Interface

## Description



## GitHub Repository

https://github.com/lasgedu/xTraka

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
  - Landingscreen: ![Landingscreen](<public/xtraka-images/Landingscreen.png>)
  - dasbardscreen: ![dasbardscreen](<public/xtraka-images/dasbardscreen.png>)
  - achievementsscreen: ![achievementsscreen](<public/xtraka-images/achievementsscreen.png>)


## Project Structure

```
src/
├── abis/                    # Contract ABIs
│   ├── erc20.ts
│   ├── index.ts
│   ├── rewards.ts
│   ├── xtrakaCore.ts
│   ├── xtrakaTrust.ts
│   ├── xtrakaVault.ts
│   └── validationOracle.ts
├── assets/                  # Static assets
├── components/              # Reusable UI components
│   ├── Badge.tsx
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── ConnectButton.tsx
│   ├── Input.tsx
│   ├── Layout.tsx
│   └── index.ts
├── config/                  # Configuration files
│   ├── contracts.ts         # Contract addresses
│   ├── index.ts
│   ├── variables.ts
│   └── wagmi.ts            # Wagmi configuration
├── hooks/                   # Custom React hooks for contract interactions
│   ├── useContribute.ts    # Contribution workflow hooks
│   ├── useProject.ts       # Project management hooks
│   ├── useRewards.ts       # Rewards claiming hooks
│   ├── useStake.ts         # Staking hooks
│   ├── useTrust.ts         # Trust score hooks
│   ├── useValidation.ts    # Validation hooks
│   └── index.ts
├── pages/                   # Page components
│   ├── Contribute.tsx      # Work/Contribute page
│   ├── Dashboard.tsx       # Dashboard/home page
│   ├── Projects.tsx        # Projects management page
│   ├── Rewards.tsx        # Rewards page
│   ├── Stake.tsx          # Staking page
│   ├── Validate.tsx       # Validation/review page
│   └── index.ts
├── utils/                   # Utility functions
│   └── ipfs.ts            # IPFS utilities
├── App.tsx                 # Main app component with routing
├── main.tsx                # Application entry point
├── index.css               # Global styles
└── vite-env.d.ts          # Vite type definitions
```
