import { useState, useEffect } from 'react'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount } from 'wagmi'
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
  const { address } = useAccount()
  const [data, setData] = useState<AchievementData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [withdrawing, setWithdrawing] = useState(false)
  const [withdrawMessage, setWithdrawMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [pendingWithdrawalTotal, setPendingWithdrawalTotal] = useState(0)

  useEffect(() => {
    if (!isAuthenticated || !token) {
      setLoading(false)
      setError(null)
      return
    }


    setError(null)
    setLoading(true)
    fetch(`${API}/achievements`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {

        if (res.status === 401) {
          // Token expired or invalid - clear it and trigger re-auth

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
  const rawAvailableBalance = (data?.approvedRewards ?? 0) - (data?.withdrawnRewards ?? 0) - pendingWithdrawalTotal
  const availableBalance = Math.max(0, Math.floor(rawAvailableBalance * 10) / 10)

  // Fetch pending withdrawal total whenever data refreshes
  useEffect(() => {
    if (!isAuthenticated || !token) return
    fetch(`${API}/withdrawals/my-withdrawals`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => setPendingWithdrawalTotal(d.pendingWithdrawalTotal || 0))
      .catch(() => { })
  }, [isAuthenticated, token, data])

  const handleWithdraw = async () => {
    if (!address) return alert('Wallet not connected')
    const amount = Math.floor(parseFloat(withdrawAmount) * 10) / 10
    if (!amount || amount <= 0) return alert('Enter a valid amount')
    if (amount > availableBalance) return alert('Amount exceeds available balance')

    setWithdrawing(true)
    setWithdrawMessage(null)
    try {
      const res = await fetch(`${API}/withdrawals/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ walletAddress: address, amount }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.message || 'Failed to request withdrawal')
      setWithdrawMessage({ type: 'success', text: `Withdrawal of ${amount} xUSDC requested! It will be sent to your wallet shortly.` })
      setWithdrawAmount('')
      // Refresh achievements data + pending totals
      const refreshRes = await fetch(`${API}/achievements`, { headers: { Authorization: `Bearer ${token}` } })
      if (refreshRes.ok) setData(await refreshRes.json())
      const wRes = await fetch(`${API}/withdrawals/my-withdrawals`, { headers: { Authorization: `Bearer ${token}` } })
      if (wRes.ok) { const wd = await wRes.json(); setPendingWithdrawalTotal(wd.pendingWithdrawalTotal || 0) }
    } catch (err: unknown) {
      setWithdrawMessage({ type: 'error', text: err instanceof Error ? err.message : 'Withdrawal failed' })
    } finally {
      setWithdrawing(false)
    }
  }

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
                    <span>xUSDC</span>
                    <span>Approved</span>
                    <span className="achievements-table-amount">{approvedRewards}</span>
                  </div>
                  <div className="achievements-table-row">
                    <span>xUSDC</span>
                    <span>Pending</span>
                    <span className="achievements-table-amount">{pendingRewards}</span>
                  </div>
                  <div className="achievements-table-row">
                    <span>xUSDC</span>
                    <span>Withdrawn</span>
                    <span className="achievements-table-amount">{withdrawnRewards}</span>
                  </div>
                </div>
              </section>

              {/* Withdraw Section */}
              <section className="achievements-card achievements-card-wide">
                <div className="achievements-card-head">
                  <h2>💸 Withdraw Rewards</h2>
                  <p>Send your earned tokens to your wallet on Arbitrum Sepolia</p>
                </div>
                <div className="achievements-divider" />

                <div style={{ padding: '0.5rem 0' }}>
                  {/* Available balance */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>Available to withdraw</span>
                    <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#34d399' }}>{availableBalance.toFixed(2)} xUSDC</span>
                  </div>

                  {/* Wallet address display */}
                  {address && (
                    <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>
                      Sending to: <span style={{ fontFamily: 'monospace', color: 'rgba(255,255,255,0.8)' }}>{address}</span>
                    </div>
                  )}

                  {/* Amount input + button */}
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'stretch' }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max={availableBalance}
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        placeholder="0.00"
                        disabled={availableBalance <= 0}
                        style={{
                          width: '100%',
                          padding: '0.85rem 4.5rem 0.85rem 1rem',
                          background: 'rgba(0,0,0,0.3)',
                          border: '1px solid rgba(255,255,255,0.15)',
                          borderRadius: '10px',
                          color: '#fff',
                          fontSize: '1rem',
                          boxSizing: 'border-box',
                        }}
                      />
                      {availableBalance > 0 && (
                        <button
                          type="button"
                          onClick={() => setWithdrawAmount(availableBalance.toFixed(1))}
                          style={{
                            position: 'absolute',
                            right: '10px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'rgba(52, 211, 153, 0.15)',
                            border: '1px solid rgba(52, 211, 153, 0.3)',
                            borderRadius: '6px',
                            padding: '4px 10px',
                            color: '#34d399',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                          }}
                        >
                          MAX
                        </button>
                      )}
                    </div>
                    <button
                      onClick={handleWithdraw}
                      disabled={withdrawing || availableBalance <= 0}
                      style={{
                        padding: '0.85rem 1.75rem',
                        background: availableBalance > 0 ? 'linear-gradient(135deg, #34d399, #059669)' : 'rgba(255,255,255,0.1)',
                        border: 'none',
                        borderRadius: '10px',
                        color: '#fff',
                        fontSize: '0.95rem',
                        fontWeight: 'bold',
                        cursor: availableBalance > 0 ? 'pointer' : 'not-allowed',
                        whiteSpace: 'nowrap',
                        opacity: withdrawing ? 0.7 : 1,
                      }}
                    >
                      {withdrawing ? 'Processing...' : 'Withdraw'}
                    </button>
                  </div>

                  {/* Status message */}
                  {withdrawMessage && (
                    <div style={{
                      marginTop: '1rem',
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      background: withdrawMessage.type === 'success' ? 'rgba(52, 211, 153, 0.1)' : 'rgba(248, 113, 113, 0.1)',
                      border: `1px solid ${withdrawMessage.type === 'success' ? 'rgba(52, 211, 153, 0.3)' : 'rgba(248, 113, 113, 0.3)'}`,
                      color: withdrawMessage.type === 'success' ? '#34d399' : '#f87171',
                    }}>
                      {withdrawMessage.text}
                    </div>
                  )}

                  {availableBalance <= 0 && (
                    <p style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
                      Complete and get tasks approved to earn rewards you can withdraw.
                    </p>
                  )}
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
