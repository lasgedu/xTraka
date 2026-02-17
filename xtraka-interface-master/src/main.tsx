import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RainbowKitProvider, getDefaultConfig } from '@rainbow-me/rainbowkit'
import { WagmiProvider } from 'wagmi'
import { celo, celoAlfajores, mainnet, sepolia, polygon, arbitrum, optimism, base } from 'wagmi/chains'
import '@rainbow-me/rainbowkit/styles.css'
import './index.css'
import App from './App.tsx'

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '77523411a4b4c471804865e7e7a699d5'
const config = getDefaultConfig({
  appName: 'Xtraka',
  projectId,
  chains: [
    celo,           // Celo Mainnet (primary)
    celoAlfajores,  // Celo Testnet
    mainnet,        // Ethereum Mainnet
    sepolia,        // Ethereum Testnet
    polygon,        // Polygon
    arbitrum,       // Arbitrum
    optimism,       // Optimism
    base,           // Base
  ],
  ssr: false,
})
const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <App />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>,
)
