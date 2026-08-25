import { useLang, useT } from '../i18n'
import type { Lang } from '../i18n'

export function LanguageSwitcher() {
  const { lang, setLang } = useLang()
  const t = useT()
  return (
    <label>
      <span aria-hidden>🌐</span>{' '}
      <select
        aria-label={t('settings.language')}
        value={lang}
        onChange={(e) => setLang(e.target.value as Lang)}
      >
        <option value="es">ES</option>
        <option value="en">EN</option>
      </select>
    </label>
  )
}
