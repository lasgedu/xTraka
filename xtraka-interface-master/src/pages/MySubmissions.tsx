import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'

import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAuth } from '../hooks/useAuth'
import './my-submissions.css'
import './dashboard.css'
import { Sidebar } from '../components/Sidebar'

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000'

interface Task {
    _id: string
    language: string
    title: string
    sourceText: string
    rewardAmount: number
}

interface Submission {
    _id: string
    taskId: Task | null
    status: 'pending' | 'approved' | 'rejected'
    aiVerification: {
        overallConfidence: number
        audioTranscription: string
        transcriptionMatch: boolean
        audioDuration: number
        verifiedAt: string | null
    }
    rejectionReason: string
    submittedAt: string
    createdAt: string
}

const STATUS_CONFIG = {
    pending: { label: 'Validating', emoji: '⏳', className: 'status-pending' },
    approved: { label: 'Approved', emoji: '✅', className: 'status-approved' },
    rejected: { label: 'Rejected', emoji: '❌', className: 'status-rejected' },
}

function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
}

export function MySubmissions() {
    const { token, isAuthenticated, authenticating } = useAuth()
    const [submissions, setSubmissions] = useState<Submission[]>([])
    const [loading, setLoading] = useState(true)

    const fetchSubmissions = useCallback(() => {
        if (!token) return
        fetch(`${API}/submissions/my-submissions`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((r) => r.json())
            .then((data) => {
                setSubmissions(Array.isArray(data) ? data : [])
                setLoading(false)
            })
            .catch(() => setLoading(false))
    }, [token])

    useEffect(() => {
        if (isAuthenticated) {
            fetchSubmissions()
        } else {
            setLoading(false)
        }
    }, [isAuthenticated, fetchSubmissions])

    // Auto-refresh every 10s to pick up validation results
    useEffect(() => {
        if (!isAuthenticated) return
        const interval = setInterval(fetchSubmissions, 10000)
        return () => clearInterval(interval)
    }, [isAuthenticated, fetchSubmissions])

    const stats = {
        total: submissions.length,
        approved: submissions.filter((s) => s.status === 'approved').length,
        pending: submissions.filter((s) => s.status === 'pending').length,
        rejected: submissions.filter((s) => s.status === 'rejected').length,
    }

    return (
        <div className="submissions-shell">
            <Sidebar />

            <div className="submissions-main">
                <header className="dashboard-topbar">
                    <div className="dashboard-topbar-spacer" />
                    <div className="dashboard-topbar-stats">
                        <div className="dashboard-connect">
                            <ConnectButton />
                        </div>
                    </div>
                </header>

                <main className="submissions-content">
                    <Link to="/dashboard" className="submit-back" style={{ marginBottom: '16px', display: 'inline-flex' }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="15 18 9 12 15 6" />
                        </svg>
                        Back to Dashboard
                    </Link>

                    <h1 className="submissions-title">My Submissions</h1>

                    {!isAuthenticated ? (
                        <div className="submit-done-card">
                            <div className="submit-done-icon">🔗</div>
                            <h2>{authenticating ? 'Signing In…' : 'Connect Your Wallet'}</h2>
                            <p>{authenticating ? 'Please sign the message in your wallet.' : 'Connect your wallet to view your submissions.'}</p>
                            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '8px' }}>
                                <ConnectButton />
                            </div>
                        </div>
                    ) : loading ? (
                        <div className="submit-loading">
                            <div className="submit-spinner" />
                            <span style={{ color: 'var(--color-text-muted)' }}>Loading submissions…</span>
                        </div>
                    ) : (
                        <>
                            {/* Stats bar */}
                            <div className="submissions-stats">
                                <div className="submissions-stat">
                                    <span className="stat-number">{stats.total}</span>
                                    <span className="stat-label">Total</span>
                                </div>
                                <div className="submissions-stat stat-approved">
                                    <span className="stat-number">{stats.approved}</span>
                                    <span className="stat-label">Approved</span>
                                </div>
                                <div className="submissions-stat stat-pending">
                                    <span className="stat-number">{stats.pending}</span>
                                    <span className="stat-label">Validating</span>
                                </div>
                                <div className="submissions-stat stat-rejected">
                                    <span className="stat-number">{stats.rejected}</span>
                                    <span className="stat-label">Rejected</span>
                                </div>
                            </div>

                            {submissions.length === 0 ? (
                                <div className="submit-done-card" style={{ marginTop: '32px' }}>
                                    <div className="submit-done-icon">📭</div>
                                    <h2>No Submissions Yet</h2>
                                    <p>Go to the dashboard and start completing prompts to earn rewards!</p>
                                    <Link to="/dashboard" className="submit-back-link">→ Go to Dashboard</Link>
                                </div>
                            ) : (
                                <div className="submissions-list">
                                    {submissions.map((sub) => {
                                        const cfg = STATUS_CONFIG[sub.status]
                                        const task = sub.taskId
                                        const lang = task?.language
                                            ? task.language.charAt(0).toUpperCase() + task.language.slice(1)
                                            : '—'
                                        const prompt = task?.sourceText
                                            ? task.sourceText.length > 80
                                                ? task.sourceText.slice(0, 80) + '…'
                                                : task.sourceText
                                            : '—'

                                        return (
                                            <div key={sub._id} className={`submission-card ${cfg.className}`}>
                                                <div className="submission-card-top">
                                                    <div className="submission-lang-badge">{lang}</div>
                                                    <span className={`submission-status-badge ${cfg.className}`}>
                                                        {cfg.emoji} {cfg.label}
                                                    </span>
                                                </div>

                                                <p className="submission-prompt">{prompt}</p>

                                                <div className="submission-card-bottom">
                                                    <span className="submission-time">{timeAgo(sub.submittedAt || sub.createdAt)}</span>

                                                    {sub.status === 'approved' && (
                                                        <span className="submission-accuracy">
                                                            {sub.aiVerification.overallConfidence}% match
                                                        </span>
                                                    )}

                                                    {sub.status === 'rejected' && sub.rejectionReason && (
                                                        <span className="submission-reason" title={sub.rejectionReason}>
                                                            {sub.rejectionReason.length > 50
                                                                ? sub.rejectionReason.slice(0, 50) + '…'
                                                                : sub.rejectionReason}
                                                        </span>
                                                    )}

                                                    {sub.status === 'pending' && (
                                                        <span className="submission-validating">
                                                            <span className="dot-pulse" /> AI validating…
                                                        </span>
                                                    )}

                                                    {sub.status === 'approved' && task?.rewardAmount && (
                                                        <span className="submission-reward">+${task.rewardAmount} USDC</span>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </>
                    )}
                </main>
            </div>
        </div>
    )
}
