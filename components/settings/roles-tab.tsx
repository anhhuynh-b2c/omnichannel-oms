'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, Save } from 'lucide-react'
import { saveRolePermissions } from '@/lib/actions/permissions.actions'

export const ROLES = [
  { name: 'ADMIN',           label: 'Admin',     color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  { name: 'WAREHOUSE_STAFF', label: 'Warehouse', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' },
  { name: 'SALES_STAFF',     label: 'Sales',     color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' },
  { name: 'ACCOUNTANT',      label: 'Accountant',color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' },
]

export const MODULES = [
  { route: '/',                label: 'Dashboard' },
  { route: '/products',        label: 'Sản phẩm' },
  { route: '/categories',      label: 'Danh mục' },
  { route: '/inventory',       label: 'Kho hàng' },
  { route: '/customers',       label: 'Khách hàng' },
  { route: '/orders',          label: 'Đơn hàng' },
  { route: '/sale',            label: 'Bán hàng (POS)' },
  { route: '/purchase-orders', label: 'Đặt hàng nhập' },
  { route: '/suppliers',       label: 'Nhà cung cấp' },
  { route: '/reports',         label: 'Báo cáo' },
  { route: '/accountant',      label: 'Kế toán' },
  { route: '/integrations',    label: 'Tích hợp' },
  { route: '/audit-logs',      label: 'Nhật ký' },
  { route: '/settings',        label: 'Cài đặt' },
]

interface Props {
  // { roleName: string[] of allowed routes }
  initialPermissions: Record<string, string[]>
}

export function RolesTab({ initialPermissions }: Props) {
  // state: { roleName: Set<route> }
  const [perms, setPerms] = useState<Record<string, Set<string>>>(() => {
    const result: Record<string, Set<string>> = {}
    for (const role of ROLES) {
      result[role.name] = new Set(initialPermissions[role.name] ?? [])
    }
    return result
  })

  // Track which roles have unsaved changes
  const [dirty, setDirty] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()
  const [savingRole, setSavingRole] = useState<string | null>(null)

  function toggle(roleName: string, route: string) {
    // ADMIN /settings is protected — cannot uncheck
    if (roleName === 'ADMIN' && route === '/settings') return

    setPerms(prev => {
      const next = { ...prev, [roleName]: new Set(prev[roleName]) }
      if (next[roleName].has(route)) next[roleName].delete(route)
      else next[roleName].add(route)
      return next
    })
    setDirty(prev => new Set(prev).add(roleName))
  }

  function saveRole(roleName: string) {
    setSavingRole(roleName)
    const routes = Array.from(perms[roleName])
    startTransition(async () => {
      try {
        await saveRolePermissions(roleName, routes)
        setDirty(prev => { const s = new Set(prev); s.delete(roleName); return s })
        toast.success(`Đã lưu quyền cho ${ROLES.find(r => r.name === roleName)?.label}`)
      } catch (e: any) {
        toast.error(e.message)
      } finally {
        setSavingRole(null)
      }
    })
  }

  return (
    <div className="space-y-4">
      {ROLES.map(role => {
        const isDirty = dirty.has(role.name)
        const isSaving = savingRole === role.name
        return (
          <Card key={role.name}>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-semibold">{role.label}</CardTitle>
                <Badge className={`text-xs font-mono ${role.color}`}>{role.name}</Badge>
                {isDirty && (
                  <span className="text-xs text-amber-600 dark:text-amber-400">● chưa lưu</span>
                )}
              </div>
              <Button
                size="sm"
                variant={isDirty ? 'default' : 'outline'}
                className="gap-1.5 h-8 text-xs"
                disabled={!isDirty || isPending}
                onClick={() => saveRole(role.name)}
              >
                {isSaving
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Save className="w-3.5 h-3.5" />}
                Lưu
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {MODULES.map(mod => {
                  const checked = perms[role.name].has(mod.route)
                  const locked = role.name === 'ADMIN' && mod.route === '/settings'
                  return (
                    <label
                      key={mod.route}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border text-sm cursor-pointer transition-colors select-none
                        ${checked
                          ? 'border-primary/30 bg-primary/5 text-foreground'
                          : 'border-transparent bg-muted/50 text-muted-foreground'}
                        ${locked ? 'opacity-60 cursor-not-allowed' : 'hover:bg-muted'}
                      `}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggle(role.name, mod.route)}
                        disabled={locked || isPending}
                        className="shrink-0"
                      />
                      <span className="truncate">{mod.label}</span>
                    </label>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )
      })}
      <p className="text-xs text-muted-foreground">
        * Quyền Cài đặt của Admin luôn được giữ để tránh tự khóa tài khoản.
        Thay đổi có hiệu lực ngay — user cần đăng xuất/đăng nhập lại để sidebar cập nhật.
      </p>
    </div>
  )
}
