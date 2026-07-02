'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Package,
  Warehouse,
  ShoppingCart,
  ClipboardList,
  Plug,
  Settings,
  ChevronLeft,
  ChevronRight,
  Store,
  ShoppingBag,
  Tag,
  Truck,
  LogOut,
  BarChart2,
  Calculator,
  ScrollText,
  Users,
  PackageCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useI18n } from '@/lib/i18n/context'
import { createClient } from '@/lib/supabase/client'
import { NAV_ITEMS, type Role } from '@/lib/auth/roles'

const ICON_MAP: Record<string, React.ElementType> = {
  '/':                LayoutDashboard,
  '/products':        Package,
  '/categories':      Tag,
  '/inventory':       Warehouse,
  '/fulfillment':     PackageCheck,
  '/customers':       Users,
  '/orders':          ShoppingCart,
  '/sale':            ShoppingBag,
  '/purchase-orders': ClipboardList,
  '/suppliers':       Truck,
  '/reports':         BarChart2,
  '/accountant':      Calculator,
  '/integrations':    Plug,
  '/audit-logs':      ScrollText,
  '/settings':        Settings,
}

interface SidebarProps {
  role: Role | null
}

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const { t } = useI18n()

  const visibleItems = NAV_ITEMS.filter(item =>
    role && (item.roles as readonly string[]).includes(role)
  )

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'relative flex flex-col h-full bg-slate-900 text-white transition-all duration-300 ease-in-out shrink-0',
          collapsed ? 'w-16' : 'w-60'
        )}
      >
        {/* Logo */}
        <div className="flex items-center h-16 px-4 border-b border-slate-700 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center shrink-0">
              <Store className="w-4 h-4 text-white" />
            </div>
            {!collapsed && (
              <div className="overflow-hidden">
                <p className="text-sm font-bold text-white truncate">OmniOMS</p>
                <p className="text-xs text-slate-400 truncate">Management System</p>
              </div>
            )}
          </div>
        </div>

        {/* Nav */}
        <ScrollArea className="flex-1 py-4">
          <nav className="px-2 space-y-1">
            {visibleItems.map(item => {
              const Icon = ICON_MAP[item.href] ?? Package
              const isActive =
                item.href === '/'
                  ? pathname === '/'
                  : pathname.startsWith(item.href)

              const linkContent = (
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white',
                    collapsed && 'justify-center px-2'
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {!collapsed && <span className="truncate">{t(item.label)}</span>}
                </Link>
              )

              if (collapsed) {
                return (
                  <Tooltip key={item.href}>
                    <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                    <TooltipContent side="right" className="font-medium">
                      {t(item.label)}
                    </TooltipContent>
                  </Tooltip>
                )
              }

              return <div key={item.href}>{linkContent}</div>
            })}
          </nav>
        </ScrollArea>

        {/* Footer */}
        <div className="px-2 py-3 border-t border-slate-700 shrink-0">
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center px-2 py-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Đăng xuất</TooltipContent>
            </Tooltip>
          ) : (
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors text-sm"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span>Đăng xuất</span>
            </button>
          )}
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(v => !v)}
          className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-slate-700 hover:bg-slate-600 rounded-full flex items-center justify-center border border-slate-600 text-slate-300 hover:text-white transition-colors z-10"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="w-3 h-3" />
          ) : (
            <ChevronLeft className="w-3 h-3" />
          )}
        </button>
      </aside>
    </TooltipProvider>
  )
}
