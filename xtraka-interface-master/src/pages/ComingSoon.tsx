import { Link } from 'react-router-dom'

export function ComingSoon() {
  return (
    <div className="app-page coming-soon-page">
      <header className="xtraka-app-header">
        <Link to="/" className="xtraka-app-header-left">
          <img src="/xtraka-images/xtraka%20logo.png" alt="Traka" className="xtraka-app-header-logo" />
          <span className="xtraka-app-header-brand">Traka</span>
        </Link>
        <div className="xtraka-app-header-right">
          <div className="xtraka-app-header-stack">
            <span className="xtraka-app-header-wallet-tasks">WalletTasks</span>
            <span className="xtraka-app-header-tasks-value">0.00 0.00</span>
          </div>
        </div>
      </header>

      <main className="coming-soon-main">
        <img src="/xtraka-images/airdrop%20icon.png" alt="Airdrop" className="coming-soon-icon" />
        <h1 className="coming-soon-title">Coming Soon</h1>
        <p className="coming-soon-text">
          Ensure to Participate in the Alpha Phase Tasks on the Dashboard to qualify for the Airdrop
        </p>
      </main>

      <style>{`
        .app-page { min-height: 100vh; background: var(--color-bg); color: var(--color-text); }
        .coming-soon-page { display: flex; flex-direction: column; }
        .coming-soon-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: var(--space-16) var(--space-6);
          text-align: center;
        }
        .coming-soon-icon { width: 96px; height: 96px; object-fit: contain; margin-bottom: var(--space-6); }
        .coming-soon-title { font-size: var(--text-3xl); font-weight: var(--font-bold); color: var(--color-text); margin: 0 0 var(--space-4) 0; }
        .coming-soon-text {
          font-size: var(--text-base);
          color: var(--color-text-muted);
          max-width: 28rem;
          margin: 0 0 var(--space-8) 0;
          line-height: 1.6;
        }
        .coming-soon-cta { text-decoration: none; }
      `}</style>
    </div>
  )
}
