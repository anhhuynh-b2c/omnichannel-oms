'use client'

import { useState, useTransition, useMemo } from 'react'
import {
  Plus, Edit, Trash2, Search, Phone, Mail, MapPin,
  Users, Crown, Star, User, ChevronRight, X, ShoppingBag,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import { createCustomer, updateCustomer, deleteCustomer, getCustomerById } from '@/lib/actions/customer.actions'
import type { Customer, CustomerGroup, CustomerFormData } from '@/types'

const CHANNEL_OPTIONS = ['Shopee', 'TikTok Shop', 'Lazada', 'Facebook', 'Instagram', 'Website', 'Zalo', 'POS']

const GROUP_CONFIG: Record<CustomerGroup, { label: string; color: string; icon: React.ElementType }> = {
  VIP:     { label: 'VIP',        color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Crown },
  LOYAL:   { label: 'Thân thiết', color: 'bg-blue-100 text-blue-800 border-blue-200',       icon: Star },
  REGULAR: { label: 'Thường',     color: 'bg-slate-100 text-slate-700 border-slate-200',    icon: User },
}

const EMPTY_FORM: CustomerFormData = {
  name: '', phone: '', email: '', address: '',
  customer_group: 'REGULAR', source_channel: '', city: '', district: '', notes: '',
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n)
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('vi-VN')
}

function GroupBadge({ group }: { group: CustomerGroup }) {
  const cfg = GROUP_CONFIG[group]
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.color}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  )
}

interface CustomerRow extends Customer {
  total_orders: number
  total_spent: number
  last_order_date: string | null
}

export function CustomersTable({ initialData }: { initialData: CustomerRow[] }) {
  const [data, setData] = useState(initialData)
  const [search, setSearch] = useState('')
  const [groupFilter, setGroupFilter] = useState<string>('ALL')
  const [createOpen, setCreateOpen] = useState(false)
  const [editCustomer, setEditCustomer] = useState<CustomerRow | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [detailCustomer, setDetailCustomer] = useState<CustomerRow | null>(null)
  const [detailOrders, setDetailOrders] = useState<any[]>([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [form, setForm] = useState<CustomerFormData>(EMPTY_FORM)
  const [isPending, startTransition] = useTransition()

  const set = (key: keyof CustomerFormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }))

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return data.filter(c => {
      const matchSearch = !q ||
        c.name.toLowerCase().includes(q) ||
        (c.phone ?? '').includes(q) ||
        (c.email ?? '').toLowerCase().includes(q)
      const matchGroup = groupFilter === 'ALL' || c.customer_group === groupFilter
      return matchSearch && matchGroup
    })
  }, [data, search, groupFilter])

  // Stats
  const stats = useMemo(() => ({
    total: data.length,
    vip: data.filter(c => c.customer_group === 'VIP').length,
    loyal: data.filter(c => c.customer_group === 'LOYAL').length,
    newThisMonth: data.filter(c => {
      const d = new Date(c.created_at)
      const now = new Date()
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    }).length,
  }), [data])

  const openCreate = () => { setForm(EMPTY_FORM); setCreateOpen(true) }
  const openEdit = (c: CustomerRow) => {
    setForm({
      name: c.name, phone: c.phone ?? '', email: c.email ?? '',
      address: c.address ?? '', customer_group: c.customer_group,
      source_channel: c.source_channel ?? '', city: c.city ?? '',
      district: c.district ?? '', notes: c.notes ?? '',
    })
    setEditCustomer(c)
  }

  const openDetail = async (c: CustomerRow) => {
    setDetailCustomer(c)
    setDetailOrders([])
    setDetailLoading(true)
    try {
      const full = await getCustomerById(c.id)
      setDetailOrders((full as any).orders ?? [])
    } catch { /* ignore */ }
    setDetailLoading(false)
  }

  const handleCreate = () => {
    if (!form.name.trim()) return
    startTransition(async () => {
      try {
        const created = await createCustomer(form)
        setData(prev => [{ ...created, total_orders: 0, total_spent: 0, last_order_date: null }, ...prev])
        setCreateOpen(false)
        toast.success('Tạo khách hàng thành công')
      } catch (e) { toast.error((e as Error).message) }
    })
  }

  const handleEdit = () => {
    if (!editCustomer || !form.name.trim()) return
    startTransition(async () => {
      try {
        await updateCustomer(editCustomer.id, form)
        setData(prev => prev.map(c => c.id === editCustomer.id ? {
          ...c, ...form,
          phone: form.phone || null, email: form.email || null,
          address: form.address || null, source_channel: form.source_channel || null,
          city: form.city || null, district: form.district || null, notes: form.notes || null,
        } : c))
        setEditCustomer(null)
        toast.success('Cập nhật thành công')
      } catch (e) { toast.error((e as Error).message) }
    })
  }

  const handleDelete = () => {
    if (!deleteId) return
    startTransition(async () => {
      try {
        await deleteCustomer(deleteId)
        setData(prev => prev.filter(c => c.id !== deleteId))
        setDeleteId(null)
        toast.success('Đã xóa khách hàng')
      } catch (e) { toast.error((e as Error).message) }
    })
  }

  const FormBody = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 space-y-1.5">
          <Label>Họ tên <span className="text-red-500">*</span></Label>
          <Input value={form.name} onChange={set('name')} placeholder="Nguyễn Văn A" />
        </div>
        <div className="space-y-1.5">
          <Label>Số điện thoại</Label>
          <Input value={form.phone} onChange={set('phone')} placeholder="0912 345 678" />
        </div>
        <div className="space-y-1.5">
          <Label>Email</Label>
          <Input value={form.email} onChange={set('email')} placeholder="email@example.com" />
        </div>
        <div className="space-y-1.5">
          <Label>Nhóm khách hàng</Label>
          <Select value={form.customer_group} onValueChange={v => setForm(f => ({ ...f, customer_group: v as CustomerGroup }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="REGULAR">Thường</SelectItem>
              <SelectItem value="LOYAL">Thân thiết</SelectItem>
              <SelectItem value="VIP">VIP</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Kênh nguồn</Label>
          <Select value={form.source_channel || '__none__'} onValueChange={v => setForm(f => ({ ...f, source_channel: v === '__none__' ? '' : v }))}>
            <SelectTrigger><SelectValue placeholder="Chọn kênh..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">— Không chọn —</SelectItem>
              {CHANNEL_OPTIONS.map(ch => <SelectItem key={ch} value={ch}>{ch}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Tỉnh / Thành phố</Label>
          <Input value={form.city} onChange={set('city')} placeholder="TP. Hồ Chí Minh" />
        </div>
        <div className="space-y-1.5">
          <Label>Quận / Huyện</Label>
          <Input value={form.district} onChange={set('district')} placeholder="Quận 1" />
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label>Địa chỉ chi tiết</Label>
          <Input value={form.address} onChange={set('address')} placeholder="123 Đường ABC, Phường XYZ" />
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label>Ghi chú nội bộ</Label>
          <Textarea value={form.notes} onChange={set('notes')} placeholder="Ghi chú về khách hàng..." rows={2} />
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Tổng khách hàng', value: stats.total, icon: Users, color: 'text-blue-600' },
          { label: 'VIP', value: stats.vip, icon: Crown, color: 'text-yellow-600' },
          { label: 'Thân thiết', value: stats.loyal, icon: Star, color: 'text-blue-500' },
          { label: 'Mới tháng này', value: stats.newThisMonth, icon: User, color: 'text-green-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center ${s.color}`}>
              <s.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{s.value}</p>
              <p className="text-xs text-slate-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            className="pl-9"
            placeholder="Tìm theo tên, SĐT, email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={groupFilter} onValueChange={setGroupFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tất cả nhóm</SelectItem>
            <SelectItem value="VIP">VIP</SelectItem>
            <SelectItem value="LOYAL">Thân thiết</SelectItem>
            <SelectItem value="REGULAR">Thường</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" /> Thêm khách hàng
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Khách hàng</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Liên hệ</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Nhóm</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Kênh nguồn</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Đơn hàng</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Tổng chi tiêu</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Đơn cuối</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    {search || groupFilter !== 'ALL' ? 'Không tìm thấy khách hàng phù hợp' : 'Chưa có khách hàng nào'}
                  </td>
                </tr>
              ) : filtered.map(c => (
                <tr key={c.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => openDetail(c)}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-xs shrink-0">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{c.name}</p>
                        {(c.city || c.district) && (
                          <p className="text-xs text-slate-400">{[c.district, c.city].filter(Boolean).join(', ')}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-0.5">
                      {c.phone && <p className="flex items-center gap-1 text-xs text-slate-600"><Phone className="w-3 h-3" />{c.phone}</p>}
                      {c.email && <p className="flex items-center gap-1 text-xs text-slate-500"><Mail className="w-3 h-3" />{c.email}</p>}
                    </div>
                  </td>
                  <td className="px-4 py-3"><GroupBadge group={c.customer_group} /></td>
                  <td className="px-4 py-3">
                    {c.source_channel
                      ? <span className="text-xs text-slate-600">{c.source_channel}</span>
                      : <span className="text-xs text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-slate-700">{c.total_orders}</td>
                  <td className="px-4 py-3 text-right font-medium text-slate-700">
                    {c.total_spent > 0 ? formatCurrency(c.total_spent) : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{formatDate(c.last_order_date)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(c)}>
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => setDeleteId(c.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                      <ChevronRight className="w-4 h-4 text-slate-300" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div className="px-4 py-2 border-t border-slate-100 text-xs text-slate-400">
            Hiển thị {filtered.length} / {data.length} khách hàng
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Thêm khách hàng mới</DialogTitle></DialogHeader>
          <FormBody />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Hủy</Button>
            <Button onClick={handleCreate} disabled={isPending || !form.name.trim()}>
              {isPending ? 'Đang lưu...' : 'Tạo khách hàng'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editCustomer} onOpenChange={v => !v && setEditCustomer(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Chỉnh sửa khách hàng</DialogTitle></DialogHeader>
          <FormBody />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditCustomer(null)}>Hủy</Button>
            <Button onClick={handleEdit} disabled={isPending || !form.name.trim()}>
              {isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={v => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa khách hàng?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này không thể hoàn tác. Lịch sử đơn hàng vẫn được giữ lại.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              {isPending ? 'Đang xóa...' : 'Xóa'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Detail Drawer */}
      <Sheet open={!!detailCustomer} onOpenChange={v => !v && setDetailCustomer(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {detailCustomer && (
            <>
              <SheetHeader className="mb-4">
                <SheetTitle className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                    {detailCustomer.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold">{detailCustomer.name}</p>
                    <GroupBadge group={detailCustomer.customer_group} />
                  </div>
                </SheetTitle>
              </SheetHeader>

              {/* Info */}
              <div className="space-y-2 text-sm mb-6">
                {detailCustomer.phone && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Phone className="w-4 h-4 text-slate-400" />{detailCustomer.phone}
                  </div>
                )}
                {detailCustomer.email && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Mail className="w-4 h-4 text-slate-400" />{detailCustomer.email}
                  </div>
                )}
                {(detailCustomer.address || detailCustomer.district || detailCustomer.city) && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    {[detailCustomer.address, detailCustomer.district, detailCustomer.city].filter(Boolean).join(', ')}
                  </div>
                )}
                {detailCustomer.source_channel && (
                  <div className="text-slate-500 text-xs">Kênh nguồn: <span className="font-medium">{detailCustomer.source_channel}</span></div>
                )}
                {detailCustomer.notes && (
                  <div className="mt-2 p-3 bg-amber-50 rounded-lg text-amber-800 text-xs border border-amber-100">
                    {detailCustomer.notes}
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                {[
                  { label: 'Đơn hàng', value: detailCustomer.total_orders },
                  { label: 'Chi tiêu', value: detailCustomer.total_spent > 0 ? formatCurrency(detailCustomer.total_spent) : '0' },
                  { label: 'Đơn cuối', value: formatDate(detailCustomer.last_order_date) },
                ].map(s => (
                  <div key={s.label} className="bg-slate-50 rounded-lg p-3 text-center">
                    <p className="font-bold text-slate-900 text-sm">{s.value}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Order history */}
              <div>
                <p className="font-semibold text-sm text-slate-700 mb-3 flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4" /> Lịch sử đơn hàng
                </p>
                {detailLoading ? (
                  <p className="text-sm text-slate-400 py-4 text-center">Đang tải...</p>
                ) : detailOrders.length === 0 ? (
                  <p className="text-sm text-slate-400 py-4 text-center">Chưa có đơn hàng nào</p>
                ) : (
                  <div className="space-y-2">
                    {detailOrders
                      .sort((a: any, b: any) => new Date(b.order_date).getTime() - new Date(a.order_date).getTime())
                      .map((o: any) => (
                        <div key={o.id} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-lg text-sm">
                          <div>
                            <p className="font-medium text-slate-800">{o.order_number}</p>
                            <p className="text-xs text-slate-400">{formatDate(o.order_date)} · {o.channel?.name ?? ''}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-slate-700">{formatCurrency(o.total_amount)}</p>
                            <span className="text-xs text-slate-400">{o.status}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              <div className="mt-6 flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => { setDetailCustomer(null); openEdit(detailCustomer) }}>
                  <Edit className="w-3.5 h-3.5 mr-1.5" /> Chỉnh sửa
                </Button>
                <Button variant="outline" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50"
                  onClick={() => { setDetailCustomer(null); setDeleteId(detailCustomer.id) }}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
