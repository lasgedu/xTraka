import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Landing } from './pages/Landing'
import { Tasks } from './pages/Tasks'
import { Achievements } from './pages/Achievements'
import { ComingSoon } from './pages/ComingSoon'
import { Airdrop } from './pages/Airdrop'
import { Solutions } from './pages/Solutions'
import { CaseStudies } from './pages/CaseStudies'
import { Contributors } from './pages/Contributors'
import { ContactUs } from './pages/ContactUs'
import { QualityData } from './pages/QualityData'
import { Company } from './pages/Company'
import { Dashboard } from './pages/Dashboard'
import { SubmitPrompt } from './pages/SubmitPrompt'
import { MySubmissions } from './pages/MySubmissions'
import { EmotionQA } from './pages/EmotionQA'
import { AdminDashboard } from './pages/AdminDashboard'
import { AdminLogin } from './pages/AdminLogin'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/submit/:language" element={<SubmitPrompt />} />
        <Route path="/emotion-qa/:language" element={<EmotionQA />} />
        <Route path="/my-submissions" element={<MySubmissions />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/achievements" element={<Achievements />} />
        <Route path="/coming-soon" element={<ComingSoon />} />
        <Route path="/airdrop" element={<Airdrop />} />
        <Route path="/solutions" element={<Solutions />} />
        <Route path="/case-studies" element={<CaseStudies />} />
        <Route path="/contributors" element={<Contributors />} />
        <Route path="/contact-us" element={<ContactUs />} />
        <Route path="/quality-data" element={<QualityData />} />
        <Route path="/company" element={<Company />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App

