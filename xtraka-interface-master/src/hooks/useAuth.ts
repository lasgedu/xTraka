import { useState, useEffect, useCallback } from 'react'
import { useAccount, useSignMessage } from 'wagmi'

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000'
const TOKEN_KEY = 'auth_token'

// Global state to prevent multiple components from triggering auth simultaneously
let isGlobalAuthenticating = false
let globalAuthAttemptedFor: string | null = null

export function useAuth() {
    const { address, isConnected, isConnecting } = useAccount()
    const { signMessageAsync } = useSignMessage()
    const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY))
    const [authenticating, setAuthenticating] = useState(false)

    // Sync token across multiple instances of the hook
    useEffect(() => {
        const handleTokenUpdate = () => {
            setToken(localStorage.getItem(TOKEN_KEY))
        }

        window.addEventListener('auth-token-updated', handleTokenUpdate)
        window.addEventListener('storage', handleTokenUpdate)

        return () => {
            window.removeEventListener('auth-token-updated', handleTokenUpdate)
            window.removeEventListener('storage', handleTokenUpdate)
        }
    }, [])

    const authenticate = useCallback(async (walletAddress: string) => {
        // Check global state to prevent duplicate requests
        if (isGlobalAuthenticating || globalAuthAttemptedFor === walletAddress) return

        isGlobalAuthenticating = true
        globalAuthAttemptedFor = walletAddress
        setAuthenticating(true)

        try {


            // Step 1: Get message to sign
            const msgRes = await fetch(`${API}/auth/get-message`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ walletAddress }),
            })
            const msgData = await msgRes.json()


            if (!msgData.message) throw new Error('Failed to get auth message')

            // Step 2: Sign with wallet
            const signature = await signMessageAsync({ message: msgData.message })


            // Step 3: Verify and get JWT
            const verifyRes = await fetch(`${API}/auth/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ walletAddress, signature }),
            })
            const verifyData = await verifyRes.json()

            if (verifyData.token) {

                localStorage.setItem(TOKEN_KEY, verifyData.token)
                setToken(verifyData.token)

                // Notify other instances
                window.dispatchEvent(new Event('auth-token-updated'))
            } else {
                throw new Error('No token received')
            }
        } catch (err) {
            console.error('[useAuth] Auth failed:', err)
            // Allow retry if it failed (e.g. user rejected)
            globalAuthAttemptedFor = null
        } finally {
            isGlobalAuthenticating = false
            setAuthenticating(false)
        }
    }, [signMessageAsync])

    // Manual retry function
    const retry = useCallback(() => {
        if (address && isConnected) {
            globalAuthAttemptedFor = null
            authenticate(address)
        }
    }, [address, isConnected, authenticate])

    // Clear token when wallet disconnects
    useEffect(() => {
        if (!isConnecting && !isConnected && token) {

            localStorage.removeItem(TOKEN_KEY)
            setToken(null)
            globalAuthAttemptedFor = null
            window.dispatchEvent(new Event('auth-token-updated'))
        }
    }, [isConnected, isConnecting, token])

    // Auto-authenticate when wallet connects and no token exists
    useEffect(() => {
        if (isConnected && address && !token && !isGlobalAuthenticating && !isConnecting) {
            // Check again inside effect to be sure
            if (globalAuthAttemptedFor !== address) {

                authenticate(address)
            }
        }
    }, [isConnected, address, token, isConnecting, authenticate])

    // Helper to decode JWT without library
    const parseJwt = (token: string) => {
        try {
            return JSON.parse(atob(token.split('.')[1]))
        } catch (e) {
            return null
        }
    }

    const [userRoles, setUserRoles] = useState({ isAdmin: false, isSubAdmin: false })

    useEffect(() => {
        if (token) {
            const decoded = parseJwt(token)
            if (decoded) {
                setUserRoles({
                    isAdmin: !!decoded.isAdmin,
                    isSubAdmin: !!decoded.isSubAdmin,
                })
            }
        } else {
            setUserRoles({ isAdmin: false, isSubAdmin: false })
        }
    }, [token])

    return {
        token,
        isAuthenticated: !!token && isConnected,
        authenticating: authenticating || isGlobalAuthenticating, // Show authenticating if ANY instance is doing it
        isConnected,
        retry,
        isAdmin: userRoles.isAdmin,
        isSubAdmin: userRoles.isSubAdmin,
    }
}
