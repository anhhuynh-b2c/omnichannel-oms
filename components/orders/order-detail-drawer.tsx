'use client'

import { useState, useEffect, useTransition } from 'react'
import { X, Package, User, Truck, CreditCard, Hash, StickyNote, Pencil, Check, Minus, Plus, UserCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { OrderStatusBadge } from '@/components/shared/status-badge'
import { ChannelBadge } from '@/components/shared/channel-badge'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import { getOrderById, updateTrackingNumber, updateOrder, updateCustomer } from '@/lib/actions/order.actions'

interface OrderDetailDrawerProps {
  orderId: string | null
  onClose: () => void
  onUpdated?: () => void
}

type OrderDetail = Awaited<ReturnType<typeof getOrderById>>

const PAYMENT_LABEL: Record<string, string> = {
  CASH: 'Tiền mặt',
  TRANSFER: 'Chuyển khoản',
  CARD: 'Thẻ',
  COD: 'COD',
  MIXED: 'Hỗn hợp',
}

// Allow editing for early-stage orders
const EDITABLE_STATUSES = ['PENDING', 'CONFIRMED', 'PACKING']

interface EditState {
  notes: string
  discount_amount: number
  shipping_fee: number
  payment_method: string
  items: { id: string; quantity: number; unit_price: number; name: string; sku: string }[]
  customer: { name: string; phone: string; email: string; address: string }
}

export function OrderDetailDrawer({ orderId, onClose, onUpdated }: OrderDetailDrawerProps) {
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [trackingInput, setTrackingInput] = useState('')
  const [editingTracking, setEditingTracking] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [edit, setEdit] = useState<EditState | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (!orderId) return
    setLoading(true)
    setOrder(null)
    setEditMode(false)
    setEditingTracking(false)
    getOrderById(orderId).then((d: OrderDetail) => {
      setOrder(d)
      setTrackingInput(d?.tracking_number ?? '')
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [orderId])

  const enterEditMode = () => {
    if (!order) return
    setEdit({
      notes: order.notes ?? '',
      discount_amount: order.discount_amount ?? 0,
      shipping_fee: order.shipping_fee ?? 0,
      payment_method: order.payment_method ?? 'CASH',
      items: (order.order_items ?? []).map((i: any) => ({
        id: i.id,
        quantity: i.quantity,
        unit_price: i.unit_price ?? i.price ?? 0,
        name: i.products?.name ?? '—',
        sku: i.products?.master_sku ?? '',
      })),
      customer: {
        name: order.customers?.name ?? '',
        phone: order.customers?.phone ?? '',
        email: order.customers?.email ?? '',
        address: order.customers?.address ?? '',
      },
    })
    setEditMode(true)
  }

  const cancelEdit = () => {
    setEditMode(false)
    setEdit(null)
  }

  const setItemQty = (idx: number, qty: number) => {
    if (!edit) return
    const items = edit.items.map((it, i) => i === idx ? { ...it, quantity: Math.max(1, qty) } : it)
    setEdit({ ...edit, items })
  }

  const removeItem = (idx: number) => {
    if (!edit || edit.items.length <= 1) return
    setEdit({ ...edit, items: edit.items.filter((_, i) => i !== idx) })
  }

  const editSubtotal = edit
    ? edit.items.reduce((s, i) => s + i.quantity * i.unit_price, 0)
    : 0
  const editTotal = edit
    ? Math.max(0, editSubtotal - edit.discount_amount) + edit.shipping_fee
    : 0

  const handleSaveEdit = () => {
    if (!orderId || !edit) return
    startTransition(async () => {
      try {
        await Promise.all([
          updateOrder(orderId, {
            notes: edit.notes,
            discount_amount: edit.discount_amount,
            shipping_fee: edit.shipping_fee,
            payment_method: edit.payment_method,
            items: edit.items,
          }),
          order?.customer_id
            ? updateCustomer(order.customer_id, edit.customer)
            : Promise.resolve(),
        ])
        const updated = await getOrderById(orderId)
        setOrder(updated)
        setEditMode(false)
        setEdit(null)
        toast.success('Đã lưu thay đổi')
        onUpdated?.()
      } catch (e) {
        toast.error((e as Error).message)
      }
    })
  }

  const handleSaveTracking = () => {
    if (!orderId || !trackingInput.trim()) return
    startTransition(async () => {
      try {
        await updateTrackingNumber(orderId, trackingInput.trim())
        setOrder((prev: OrderDetail) => prev ? { ...prev, tracking_number: trackingInput.trim() } : prev)
        setEditingTracking(false)
        toast.success('Đã lưu mã vận đơn')
      } catch (e) {
        toast.error((e as Error).message)
      }
    })
  }

  if (!orderId) return null

  const canEdit = order && EDITABLE_STATUSES.includes(order.status)

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={editMode ? undefined : onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-xl bg-background shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <div className="flex items-center gap-3">
            <span className="font-mono font-bold text-base">
              {loading ? '...' : order?.order_number}
            </span>
            {order && <OrderStatusBadge status={order.status as any} />}
            {editMode && (
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-medium">
                Đang chỉnh sửa
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!editMode && canEdit && (
              <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={enterEditMode}>
                <Pencil className="w-3.5 h-3.5" /> Chỉnh sửa
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={editMode ? cancelEdit : onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
            Đang tải...
          </div>
        ) : order ? (
          <>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Channel + Date */}
              <div className="flex items-center justify-between">
                <ChannelBadge name={order.channels?.name ?? '—'} />
                <span className="text-sm text-muted-foreground">{formatDate(order.order_date)}</span>
              </div>

              {order.external_order_id && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded px-3 py-1.5">
                  <Hash className="w-3 h-3 shrink-0" />
                  <span>Mã sàn:</span>
                  <span className="font-mono font-medium text-foreground">{order.external_order_id}</span>
                </div>
              )}

              {(order as any).created_by_name && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded px-3 py-1.5">
                  <UserCheck className="w-3 h-3 shrink-0" />
                  <span>Nhân viên lên đơn:</span>
                  <span className="font-medium text-foreground">{(order as any).created_by_name}</span>
                </div>
              )}

              {/* Customer */}
              <Section icon={<User className="w-4 h-4" />} title="Khách hàng">
                {editMode && edit ? (
                  <div className="space-y-2">
                    {(
                      [
                        { key: 'name',    label: 'Tên',      type: 'text' },
                        { key: 'phone',   label: 'SĐT',      type: 'tel' },
                        { key: 'email',   label: 'Email',    type: 'email' },
                        { key: 'address', label: 'Địa chỉ',  type: 'text' },
                      ] as const
                    ).map(f => (
                      <div key={f.key} className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground w-20 shrink-0">{f.label}</span>
                        <Input
                          type={f.type}
                          value={edit.customer[f.key]}
                          onChange={e => setEdit({
                            ...edit,
                            customer: { ...edit.customer, [f.key]: e.target.value },
                          })}
                          className="h-8 text-sm flex-1"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    <Row label="Tên" value={order.customers?.name ?? '—'} />
                    <Row label="SĐT" value={order.customers?.phone ?? '—'} />
                    <Row label="Email" value={order.customers?.email ?? '—'} />
                    <Row label="Địa chỉ" value={order.customers?.address ?? '—'} />
                  </>
                )}
              </Section>

              {/* Items */}
              <Section icon={<Package className="w-4 h-4" />} title="Sản phẩm">
                {editMode && edit ? (
                  <div className="space-y-3">
                    {edit.items.map((item, idx) => (
                      <div key={item.id} className="flex items-center gap-2 text-sm">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{item.sku}</p>
                          <p className="text-xs text-muted-foreground">{formatCurrency(item.unit_price)} / cái</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="outline" size="icon"
                            className="h-7 w-7"
                            onClick={() => setItemQty(idx, item.quantity - 1)}
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <Input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={e => setItemQty(idx, parseInt(e.target.value) || 1)}
                            className="h-7 w-14 text-center text-sm px-1"
                          />
                          <Button
                            variant="outline" size="icon"
                            className="h-7 w-7"
                            onClick={() => setItemQty(idx, item.quantity + 1)}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                        <div className="w-24 text-right shrink-0">
                          <p className="font-medium">{formatCurrency(item.quantity * item.unit_price)}</p>
                        </div>
                        <Button
                          variant="ghost" size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                          onClick={() => removeItem(idx)}
                          disabled={edit.items.length <= 1}
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
                    <div className="pt-2 border-t text-sm text-right text-muted-foreground">
                      Tạm tính: <span className="font-medium text-foreground">{formatCurrency(editSubtotal)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(order.order_items ?? []).map((item: any) => (
                      <div key={item.id} className="flex items-center justify-between gap-2 text-sm">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{item.products?.name ?? '—'}</p>
                          <p className="text-xs text-muted-foreground">{item.products?.master_sku}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-muted-foreground">×{item.quantity}</p>
                          <p className="font-medium">{formatCurrency(item.subtotal ?? (item.unit_price ?? item.price) * item.quantity)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Section>

              {/* Payment */}
              <Section icon={<CreditCard className="w-4 h-4" />} title="Thanh toán">
                {editMode && edit ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm text-muted-foreground shrink-0">Phương thức</span>
                      <Select
                        value={edit.payment_method}
                        onValueChange={v => setEdit({ ...edit, payment_method: v })}
                      >
                        <SelectTrigger className="h-8 w-40 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(PAYMENT_LABEL).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm text-muted-foreground shrink-0">Giảm giá</span>
                      <Input
                        type="number"
                        min={0}
                        value={edit.discount_amount}
                        onChange={e => setEdit({ ...edit, discount_amount: parseFloat(e.target.value) || 0 })}
                        className="h-8 w-40 text-sm text-right"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm text-muted-foreground shrink-0">Phí vận chuyển</span>
                      <Input
                        type="number"
                        min={0}
                        value={edit.shipping_fee}
                        onChange={e => setEdit({ ...edit, shipping_fee: parseFloat(e.target.value) || 0 })}
                        className="h-8 w-40 text-sm text-right"
                      />
                    </div>
                    <div className="flex justify-between text-sm font-semibold pt-2 border-t">
                      <span>Tổng cộng</span>
                      <span>{formatCurrency(editTotal)}</span>
                    </div>
                  </div>
                ) : (
                  <>
                    <Row label="Phương thức" value={PAYMENT_LABEL[order.payment_method ?? ''] ?? order.payment_method ?? '—'} />
                    {(order.discount_amount ?? 0) > 0 && (
                      <Row label="Giảm giá" value={`-${formatCurrency(order.discount_amount ?? 0)}`} />
                    )}
                    {(order.shipping_fee ?? 0) > 0 && (
                      <Row label="Phí vận chuyển" value={formatCurrency(order.shipping_fee ?? 0)} />
                    )}
                    <Row label="Tổng cộng" value={formatCurrency(order.total_amount)} bold />
                  </>
                )}
              </Section>

              {/* Tracking — hidden during edit */}
              {!editMode && (
                <Section icon={<Truck className="w-4 h-4" />} title="Vận chuyển">
                  {editingTracking ? (
                    <div className="flex gap-2">
                      <Input
                        value={trackingInput}
                        onChange={e => setTrackingInput(e.target.value)}
                        placeholder="Nhập mã vận đơn..."
                        className="h-8 text-sm"
                        onKeyDown={e => e.key === 'Enter' && handleSaveTracking()}
                      />
                      <Button size="sm" className="h-8" onClick={handleSaveTracking} disabled={isPending}>
                        Lưu
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8" onClick={() => setEditingTracking(false)}>
                        Hủy
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <Row label="Mã vận đơn" value={order.tracking_number ?? 'Chưa có'} />
                      {['SHIPPED', 'DELIVERED'].includes(order.status) && (
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setEditingTracking(true)}>
                          {order.tracking_number ? 'Sửa' : 'Thêm'}
                        </Button>
                      )}
                    </div>
                  )}
                  {order.shipped_at && (
                    <Row label="Ngày gửi" value={formatDate(order.shipped_at)} />
                  )}
                </Section>
              )}

              {/* Notes */}
              <Section icon={<StickyNote className="w-4 h-4" />} title="Ghi chú">
                {editMode && edit ? (
                  <Textarea
                    value={edit.notes}
                    onChange={e => setEdit({ ...edit, notes: e.target.value })}
                    placeholder="Ghi chú nội bộ..."
                    className="text-sm min-h-[80px] resize-none"
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">{order.notes || '—'}</p>
                )}
              </Section>
            </div>

            {/* Edit footer */}
            {editMode && (
              <div className="shrink-0 border-t px-6 py-4 flex justify-end gap-2 bg-background">
                <Button variant="outline" onClick={cancelEdit} disabled={isPending}>
                  Hủy
                </Button>
                <Button onClick={handleSaveEdit} disabled={isPending} className="gap-1.5">
                  <Check className="w-4 h-4" /> Lưu thay đổi
                </Button>
              </div>
            )}
          </>
        ) : null}
      </div>
    </>
  )
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        {icon} {title}
      </div>
      <div className="pl-6 space-y-2">{children}</div>
    </div>
  )
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={bold ? 'font-semibold' : ''}>{value}</span>
    </div>
  )
}
