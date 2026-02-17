import { useState, useEffect } from 'react'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAuth } from '../hooks/useAuth'
import './achievements.css'
import { Sidebar } from '../components/Sidebar'

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000'

interface AchievementData {
  trustScore: number
  approvedRewards: number
  pendingRewards: number
  withdrawnRewards: number
  totalSubmissions: number
  approvedSubmissions: number
  pendingSubmissions: number
  rejectedSubmissions: number
  currentBadge: string
}

export function Achievements() {
  const { token, isAuthenticated, retry } = useAuth()
  const [data, setData] = useState<AchievementData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isAuthenticated || !token) {
      console.log('[Achievements] Not authenticated, isAuthenticated:', isAuthenticated, 'token:', !!token)
      setLoading(false)
      setError(null)
      return
    }

    console.log('[Achievements] Fetching achievements with token...')
    setError(null)
    setLoading(true)
    fetch(`${API}/achievements`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        console.log('[Achievements] Response status:', res.status)
        if (res.status === 401) {
          // Token expired or invalid - clear it and trigger re-auth
          console.log('[Achievements] Token invalid, clearing and prompting re-auth')
          localStorage.removeItem('auth_token')
          setError('Session expired. Please sign the message in your wallet to continue.')
          setLoading(false)
          // Trigger re-authentication
          setTimeout(() => retry(), 500)
          return null
        }
        if (!res.ok) {
          throw new Error('Failed to fetch achievements')
        }
        return res.json()
      })
      .then((json) => {
        if (json) {
          console.log('[Achievements] Data received')
          setData(json)
        }
        setLoading(false)
      })
      .catch((err) => {
        console.error('[Achievements] Failed to fetch achievements:', err)
        setError('Failed to load achievements')
        setLoading(false)
      })
  }, [isAuthenticated, token, retry])

  const tasksCompleted = data?.totalSubmissions ?? 0
  const badge = data?.currentBadge ?? 'Beginner'
  const approvedRewards = data?.approvedRewards?.toFixed(2) ?? '0.00'
  const pendingRewards = data?.pendingRewards?.toFixed(2) ?? '0.00'
  const withdrawnRewards = data?.withdrawnRewards?.toFixed(2) ?? '0.00'
  const trustScore = data?.trustScore ?? 0

  return (
    <div className="achievements-shell">
      <Sidebar />

      <div className="achievements-main">
        <header className="achievements-topbar" />

        <main className="achievements-content">
          <h1 className="achievements-title">Achievements</h1>

          {loading ? (
            <p style={{ color: 'var(--color-text-muted)' }}>Loading achievements…</p>
          ) : !isAuthenticated ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <p style={{ color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
                {error || 'Connect your wallet to view achievements'}
              </p>
              <ConnectButton />
              {error && (
                <button
                  onClick={retry}
                  style={{
                    marginTop: '1rem',
                    padding: '8px 16px',
                    background: 'rgba(59, 130, 246, 0.1)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    borderRadius: '8px',
                    color: '#60a5fa',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Retry Authentication
                </button>
              )}
            </div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <p style={{ color: 'var(--color-error)', marginBottom: '1rem' }}>{error}</p>
              <button
                onClick={retry}
                style={{
                  padding: '8px 16px',
                  background: 'rgba(59, 130, 246, 0.1)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  borderRadius: '8px',
                  color: '#60a5fa',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Retry Authentication
              </button>
            </div>
          ) : (
            <>
              <section className="achievements-summary">
                <div className="achievements-card">
                  <h2>Tasks Completed</h2>
                  <div className="achievements-card-row">
                    <img src="/xtraka-images/task-list.svg" alt="" />
                    <span>{tasksCompleted}</span>
                  </div>
                </div>
                <div className="achievements-card">
                  <h2>Badges</h2>
                  <div className="achievements-card-row">
                    <img src="/xtraka-images/intermidiete%20badge.png" alt="Badge" />
                    <span>{badge}</span>
                  </div>
                </div>
              </section>

              <section className="achievements-card achievements-card-wide">
                <div className="achievements-card-head">
                  <h2>Rewards Breakdown</h2>
                  <p>Your Rewards across different tasks</p>
                </div>
                <div className="achievements-divider" />
                <div className="achievements-table">
                  <div className="achievements-table-row achievements-table-head">
                    <span>Rewards Type</span>
                    <span>Status</span>
                    <span className="achievements-table-amount">Amount</span>
                  </div>
                  <div className="achievements-table-row">
                    <span>USDC</span>
                    <span>Approved</span>
                    <span className="achievements-table-amount">{approvedRewards}</span>
                  </div>
                  <div className="achievements-table-row">
                    <span>USDC</span>
                    <span>Pending</span>
                    <span className="achievements-table-amount">{pendingRewards}</span>
                  </div>
                  <div className="achievements-table-row">
                    <span>USDC</span>
                    <span>Withdrawn</span>
                    <span className="achievements-table-amount">{withdrawnRewards}</span>
                  </div>
                </div>
              </section>

              <section className="achievements-card achievements-tag-card">
                <div className="achievements-tag-score">
                  <span>{trustScore} %</span>
                </div>
                <div className="achievements-tag-text">
                  <h2>Tag Accuracy</h2>
                  <p>
                    Please Maintain a trust score above 49% to keep accessing the Platform
                  </p>
                </div>
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  )
}
