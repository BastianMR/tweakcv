import { Route, Routes } from 'react-router'
import { Layout } from './components/Layout'
import { useT } from './i18n'
import { ProfilePage } from './pages/Profile'
import { OnboardingPage } from './pages/Onboarding'
import { DocumentsPage } from './pages/Documents'
import { PostingsPage } from './pages/Postings'
import { StudioPage } from './pages/Studio'
import { HistoryPage } from './pages/History'
import { SettingsPage } from './pages/Settings'

export default function App() {
  const t = useT()

  return (
    <Layout>
      <p className="tagline">{t('app.tagline')}</p>
      <Routes>
        <Route path="/" element={<ProfilePage />} />
        <Route path="/perfil" element={<ProfilePage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/documentos" element={<DocumentsPage />} />
        <Route path="/postulaciones" element={<PostingsPage />} />
        <Route path="/studio" element={<StudioPage />} />
        <Route path="/historial" element={<HistoryPage />} />
        <Route path="/ajustes" element={<SettingsPage />} />
      </Routes>
    </Layout>
  )
}
