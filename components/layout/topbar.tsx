'use client'

import { Moon, Sun, Search } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { LocaleSwitcher } from './locale-switcher'
import { NotificationPanel } from './notification-panel'
import { useI18n } from '@/lib/i18n/context'
import { getAccountProfile } from '@/lib/actions/account.actions'

interface TopbarProps {
  titleKey?: string
  title?: string
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Quản trị viên',
  WAREHOUSE_STAFF: 'Nhân viên kho',
  SALES_STAFF: 'Nhân viên bán hàng',
}

export function Topbar({ titleKey, title }: TopbarProps) {
  const { setTheme, theme } = useTheme()
  const { t } = useI18n()
  const router = useRouter()
  const [userName, setUserName] = useState<string>('')
  const [userRole, setUserRole] = useState<string>('')

  useEffect(() => {
    getAccountProfile().then(profile => {
      setUserName(profile.name)
      setUserRole(ROLE_LABELS[profile.role_name] ?? profile.role_name)
    }).catch(() => {})
  }, [])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const displayTitle = titleKey ? t(titleKey) : (title ?? '')
  const initials = userName
    ? userName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  return (
    <header className="h-16 border-b bg-background flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-semibold text-foreground">{displayTitle}</h1>
      </div>

      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t('common.search') + '...'}
            className="pl-8 w-48 h-8 text-sm bg-muted border-0 focus-visible:ring-1"
          />
        </div>

        {/* Language switcher */}
        <LocaleSwitcher />

        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>

        {/* Notifications */}
        <NotificationPanel />

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-auto gap-2 px-2 py-1">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="text-xs bg-blue-600 text-white">{initials}</AvatarFallback>
              </Avatar>
              <div className="hidden md:flex flex-col items-start leading-tight">
                <span className="text-sm font-medium">{userName || '...'}</span>
                {userRole && <span className="text-[11px] text-muted-foreground">{userRole}</span>}
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={() => router.push('/settings?tab=company')}>
              {t('settings.company')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/settings')}>
              {t('nav.settings')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={handleSignOut}>
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
