import { NavLink } from 'react-router'
import { useT } from '../i18n'
import type { TKey } from '../i18n'
import { LanguageSwitcher } from './LanguageSwitcher'
import { ProfileSwitcher } from './ProfileSwitcher'

const NAV_ITEMS: Array<{ to: string; key: TKey }> = [
  { to: '/perfil', key: 'nav.profile' },
  { to: '/documentos', key: 'nav.documents' },
  { to: '/postulaciones', key: 'nav.postings' },
  { to: '/studio', key: 'nav.studio' },
  { to: '/historial', key: 'nav.history' },
  { to: '/ajustes', key: 'nav.settings' },
]

export function Layout({ children }: { children: React.ReactNode }) {
  const t = useT()
  return (
    <div className="app">
      <header className="app-header">
        <strong>TweakCV</strong>
        <nav aria-label="main">
          {NAV_ITEMS.map(({ to, key }) => (
            <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'active' : undefined)}>
              {t(key)}
            </NavLink>
          ))}
        </nav>
        <LanguageSwitcher />
        <ProfileSwitcher />
      </header>
      <main>{children}</main>
    </div>
  )
}
