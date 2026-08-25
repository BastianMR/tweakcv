import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { dictionaries } from './dictionaries'
import type { TKey } from './dictionaries'

export type { TKey }
export type Lang = keyof typeof dictionaries

const STORAGE_KEY = 'tweakcv.lang'

function initialLang(): Lang {
  const stored = localStorage.getItem(STORAGE_KEY)
  return stored === 'en' ? 'en' : 'es'
}

interface LanguageCtx {
  lang: Lang
  setLang: (lang: Lang) => void
}

const LanguageContext = createContext<LanguageCtx | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang)

  const setLang = useCallback((next: Lang) => {
    localStorage.setItem(STORAGE_KEY, next)
    document.documentElement.lang = next
    setLangState(next)
  }, [])

  const value = useMemo(() => ({ lang, setLang }), [lang, setLang])
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLang(): LanguageCtx {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLang fuera de LanguageProvider')
  return ctx
}

/** Traduce `key` con interpolación mínima: t('saludo', { name: 'Ana' }) → "Hola {name}" */
export function useT() {
  const { lang } = useLang()
  return useCallback(
    (key: TKey, params?: Record<string, string | number>): string => {
      let text: string = dictionaries[lang][key]
      if (params) {
        for (const [name, value] of Object.entries(params)) {
          text = text.replaceAll(`{${name}}`, String(value))
        }
      }
      return text
    },
    [lang],
  )
}
