import { ConnectButton } from '@rainbow-me/rainbowkit'
import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import './dashboard.css'
import { Sidebar } from '../components/Sidebar'

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000'

const LANGUAGE_TASKS = [
  { id: 'igbo', title: 'Igbo Prompt', language: 'Igbo', amount: '0.2', currency: 'USDC', clickable: true },
  { id: 'hausa', title: 'Hausa Prompt', language: 'Hausa', amount: '0.2', currency: 'USDC', clickable: true },
  { id: 'pidgin', title: 'Pidgin Prompt', language: 'Pidgin', amount: '0.2', currency: 'USDC', clickable: true },
]

const QA_TASKS = [
  { id: 'igbo', title: 'Emotion Q/A', subtitle: 'Igbo', amount: '0.2', currency: 'USDC' },
  { id: 'pidgin', title: 'Emotion Q/A', subtitle: 'Pidgin', amount: '0.2', currency: 'USDC' },
]

interface UserStats {
  totalSubmissions: number
  approvedSubmissions: number
  pendingSubmissions: number
  rejectedSubmissions: number
}

export function Dashboard() {
  const { token, isAuthenticated } = useAuth()
  const [userStats, setUserStats] = useState<UserStats | null>(null)

  useEffect(() => {
    if (isAuthenticated && token) {
      fetch(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => {
          if (res.status === 401) {
            // Token expired, clear it
            localStorage.removeItem('auth_token')
            return null
          }
          return res.json()
        })
        .then(data => {
          if (data) {
            setUserStats({
              totalSubmissions: data.totalSubmissions || 0,
              approvedSubmissions: data.approvedSubmissions || 0,
              pendingSubmissions: data.pendingSubmissions || 0,
              rejectedSubmissions: data.rejectedSubmissions || 0,
            })
          }
        })
        .catch(err => console.error('Failed to fetch user stats:', err))
    }
  }, [isAuthenticated, token])

  return (
    <div className="dashboard-shell">
      <Sidebar />

      <div className="dashboard-main">
        <header className="dashboard-topbar">
          <div className="dashboard-topbar-spacer" />
          <div className="dashboard-topbar-stats">
            <div className="dashboard-stat">
              <img src="/xtraka-images/task-list.svg" alt="" />
              <div>
                <span>Tasks Completed</span>
                <strong>{userStats?.totalSubmissions ?? 0}</strong>
              </div>
            </div>
            <div className="dashboard-connect">
              <ConnectButton />
            </div>
          </div>
        </header>

        <main className="dashboard-content">
          <h1 className="dashboard-title">Select a Task</h1>

          <div className="dashboard-grid">
            {/* Clickable language prompt cards */}
            {LANGUAGE_TASKS.map((task) => (
              <Link
                key={task.id}
                to={`/submit/${task.id}`}
                className="dashboard-task-card"
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <div className="dashboard-task-icon">
                  <img src="/xtraka-images/Language%20Icon.svg" alt="" />
                </div>
                <div className="dashboard-task-text">
                  <span className="dashboard-task-title">{task.title}</span>
                  <span className="dashboard-task-subtitle">{task.language}</span>
                </div>
                <span className="dashboard-task-chip">$ {task.amount} {task.currency}</span>
              </Link>
            ))}

            {/* Clickable Emotion Q/A cards */}
            {QA_TASKS.map((task) => (
              <Link
                key={task.id}
                to={`/emotion-qa/${task.id}`}
                className="dashboard-task-card"
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <div className="dashboard-task-icon">
                  <img src="/xtraka-images/Language%20Icon.svg" alt="" />
                </div>
                <div className="dashboard-task-text">
                  <span className="dashboard-task-title">{task.title}</span>
                  <span className="dashboard-task-subtitle">{task.subtitle}</span>
                </div>
                <span className="dashboard-task-chip">$ {task.amount} {task.currency}</span>
              </Link>
            ))}
          </div>

          {isAuthenticated && (
            <div className="dashboard-wallet-note">
              Tasks completed: <span>{userStats?.totalSubmissions ?? 0}</span>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
