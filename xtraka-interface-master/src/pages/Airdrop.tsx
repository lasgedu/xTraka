
import './airdrop.css'
import { Sidebar } from '../components/Sidebar'

export function Airdrop() {
  return (
    <div className="airdrop-page">
      <Sidebar />

      <div className="airdrop-main">
        <header className="airdrop-topbar" />

        <main className="airdrop-content">
          <div className="airdrop-card">
            <img src="/xtraka-images/Airdrop%20ballon.png" alt="Airdrop balloon" className="airdrop-hero" />
            <h1 className="airdrop-title">Coming Soon</h1>
            <p className="airdrop-text">
              Ensure to participate in the Alpha Phase tasks on the dashboard to qualify for the airdrop.
            </p>
          </div>
        </main>
      </div>
    </div>
  )
}
