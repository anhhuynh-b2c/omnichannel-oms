'use client'

import { useI18n, type Locale } from '@/lib/i18n/context'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Globe } from 'lucide-react'
import { cn } from '@/lib/utils'

const LOCALES: { value: Locale; label: string; flag: string }[] = [
  { value: 'vi', label: 'Tiếng Việt', flag: '🇻🇳' },
  { value: 'en', label: 'English',    flag: '🇬🇧' },
]

export function LocaleSwitcher() {
  const { locale, setLocale } = useI18n()
  const current = LOCALES.find(l => l.value === locale)!

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2 text-xs font-medium">
          <Globe className="w-3.5 h-3.5" />
          <span>{current.flag}</span>
          <span className="hidden sm:inline">{current.label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        {LOCALES.map(l => (
          <DropdownMenuItem
            key={l.value}
            onClick={() => setLocale(l.value)}
            className={cn('gap-2 cursor-pointer', locale === l.value && 'bg-accent font-medium')}
          >
            <span>{l.flag}</span>
            <span>{l.label}</span>
            {locale === l.value && <span className="ml-auto text-primary">✓</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
