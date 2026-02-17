import { useState, useEffect, useCallback, useRef } from 'react'
import { useAccount, useSignMessage } from 'wagmi'

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000'
const TOKEN_KEY = 'auth_token'

export function useAuth() {
    const { address, isConnected, isConnecting } = useAccount()
    const { signMessageAsync } = useSignMessage()
    const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY))
    const [authenticating, setAuthenticating] = useState(false)
    const authAttempted = useRef<string | null>(null)

    const authenticate = useCallback(async (walletAddress: string) => {
        if (authAttempted.current === walletAddress) return
        authAttempted.current = walletAddress
        setAuthenticating(true)

        try {
            console.log('[useAuth] Starting authentication for:', walletAddress)
            
            // Step 1: Get message to sign
            const msgRes = await fetch(`${API}/auth/get-message`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ walletAddress }),
            })
            const msgData = await msgRes.json()
            console.log('[useAuth] Got message to sign')
            
            if (!msgData.message) throw new Error('Failed to get auth message')

            // Step 2: Sign with wallet
            const signature = await signMessageAsync({ message: msgData.message })
            console.log('[useAuth] Message signed')

            // Step 3: Verify and get JWT
            const verifyRes = await fetch(`${API}/auth/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ walletAddress, signature }),
            })
            const verifyData = await verifyRes.json()

            if (verifyData.token) {
                console.log('[useAuth] Token received and stored')
                localStorage.setItem(TOKEN_KEY, verifyData.token)
                setToken(verifyData.token)
                authAttempted.current = null // Reset for future re-auth
            } else {
                throw new Error('No token received')
            }
        } catch (err) {
            console.error('[useAuth] Auth failed:', err)
            authAttempted.current = null // Reset so user can retry
        } finally {
            setAuthenticating(false)
        }
    }, [signMessageAsync])

    // Manual retry function
    const retry = useCallback(() => {
        if (address && isConnected) {
            authAttempted.current = null
            authenticate(address)
        }
    }, [address, isConnected, authenticate])

    // Clear token when wallet disconnects
    useEffect(() => {
        if (!isConnecting && !isConnected) {
            console.log('[useAuth] Wallet disconnected, clearing token')
            localStorage.removeItem(TOKEN_KEY)
            setToken(null)
            authAttempted.current = null
        }
    }, [isConnected, isConnecting])

    // Auto-authenticate when wallet connects and no token exists
    useEffect(() => {
        if (isConnected && address && !token && !authenticating && !isConnecting) {
            console.log('[useAuth] Wallet connected, no token, authenticating...')
            authenticate(address)
        }
    }, [isConnected, address, token, authenticating, isConnecting, authenticate])

    return { 
        token, 
        isAuthenticated: !!token && isConnected, 
        authenticating, 
        isConnected,
        retry 
    }
}
