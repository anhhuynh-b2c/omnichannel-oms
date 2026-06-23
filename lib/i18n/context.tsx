'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import en from '@/messages/en.json'
import vi from '@/messages/vi.json'

export type Locale = 'en' | 'vi'

type Messages = typeof en

const MESSAGES: Record<Locale, Messages> = { en, vi }

interface I18nContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('locale') as Locale) ?? 'vi'
    }
    return 'vi'
  })

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l)
    if (typeof window !== 'undefined') localStorage.setItem('locale', l)
  }, [])

  const t = useCallback((key: string): string => {
    const parts = key.split('.')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let val: any = MESSAGES[locale]
    for (const part of parts) {
      val = val?.[part]
    }
    if (typeof val === 'string') return val
    // fallback to EN
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let fallback: any = MESSAGES['en']
    for (const part of parts) {
      fallback = fallback?.[part]
    }
    return typeof fallback === 'string' ? fallback : key
  }, [locale])

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}
