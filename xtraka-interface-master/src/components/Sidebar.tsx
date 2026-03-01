import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import '../pages/dashboard.css'

export function Sidebar() {
    const location = useLocation()
    const currentPath = location.pathname
    const { isAdmin, isSubAdmin } = useAuth()


    const isActive = (path: string) => {
        if (path === '/dashboard' && currentPath === '/dashboard') return true
        if (path !== '/dashboard' && currentPath.startsWith(path)) return true
        return false
    }

    return (
        <aside className="dashboard-sidebar">
            <div className="dashboard-brand">
                <img src="/xtraka-images/xtraka%20logo.png" alt="Traka" />
            </div>
            <nav className="dashboard-nav">
                <Link
                    to="/dashboard"
                    className={`dashboard-nav-btn ${isActive('/dashboard') ? 'dashboard-nav-active' : ''}`}
                    aria-label="Dashboard"
                >
                    <img src="/xtraka-images/dashboard.png" alt="" />
                </Link>
                <Link
                    to="/my-submissions"
                    className={`dashboard-nav-btn ${isActive('/my-submissions') ? 'dashboard-nav-active' : ''}`}
                    aria-label="My Submissions"
                >
                    <img src="/xtraka-images/task-list.svg" alt="" />
                </Link>
                <Link
                    to="/achievements"
                    className={`dashboard-nav-btn ${isActive('/achievements') ? 'dashboard-nav-active' : ''}`}
                    aria-label="Rewards"
                >
                    <img src="/xtraka-images/gifts%20logo.png" alt="" />
                </Link>
                <Link
                    to="/airdrop"
                    className={`dashboard-nav-btn ${isActive('/airdrop') ? 'dashboard-nav-active' : ''}`}
                    aria-label="Airdrop"
                >
                    <img src="/xtraka-images/airdrop%20icon.png" alt="" />
                </Link>

                {(isAdmin || isSubAdmin) && (
                    <Link
                        to="/admin"
                        className={`dashboard-nav-btn ${isActive('/admin') ? 'dashboard-nav-active' : ''}`}
                        aria-label="Admin"
                    >
                        <span style={{ fontSize: '1.5rem' }}>🛡️</span>
                    </Link>
                )}
            </nav>
            <div className="dashboard-sidebar-footer">
                <img src="/xtraka-images/Xtraka%20black.png" alt="Traka" />
            </div>
        </aside >
    )
}
