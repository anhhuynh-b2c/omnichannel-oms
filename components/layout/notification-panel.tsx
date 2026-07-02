'use client'

import { useState, useEffect, useCallback } from 'react'
import { Bell, AlertTriangle, ShoppingCart, Package, CheckCheck, X, Wifi, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { getNotifications, type AppNotification, type NotifType } from '@/lib/actions/notifications.actions'

const STORAGE_KEY = 'notification_state_v2'

function loadState(): { readIds: string[]; dismissedIds: string[] } {
  if (typeof window === 'undefined') return { readIds: [], dismissedIds: [] }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : { readIds: [], dismissedIds: [] }
  } catch {
    return { readIds: [], dismissedIds: [] }
  }
}

function saveState(state: { readIds: string[]; dismissedIds: string[] }) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

const ICONS: Record<NotifType, { icon: typeof Bell; bg: string; color: string }> = {
  out_of_stock:  { icon: AlertTriangle, bg: 'bg-red-100 dark:bg-red-950/40',      color: 'text-red-600' },
  low_stock:     { icon: AlertTriangle, bg: 'bg-orange-100 dark:bg-orange-950/40', color: 'text-orange-600' },
  new_order:     { icon: ShoppingCart,  bg: 'bg-blue-100 dark:bg-blue-950/40',    color: 'text-blue-600' },
  order_status:  { icon: Package,       bg: 'bg-emerald-100 dark:bg-emerald-950/40', color: 'text-emerald-600' },
  channel_error: { icon: Wifi,          bg: 'bg-red-100 dark:bg-red-950/40',      color: 'text-red-600' },
  po_approved:   { icon: CheckCheck,    bg: 'bg-violet-100 dark:bg-violet-950/40', color: 'text-violet-600' },
  po_received:   { icon: Package,       bg: 'bg-emerald-100 dark:bg-emerald-950/40', color: 'text-emerald-600' },
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Vừa xong'
  if (mins < 60) return `${mins} phút trước`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} giờ trước`
  const days = Math.floor(hours / 24)
  return `${days} ngày trước`
}

export function NotificationPanel() {
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [dismissedIds, setDismissedIds] = useState<string[]>([])
  const [readIds, setReadIds] = useState<string[]>([])
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const router = useRouter()

  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getNotifications()
      setNotifications(data)
    } catch {
      // silently fail — bell stays empty
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const { readIds: r, dismissedIds: d } = loadState()
    setReadIds(r)
    setDismissedIds(d)
    setMounted(true)
    fetchNotifications()
  }, [fetchNotifications])

  // Refresh when panel opens
  useEffect(() => {
    if (open) fetchNotifications()
  }, [open, fetchNotifications])

  const visible = notifications.filter(n => !dismissedIds.includes(n.id))
  const unreadCount = visible.filter(n => !readIds.includes(n.id)).length

  function markAllRead() {
    const allIds = notifications.map(n => n.id)
    const next = { readIds: allIds, dismissedIds }
    saveState(next)
    setReadIds(allIds)
  }

  function dismiss(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    const next = { readIds, dismissedIds: [...dismissedIds, id] }
    saveState(next)
    setDismissedIds(next.dismissedIds)
    if (!readIds.includes(id)) {
      const r = [...readIds, id]
      saveState({ readIds: r, dismissedIds: next.dismissedIds })
      setReadIds(r)
    }
  }

  function handleClick(notif: AppNotification) {
    if (!readIds.includes(notif.id)) {
      const r = [...readIds, notif.id]
      saveState({ readIds: r, dismissedIds })
      setReadIds(r)
    }
    if (notif.href) {
      setOpen(false)
      router.push(notif.href)
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 relative">
          <Bell className="h-4 w-4" />
          {mounted && unreadCount > 0 && (
            <span className="absolute top-1 right-1 min-w-[8px] h-2 flex items-center justify-center">
              <span className="w-2 h-2 bg-blue-500 rounded-full" />
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 p-0" sideOffset={8}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">Thông báo</span>
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded text-xs font-medium">
                {unreadCount} mới
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchNotifications}
              className={cn('p-0.5 text-muted-foreground hover:text-primary transition-colors', loading && 'animate-spin')}
              title="Làm mới"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Đánh dấu tất cả đã đọc
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <div className="max-h-[360px] overflow-y-auto">
          {loading && visible.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
              <RefreshCw className="w-6 h-6 mb-2 opacity-30 animate-spin" />
              <p className="text-sm">Đang tải...</p>
            </div>
          ) : visible.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
              <Bell className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-sm">Không có thông báo</p>
            </div>
          ) : (
            visible.map(notif => {
              const meta = ICONS[notif.type]
              const Icon = meta.icon
              const isRead = readIds.includes(notif.id)
              return (
                <div
                  key={notif.id}
                  onClick={() => handleClick(notif)}
                  className={cn(
                    'group flex items-start gap-3 px-4 py-3 border-b last:border-0 cursor-pointer transition-colors',
                    isRead
                      ? 'hover:bg-muted/40'
                      : 'bg-blue-50/50 dark:bg-blue-950/10 hover:bg-blue-50 dark:hover:bg-blue-950/20'
                  )}
                >
                  <div className={cn('p-1.5 rounded-lg shrink-0 mt-0.5', meta.bg)}>
                    <Icon className={cn('w-3.5 h-3.5', meta.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-sm leading-snug', !isRead && 'font-medium')}>{notif.title}</p>
                    {notif.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{notif.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">{formatRelativeTime(notif.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {!isRead && (
                      <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                    )}
                    <button
                      onClick={(e) => dismiss(notif.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-foreground text-muted-foreground transition-all"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        {visible.length > 0 && (
          <div className="px-4 py-2.5 border-t">
            <button
              onClick={() => { setOpen(false); router.push('/settings?tab=notifications') }}
              className="text-xs text-muted-foreground hover:text-primary transition-colors w-full text-center"
            >
              Cài đặt thông báo
            </button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
