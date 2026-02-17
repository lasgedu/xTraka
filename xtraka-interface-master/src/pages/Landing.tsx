import { Link } from 'react-router-dom'
import './landing.css'

const NAV_LEFT = [
  { label: 'Qaulity Data', to: '/quality-data' },
  { label: 'Solutions', to: '/solutions' },
  { label: 'Contributors', to: '/contributors' },
]
const NAV_RIGHT = [
  { label: 'Company', to: '/company' },
  { label: 'Case Studies', to: '/case-studies' },
  { label: 'Contact Us', to: '/contact-us' },
]

export function Landing() {
  return (
    <div className="landing-page">
      <header className="landing-header">
        <div className="landing-header-inner">
          <Link to="/" className="landing-logo">
            <img src="/xtraka-images/Xtraka%20black.png" alt="Traka" className="landing-logo-img" />
          </Link>
          <nav className="landing-nav">
            <div className="landing-nav-col">
              {NAV_LEFT.map((item) => (
                <Link key={item.to} to={item.to} className="landing-nav-link">
                  {item.label}
                </Link>
              ))}
            </div>
            <div className="landing-nav-col">
              {NAV_RIGHT.map((item) => (
                <Link key={item.to} to={item.to} className="landing-nav-link">
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>
        </div>
      </header>

      <section className="landing-hero-intro">
        <div className="landing-hero-intro-left landing-hero-col">
          <h1>
            The Data House
            <br />
            For African Languages
          </h1>
        </div>
        <div className="landing-hero-intro-middle landing-hero-col">
          <p className="landing-hero-intro-copy">
            Xtraka is a decentralized data foundry, Collecting African Language data for
            enterprise-grade AI training data.
          </p>
        </div>
        <div className="landing-hero-intro-right landing-hero-col">
          <Link to="/dashboard" className="landing-hero-cta">
            Get Started <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>

      <section className="landing-hero-image">
        <img src="/xtraka-images/First%20Page%20people.jpg" alt="Hero" />
      </section>

      <section className="landing-hero-caption">
        <div className="landing-hero-caption-text">
          Building for Tomorrows Inclusion of African Languages
        </div>
        <div className="landing-hero-caption-logos">
          <img src="/xtraka-images/Google_Translate_logo.svg.png" alt="Google" />
          <img src="/xtraka-images/iTranslate_Logo.png" alt="iTranslate" />
          <img src="/xtraka-images/DeepL_logo.svg" alt="DeepL" />
          <img src="/xtraka-images/Reverso_Logo.png" alt="Reverso" />
        </div>
      </section>

      <section className="landing-grid-two">
        <div className="landing-grid-card landing-grid-left">
          <div className="landing-grid-content">
            <p className="landing-small-title">Different  by Integration</p>
            <h2 className="landing-big-title">
              High-quality, generative African Language Data at Enterprise Scale
            </h2>
          </div>
          <div className="landing-grid-footer">
            <img src="/xtraka-images/Xtraka%20black2.png" alt="Xtraka" className="landing-footer-logo" />
            <span className="landing-ai-text">AI</span>
          </div>
        </div>
        <div className="landing-grid-card landing-grid-right">
          <div className="landing-inclusion-item">
            <h3 className="landing-inclusion-title">Data Inclusion</h3>
            <p className="landing-inclusion-desc">Generating high-quality datasets to<br />include African languages in global<br />translation ecosystems.</p>
          </div>
          <div className="landing-inclusion-item">
            <h3 className="landing-inclusion-title">Cultural Accuracy</h3>
            <p className="landing-inclusion-desc">Ensuring translations data are culturally<br />grounded and regionally specific for<br />accurate meanings.</p>
          </div>
          <div className="landing-inclusion-item">
            <h3 className="landing-inclusion-title">Community Inclusion</h3>
            <p className="landing-inclusion-desc">Engage native speakers to foster digital<br />literacy and economic opportunities.</p>
          </div>
        </div>
      </section>

      <section className="landing-grid-three">
        <div className="landing-grid-card">
          <div className="landing-grid-three-content">
            <span className="landing-tag landing-tag-centered">Decentralized Data Collection</span>
          </div>
          <div className="landing-icon-row">
            <img src="/xtraka-images/Bleu%20Blanc%20u.png" alt="" />
            <img src="/xtraka-images/Bleu-Blanc_mother.png" alt="" />
          </div>
        </div>
        <div className="landing-grid-card">
          <div className="landing-grid-three-content">
            <span className="landing-tag landing-tag-centered">Language Specialists</span>
          </div>
          <div className="landing-icon-row">
            <img src="/xtraka-images/Bleu%20Blanc%20man.png" alt="" />
          </div>
        </div>
        <div className="landing-grid-card">
          <div className="landing-grid-three-content">
            <span className="landing-tag landing-tag-centered">Text/ Audio Data Annotation</span>
          </div>
          <div className="landing-icon-row">
            <img src="/xtraka-images/Bleu%20Blanc%20door.png" alt="" />
            <img src="/xtraka-images/Nsibidi_matchet-.png" alt="" />
          </div>
        </div>
      </section>

      <section className="landing-contributors">
        <div className="landing-contributors-inner">
          <div className="landing-contributors-text">
            <h3>Join Our Network of Contributors</h3>
            <p>
              Join our Forward-thinking African Contributors who are already contributing to the integration of African languages into global translation Ecosystems
            </p>
            <div className="landing-arrow-row">
              <Link to="/dashboard" className="landing-arrow-link">
                <span className="landing-arrow">→</span>
              </Link>
            </div>
          </div>
          <div className="landing-contributors-image">
            <img src="/xtraka-images/Network%20contriburors%20image.jpg" alt="Contributors" />
          </div>
        </div>
      </section>

      <section className="landing-marketplace-grid">
        <div className="landing-marketplace-cell landing-marketplace-left-top">
          <h4>Marketplace</h4>
          <p>
            Access high-quality African Language-specific datasets,<br />
            ready to power your next breakthrough of your<br />
            Translations
          </p>
        </div>
        <div className="landing-marketplace-cell landing-marketplace-right-top">
          <h4>
            Curated culturally Accurate Data<br />
            Ready To Train
          </h4>
        </div>
        <div className="landing-marketplace-cell landing-marketplace-left-bottom">
          <img src="/xtraka-images/Language%20Translation%20Companies.png" alt="Language Translation Companies" />
        </div>
        <div className="landing-marketplace-cell landing-marketplace-right-bottom">
          <div className="landing-marketplace-item">
            <span>Expert Reasoning</span>
          </div>
          <div className="landing-marketplace-item">
            <img src="/xtraka-images/Bleu%20Blanc%20circle.png" alt="" />
            <span>Audio</span>
          </div>
          <div className="landing-marketplace-item">
            <img src="/xtraka-images/Nsibidi.png" alt="" />
            <span>Text</span>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-footer-left">
          <img src="/xtraka-images/Xtraka%20black.png" alt="Traka" />
        </div>
        <div className="landing-footer-cols">
          <div>
            <Link to="/quality-data">Quality Data</Link>
            <Link to="/solutions">Solutions</Link>
            <Link to="/contributors">Contributors</Link>
          </div>
          <div>
            <Link to="/company">Company</Link>
            <Link to="/case-studies">Case Studies</Link>
            <Link to="/contact-us">Contact Us</Link>
          </div>
        </div>
        <div className="landing-footer-mark" />
      </footer>
    </div>
  )
}
