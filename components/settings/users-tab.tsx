'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import {
  Loader2, UserPlus, MoreHorizontal, Trash2,
  Clock, MailCheck, MailWarning, Eye, EyeOff, Pencil,
} from 'lucide-react'
import {
  inviteUser, createUser, updateUserRole, updateUserName,
  toggleBanUser, setUserPassword, deleteUser,
  bulkDeleteUsers, bulkUpdateRole,
} from '@/lib/actions/user-management.actions'
import type { ManagedUser, RoleOption } from '@/lib/actions/user-management.actions'

const ROLE_COLORS: Record<string, string> = {
  ADMIN:           'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  WAREHOUSE_STAFF: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  SALES_STAFF:     'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  ACCOUNTANT:      'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN:           'Admin',
  WAREHOUSE_STAFF: 'Warehouse',
  SALES_STAFF:     'Sales',
  ACCOUNTANT:      'Accountant',
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function formatLastSeen(ts: string | null) {
  if (!ts) return null
  const d = new Date(ts)
  const now = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000)
  if (diff < 60) return 'Vừa xong'
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400)} ngày trước`
  return d.toLocaleDateString('vi-VN')
}

interface Props {
  users: ManagedUser[]
  roles: RoleOption[]
  currentUserEmail?: string
}

type ConfirmAction =
  | { type: 'delete'; user: ManagedUser }
  | { type: 'bulk-delete'; ids: string[] }

interface EditState {
  user: ManagedUser
  name: string
  roleId: string
  newPassword: string
  isBanned: boolean
}

export function UsersTab({ users: initialUsers, roles, currentUserEmail }: Props) {
  const [users, setUsers] = useState(initialUsers)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [inviteOpen, setInviteOpen] = useState(false)
  const [editState, setEditState] = useState<EditState | null>(null)
  const [editErr, setEditErr] = useState<string | null>(null)
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null)
  const [bulkRoleId, setBulkRoleId] = useState('')
  const [isPending, startTransition] = useTransition()

  // Shared form (invite + create)
  const [form, setForm] = useState({ name: '', email: '', password: '', role_id: '' })
  const [formErr, setFormErr] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showEditPassword, setShowEditPassword] = useState(false)

  const selectableUsers = users.filter(u => u.email !== currentUserEmail)
  const allSelected = selectableUsers.length > 0 && selectableUsers.every(u => selected.has(u.id))

  function toggleSelect(id: string) {
    setSelected(prev => {
      const s = new Set(prev)
      s.has(id) ? s.delete(id) : s.add(id)
      return s
    })
  }

  function toggleSelectAll() {
    if (allSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(selectableUsers.map(u => u.id)))
    }
  }

  // ── Open add dialog ────────────────────────────────────────────────────────
  function handleOpenDialog() {
    setForm({ name: '', email: '', password: '', role_id: roles[0]?.id ?? '' })
    setFormErr(null)
    setShowPassword(false)
    setInviteOpen(true)
  }

  function addUserOptimistic(invite_pending: boolean) {
    const role = roles.find(r => r.id === form.role_id)
    setUsers(prev => [...prev, {
      id: crypto.randomUUID(),
      auth_id: null,
      name: form.name,
      email: form.email,
      role_id: form.role_id,
      role_name: role?.name ?? '',
      created_at: new Date().toISOString(),
      last_sign_in_at: null,
      is_banned: false,
      invite_pending,
    }])
    setInviteOpen(false)
  }

  // ── Invite (gửi email) ─────────────────────────────────────────────────────
  function submitInvite() {
    if (!form.name.trim() || !form.email.trim() || !form.role_id) {
      setFormErr('Vui lòng điền đầy đủ thông tin.')
      return
    }
    startTransition(async () => {
      try {
        await inviteUser({ name: form.name, email: form.email, role_id: form.role_id })
        toast.success(`Đã gửi lời mời đến ${form.email}`)
        addUserOptimistic(true)
      } catch (e: any) {
        setFormErr(e.message)
      }
    })
  }

  // ── Tạo tài khoản trực tiếp ────────────────────────────────────────────────
  function submitCreate() {
    if (!form.name.trim() || !form.email.trim() || !form.role_id) {
      setFormErr('Vui lòng điền đầy đủ thông tin.')
      return
    }
    if (form.password.length < 6) {
      setFormErr('Mật khẩu phải có ít nhất 6 ký tự.')
      return
    }
    startTransition(async () => {
      try {
        await createUser(form)
        toast.success(`Đã tạo tài khoản cho ${form.email}`)
        addUserOptimistic(false)
      } catch (e: any) {
        setFormErr(e.message)
      }
    })
  }

  // ── Open edit dialog ────────────────────────────────────────────────────────
  function openEditDialog(user: ManagedUser) {
    setEditState({
      user,
      name: user.name,
      roleId: user.role_id,
      newPassword: '',
      isBanned: user.is_banned,
    })
    setEditErr(null)
    setShowEditPassword(false)
  }

  // ── Submit edit ─────────────────────────────────────────────────────────────
  function submitEdit() {
    if (!editState) return
    if (!editState.name.trim()) {
      setEditErr('Tên không được để trống.')
      return
    }
    if (editState.newPassword && editState.newPassword.length < 6) {
      setEditErr('Mật khẩu phải có ít nhất 6 ký tự.')
      return
    }

    const { user, name, roleId, newPassword, isBanned } = editState
    const nameChanged = name.trim() !== user.name
    const roleChanged = roleId !== user.role_id
    const banChanged = isBanned !== user.is_banned
    const passwordSet = newPassword.length > 0

    // Optimistic update
    const role = roles.find(r => r.id === roleId)
    setUsers(prev => prev.map(u => u.id === user.id
      ? { ...u, name: name.trim(), role_id: roleId, role_name: role?.name ?? u.role_name, is_banned: isBanned }
      : u
    ))
    setEditState(null)

    startTransition(async () => {
      try {
        await Promise.all([
          nameChanged ? updateUserName(user.id, name.trim()) : null,
          roleChanged ? updateUserRole(user.id, roleId) : null,
          banChanged && user.auth_id ? toggleBanUser(user.auth_id, isBanned) : null,
          passwordSet && user.auth_id ? setUserPassword(user.auth_id, newPassword) : null,
        ])
        toast.success(`Đã cập nhật ${name.trim()}`)
      } catch (e: any) {
        toast.error(e.message)
        // Rollback
        setUsers(prev => prev.map(u => u.id === user.id ? user : u))
      }
    })
  }

  // ── Role change (inline table) ─────────────────────────────────────────────
  function handleRoleChange(userId: string, newRoleId: string) {
    const role = roles.find(r => r.id === newRoleId)
    setUsers(prev => prev.map(u => u.id === userId
      ? { ...u, role_id: newRoleId, role_name: role?.name ?? u.role_name }
      : u
    ))
    startTransition(async () => {
      try {
        await updateUserRole(userId, newRoleId)
        toast.success('Đã cập nhật role')
      } catch (e: any) {
        toast.error(e.message)
      }
    })
  }

  // ── Confirm actions ────────────────────────────────────────────────────────
  function executeConfirm() {
    if (!confirmAction) return
    const action = confirmAction
    setConfirmAction(null)

    if (action.type === 'delete') {
      const target = action.user
      setUsers(prev => prev.filter(u => u.id !== target.id))
      setSelected(prev => { const s = new Set(prev); s.delete(target.id); return s })
      startTransition(async () => {
        try {
          await deleteUser(target.id)
          toast.success(`Đã xóa ${target.name}`)
        } catch (e: any) {
          toast.error(e.message)
          setUsers(prev => [...prev, target])
        }
      })
    }

    if (action.type === 'bulk-delete') {
      const ids = new Set(action.ids)
      const removed = users.filter(u => ids.has(u.id))
      setUsers(prev => prev.filter(u => !ids.has(u.id)))
      setSelected(new Set())
      startTransition(async () => {
        try {
          await bulkDeleteUsers(action.ids)
          toast.success(`Đã xóa ${action.ids.length} người dùng`)
        } catch (e: any) {
          toast.error(e.message)
          setUsers(prev => [...prev, ...removed])
        }
      })
    }
  }

  // ── Bulk role ──────────────────────────────────────────────────────────────
  function handleBulkRole() {
    if (!bulkRoleId || selected.size === 0) return
    const ids = Array.from(selected)
    const role = roles.find(r => r.id === bulkRoleId)
    setUsers(prev => prev.map(u => ids.includes(u.id)
      ? { ...u, role_id: bulkRoleId, role_name: role?.name ?? u.role_name }
      : u
    ))
    setSelected(new Set())
    startTransition(async () => {
      try {
        await bulkUpdateRole(ids, bulkRoleId)
        toast.success(`Đã cập nhật role cho ${ids.length} người dùng`)
      } catch (e: any) {
        toast.error(e.message)
      }
    })
  }

  const hasSelected = selected.size > 0

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
          <div>
            <CardTitle>Quản lý người dùng</CardTitle>
            <CardDescription>Mời thành viên và quản trị quyền truy cập hệ thống.</CardDescription>
          </div>
          <Button size="sm" onClick={handleOpenDialog} className="gap-2 shrink-0">
            <UserPlus className="w-4 h-4" />
            Thêm người dùng
          </Button>
        </CardHeader>

        {/* Bulk action bar */}
        {hasSelected && (
          <div className="mx-6 mb-4 flex items-center gap-3 px-4 py-2.5 bg-primary/5 border border-primary/20 rounded-lg text-sm">
            <span className="font-medium text-primary">{selected.size} đã chọn</span>
            <div className="flex items-center gap-2 ml-auto">
              <Select value={bulkRoleId} onValueChange={setBulkRoleId}>
                <SelectTrigger className="h-7 w-36 text-xs">
                  <SelectValue placeholder="Đổi role..." />
                </SelectTrigger>
                <SelectContent>
                  {roles.map(r => (
                    <SelectItem key={r.id} value={r.id} className="text-xs">
                      {ROLE_LABELS[r.name] ?? r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleBulkRole} disabled={!bulkRoleId || isPending}>
                Áp dụng
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="h-7 text-xs gap-1"
                disabled={isPending}
                onClick={() => setConfirmAction({ type: 'bulk-delete', ids: Array.from(selected) })}
              >
                <Trash2 className="w-3 h-3" />
                Xóa
              </Button>
            </div>
          </div>
        )}

        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-3 w-10">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Chọn tất cả"
                  />
                </th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-wide font-medium text-muted-foreground">Người dùng</th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-wide font-medium text-muted-foreground">Role</th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-wide font-medium text-muted-foreground">Trạng thái</th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-wide font-medium text-muted-foreground">Đăng nhập gần nhất</th>
                <th className="px-4 py-3 w-10" />
              </tr>
            </thead>
            <tbody>
              {users.map(user => {
                const isSelf = user.email === currentUserEmail
                const isChecked = selected.has(user.id)
                return (
                  <tr
                    key={user.id}
                    className={`border-b last:border-0 hover:bg-muted/20 ${isChecked ? 'bg-primary/5' : ''} ${user.is_banned ? 'opacity-60' : ''}`}
                  >
                    <td className="px-4 py-3">
                      {!isSelf && (
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => toggleSelect(user.id)}
                        />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className={`text-xs ${user.is_banned ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'}`}>
                            {initials(user.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium flex items-center gap-1.5">
                            {user.name}
                            {isSelf && <span className="text-xs text-muted-foreground font-normal">(bạn)</span>}
                            {user.is_banned && <Badge variant="destructive" className="text-xs px-1.5 py-0">Đã khóa</Badge>}
                          </p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {isSelf ? (
                        <Badge className={`text-xs ${ROLE_COLORS[user.role_name] ?? ''}`}>
                          {ROLE_LABELS[user.role_name] ?? user.role_name}
                        </Badge>
                      ) : (
                        <Select value={user.role_id} onValueChange={val => handleRoleChange(user.id, val)} disabled={isPending}>
                          <SelectTrigger className="h-7 w-36 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {roles.map(r => (
                              <SelectItem key={r.id} value={r.id} className="text-xs">
                                {ROLE_LABELS[r.name] ?? r.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {user.invite_pending ? (
                        <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                          <MailWarning className="w-3.5 h-3.5" />
                          Chờ xác nhận
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                          <MailCheck className="w-3.5 h-3.5" />
                          Đã kích hoạt
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {user.last_sign_in_at ? (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {formatLastSeen(user.last_sign_in_at)}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!isSelf && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7" disabled={isPending}>
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem onClick={() => openEditDialog(user)} className="gap-2">
                              <Pencil className="w-3.5 h-3.5" />
                              Chỉnh sửa
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setConfirmAction({ type: 'delete', user })}
                              className="gap-2 text-destructive focus:text-destructive"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Xóa người dùng
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </td>
                  </tr>
                )
              })}
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground text-sm">
                    Chưa có người dùng nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Add user dialog */}
      <Dialog open={inviteOpen} onOpenChange={v => { setInviteOpen(v); if (!v) setFormErr(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Thêm người dùng</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="create" onValueChange={() => setFormErr(null)}>
            <TabsList className="w-full">
              <TabsTrigger value="create" className="flex-1">Tạo tài khoản</TabsTrigger>
              <TabsTrigger value="invite" className="flex-1">Gửi lời mời</TabsTrigger>
            </TabsList>

            {/* Shared fields */}
            <div className="space-y-3 pt-4">
              <div className="space-y-1.5">
                <Label>Họ và tên</Label>
                <Input placeholder="Nguyễn Văn A" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" placeholder="email@company.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select value={form.role_id} onValueChange={val => setForm(f => ({ ...f, role_id: val }))}>
                  <SelectTrigger><SelectValue placeholder="Chọn role" /></SelectTrigger>
                  <SelectContent>
                    {roles.map(r => (
                      <SelectItem key={r.id} value={r.id}>{ROLE_LABELS[r.name] ?? r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Tạo tài khoản — có thêm mật khẩu */}
            <TabsContent value="create" className="mt-3 space-y-3">
              <div className="space-y-1.5">
                <Label>Mật khẩu tạm thời</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Tối thiểu 6 ký tự"
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Nhân viên có thể đổi mật khẩu sau khi đăng nhập tại Cài đặt → Tài khoản.
                </p>
              </div>
              {formErr && <p className="text-sm text-destructive">{formErr}</p>}
              <DialogFooter className="pt-1">
                <Button variant="outline" onClick={() => setInviteOpen(false)}>Hủy</Button>
                <Button onClick={submitCreate} disabled={isPending} className="gap-2">
                  {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Tạo tài khoản
                </Button>
              </DialogFooter>
            </TabsContent>

            {/* Mời qua email */}
            <TabsContent value="invite" className="mt-3 space-y-3">
              <p className="text-xs text-muted-foreground">
                Supabase sẽ gửi email chứa link kích hoạt. Nhân viên click link và tự đặt mật khẩu lần đầu.
              </p>
              {formErr && <p className="text-sm text-destructive">{formErr}</p>}
              <DialogFooter className="pt-1">
                <Button variant="outline" onClick={() => setInviteOpen(false)}>Hủy</Button>
                <Button onClick={submitInvite} disabled={isPending} className="gap-2">
                  {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Gửi lời mời
                </Button>
              </DialogFooter>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Edit user dialog */}
      <Dialog open={!!editState} onOpenChange={v => { if (!v) setEditState(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa tài khoản</DialogTitle>
          </DialogHeader>

          {editState && (
            <div className="space-y-4 py-1">
              {/* Email — readonly */}
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs">Email</Label>
                <Input value={editState.user.email} disabled className="text-muted-foreground" />
              </div>

              {/* Họ tên */}
              <div className="space-y-1.5">
                <Label>Họ và tên</Label>
                <Input
                  placeholder="Nguyễn Văn A"
                  value={editState.name}
                  onChange={e => setEditState(s => s ? { ...s, name: e.target.value } : s)}
                />
              </div>

              {/* Role */}
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select value={editState.roleId} onValueChange={val => setEditState(s => s ? { ...s, roleId: val } : s)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {roles.map(r => (
                      <SelectItem key={r.id} value={r.id}>{ROLE_LABELS[r.name] ?? r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Đặt mật khẩu mới */}
              <div className="space-y-1.5">
                <Label>Đặt mật khẩu mới <span className="text-muted-foreground font-normal">(để trống nếu không đổi)</span></Label>
                <div className="relative">
                  <Input
                    type={showEditPassword ? 'text' : 'password'}
                    placeholder="Tối thiểu 6 ký tự"
                    value={editState.newPassword}
                    onChange={e => setEditState(s => s ? { ...s, newPassword: e.target.value } : s)}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showEditPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Khóa tài khoản toggle */}
              <div className="flex items-center justify-between rounded-lg border px-4 py-3">
                <div>
                  <p className="text-sm font-medium">Khóa tài khoản</p>
                  <p className="text-xs text-muted-foreground">Người dùng sẽ không thể đăng nhập</p>
                </div>
                <Switch
                  checked={editState.isBanned}
                  onCheckedChange={val => setEditState(s => s ? { ...s, isBanned: val } : s)}
                  disabled={!editState.user.auth_id}
                />
              </div>

              {editErr && <p className="text-sm text-destructive">{editErr}</p>}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditState(null)}>Hủy</Button>
            <Button onClick={submitEdit} disabled={isPending} className="gap-2">
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Lưu thay đổi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={v => !v && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === 'delete' && 'Xóa người dùng?'}
              {confirmAction?.type === 'bulk-delete' && `Xóa ${confirmAction.ids.length} người dùng?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === 'delete' && (
                <>Tài khoản <strong>{(confirmAction as any).user.name}</strong> sẽ bị xóa vĩnh viễn và mất quyền đăng nhập.</>
              )}
              {confirmAction?.type === 'bulk-delete' && (
                <>Tất cả {confirmAction.ids.length} tài khoản đã chọn sẽ bị xóa vĩnh viễn.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {confirmAction?.type === 'delete' && 'Xóa'}
              {confirmAction?.type === 'bulk-delete' && 'Xóa tất cả'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
