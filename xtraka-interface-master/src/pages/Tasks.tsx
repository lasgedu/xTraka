import { Link } from 'react-router-dom'
import { Card } from '../components'

const TASKS = [
  { id: '1', title: 'Igbo Prompt', amount: '0.2', currency: 'USDC' },
  { id: '2', title: 'Hausa Prompt', amount: '0.2', currency: 'USDC' },
  { id: '3', title: 'Pidgin Prompt', amount: '0.2', currency: 'USDC' },
  { id: '4', title: 'Q&A Logic', subtitle: 'Igbo', amount: '0.2', currency: 'USDC' },
  { id: '5', title: 'Q&A Logic', subtitle: 'Igbo', amount: '0.2', currency: 'USDC' },
]

export function Tasks() {
  return (
    <div className="app-page">
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

      <main className="app-main">
        <h1 className="tasks-title">Select a Task</h1>
        <div className="tasks-grid">
          {TASKS.map((task) => (
            <Card
              key={task.id}
              title={task.title}
              subtitle={task.subtitle ? task.subtitle : `$ ${task.amount} ${task.currency}`}
            >
              <div className="tasks-card-footer">
                <span className="tasks-card-amount">$ {task.amount} {task.currency}</span>
                <button type="button" className="xtraka-btn-primary tasks-card-btn">Start</button>
              </div>
            </Card>
          ))}
        </div>
      </main>

      <style>{`
        .app-page { min-height: 100vh; background: var(--color-bg); color: var(--color-text); }
        .app-main { max-width: 1280px; margin: 0 auto; padding: var(--space-8) var(--space-6); }
        .tasks-title { font-size: var(--text-2xl); font-weight: var(--font-bold); color: var(--color-text); margin: 0 0 var(--space-6) 0; }
        .tasks-grid {
          display: grid;
          gap: var(--space-4);
          grid-template-columns: 1fr;
        }
        @media (min-width: 640px) { .tasks-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (min-width: 1024px) { .tasks-grid { grid-template-columns: repeat(3, 1fr); } }
        .tasks-card-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: var(--space-4);
          padding-top: var(--space-4);
          border-top: 1px solid var(--color-border);
        }
        .tasks-card-amount { font-size: var(--text-sm); color: var(--color-text-muted); }
        .tasks-card-btn { text-decoration: none; }
      `}</style>
    </div>
  )
}
