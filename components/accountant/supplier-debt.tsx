'use client'

import { useState } from 'react'
import { AlertCircle, Clock, CreditCard, ChevronDown, ChevronRight, CheckCircle2, CircleDot, Circle } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/format'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'

interface DebtRow {
  id: string
  po_number: string
  status: string
  created_at: string
  expected_date: string | null
  supplier_name: string
  total_amount: number
  paid_amount: number
  outstanding: number
  payment_status: 'UNPAID' | 'PARTIAL' | 'PAID'
  items_count: number
}

interface DebtData {
  rows: DebtRow[]
  totalDebt: number
  totalPOs: number
  overdueCount: number
}

interface Payment {
  id: string
  amount: number
  payment_date: string
  method: string
  reference_number: string | null
  notes: string | null
  created_at: string
}

const METHOD_LABELS: Record<string, string> = {
  cash: 'Tiền mặt',
  bank_transfer: 'Chuyển khoản',
  check: 'Séc',
  other: 'Khác',
}

function paymentStatusBadge(s: 'UNPAID' | 'PARTIAL' | 'PAID') {
  if (s === 'PAID')    return { label: 'Đã thanh toán', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200', Icon: CheckCircle2 }
  if (s === 'PARTIAL') return { label: 'Thanh toán 1 phần', cls: 'bg-blue-100 text-blue-700 border-blue-200', Icon: CircleDot }
  return { label: 'Chưa thanh toán', cls: 'bg-red-100 text-red-700 border-red-200', Icon: Circle }
}

function poStatusLabel(s: string) {
  const map: Record<string, string> = { DRAFT: 'Nháp', PENDING: 'Chờ duyệt', APPROVED: 'Đã duyệt', RECEIVED: 'Đã nhận hàng' }
  return map[s] ?? s
}

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('vi-VN')
}

function isOverdue(expected: string | null) {
  return !!expected && new Date(expected) < new Date()
}

// ── Payment dialog ────────────────────────────────────────────────────────────
function PaymentDialog({
  po,
  onClose,
  onSuccess,
}: {
  po: DebtRow
  onClose: () => void
  onSuccess: () => void
}) {
  const [amount, setAmount] = useState(String(po.outstanding))
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [method, setMethod] = useState('bank_transfer')
  const [ref, setRef] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit() {
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) { toast.error('Số tiền không hợp lệ'); return }
    if (amt > po.outstanding + 0.01) { toast.error('Số tiền vượt quá công nợ còn lại'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/accountant/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purchase_order_id: po.id,
          amount: amt,
          payment_date: date,
          method,
          reference_number: ref || null,
          notes: notes || null,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success(`Đã ghi nhận thanh toán ${formatCurrency(amt)} cho ${po.po_number}`)
      onSuccess()
    } catch (e: any) {
      toast.error(e.message ?? 'Lỗi ghi nhận thanh toán')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ghi nhận thanh toán</DialogTitle>
        </DialogHeader>

        {/* PO summary */}
        <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Đơn nhập</span>
            <span className="font-mono font-medium">{po.po_number}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Nhà cung cấp</span>
            <span className="font-medium">{po.supplier_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tổng đơn</span>
            <span>{formatCurrency(po.total_amount)}</span>
          </div>
          {po.paid_amount > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Đã trả</span>
              <span className="text-emerald-600">{formatCurrency(po.paid_amount)}</span>
            </div>
          )}
          <div className="flex justify-between border-t pt-1 mt-1">
            <span className="font-medium">Còn lại</span>
            <span className="font-bold text-red-600">{formatCurrency(po.outstanding)}</span>
          </div>
        </div>

        {/* Form */}
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Số tiền thanh toán (VNĐ)</label>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full h-9 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              min={1}
              max={po.outstanding}
              step={1000}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Tối đa: {formatCurrency(po.outstanding)}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Ngày thanh toán</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Hình thức</label>
              <select
                value={method}
                onChange={e => setMethod(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {Object.entries(METHOD_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">
              Số tham chiếu <span className="text-muted-foreground font-normal">(số CK, số séc...)</span>
            </label>
            <input
              type="text"
              value={ref}
              onChange={e => setRef(e.target.value)}
              placeholder="VD: FT24060001234"
              className="w-full h-9 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Ghi chú</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Ghi chú nội bộ..."
              className="w-full px-3 py-2 rounded-lg border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Hủy</Button>
          <Button onClick={submit} disabled={saving} className="gap-2">
            <CreditCard className="w-4 h-4" />
            {saving ? 'Đang lưu...' : 'Ghi nhận thanh toán'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Payment history row (expandable) ─────────────────────────────────────────
function PORow({ row, onPaymentSuccess }: { row: DebtRow; onPaymentSuccess: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const [payments, setPayments] = useState<Payment[] | null>(null)
  const [loadingPay, setLoadingPay] = useState(false)
  const [showDialog, setShowDialog] = useState(false)

  const overdue = isOverdue(row.expected_date)
  const { label, cls, Icon } = paymentStatusBadge(row.payment_status)

  async function toggleExpand() {
    if (!expanded && payments === null) {
      setLoadingPay(true)
      try {
        const res = await fetch(`/api/accountant/payments?po_id=${row.id}`)
        setPayments(await res.json())
      } finally {
        setLoadingPay(false)
      }
    }
    setExpanded(v => !v)
  }

  async function handlePaymentSuccess() {
    setShowDialog(false)
    setPayments(null) // reset so it refetches
    onPaymentSuccess()
  }

  return (
    <>
      {showDialog && (
        <PaymentDialog po={row} onClose={() => setShowDialog(false)} onSuccess={handlePaymentSuccess} />
      )}

      <tr
        className="border-b hover:bg-muted/30 transition-colors cursor-pointer"
        onClick={toggleExpand}
      >
        <td className="px-4 py-3">
          {expanded
            ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
            : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
        </td>
        <td className="px-4 py-3 font-mono text-xs font-medium">{row.po_number}</td>
        <td className="px-4 py-3 font-medium">{row.supplier_name}</td>
        <td className="px-4 py-3">
          <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
            {poStatusLabel(row.status)}
          </span>
        </td>
        <td className="px-4 py-3 text-muted-foreground text-sm">{formatDate(row.created_at)}</td>
        <td className="px-4 py-3 text-sm">
          <span className={`flex items-center gap-1 ${overdue ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
            {overdue && <Clock className="w-3 h-3" />}
            {formatDate(row.expected_date)}
          </span>
        </td>
        <td className="px-4 py-3 text-right text-sm">{formatCurrency(row.total_amount)}</td>
        <td className="px-4 py-3 text-right text-sm text-emerald-600">
          {row.paid_amount > 0 ? formatCurrency(row.paid_amount) : '—'}
        </td>
        <td className="px-4 py-3 text-right font-medium text-red-600">{formatCurrency(row.outstanding)}</td>
        <td className="px-4 py-3">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
            <Icon className="w-3 h-3" />
            {label}
          </span>
        </td>
        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1"
            onClick={() => setShowDialog(true)}
          >
            <CreditCard className="w-3 h-3" />
            Thanh toán
          </Button>
        </td>
      </tr>

      {/* Expanded payment history */}
      {expanded && (
        <tr className="border-b bg-muted/20">
          <td colSpan={11} className="px-8 py-3">
            {loadingPay ? (
              <p className="text-sm text-muted-foreground py-2">Đang tải lịch sử thanh toán...</p>
            ) : payments && payments.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2 italic">Chưa có thanh toán nào được ghi nhận.</p>
            ) : (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Lịch sử thanh toán
                </p>
                {(payments ?? []).map(p => (
                  <div key={p.id} className="flex items-center gap-4 text-sm py-1 border-b border-dashed last:border-0">
                    <span className="text-muted-foreground w-24">{formatDate(p.payment_date)}</span>
                    <span className="font-medium text-emerald-700">{formatCurrency(Number(p.amount))}</span>
                    <span className="text-muted-foreground">{METHOD_LABELS[p.method] ?? p.method}</span>
                    {p.reference_number && (
                      <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{p.reference_number}</span>
                    )}
                    {p.notes && <span className="text-muted-foreground text-xs">{p.notes}</span>}
                  </div>
                ))}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export function SupplierDebt({
  data,
  loading,
  onRefresh,
}: {
  data: DebtData | null
  loading: boolean
  onRefresh: () => void
}) {
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          {[0,1,2].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border bg-card p-5">
          <p className="text-sm text-muted-foreground">Tổng công nợ còn lại</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(data.totalDebt)}</p>
          <p className="text-xs text-muted-foreground mt-1">{data.totalPOs} đơn chưa thanh toán hết</p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <p className="text-sm text-muted-foreground">Đơn quá hạn giao</p>
          <p className={`text-2xl font-bold mt-1 ${data.overdueCount > 0 ? 'text-orange-600' : 'text-emerald-600'}`}>
            {data.overdueCount}
          </p>
          <p className="text-xs text-muted-foreground mt-1">đơn quá ngày giao dự kiến</p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <p className="text-sm text-muted-foreground">Đơn chờ xử lý</p>
          <p className="text-2xl font-bold mt-1">{data.rows.filter(r => r.status === 'PENDING' || r.status === 'DRAFT').length}</p>
          <p className="text-xs text-muted-foreground mt-1">cần duyệt hoặc xác nhận</p>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-3 w-8" />
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Số PO</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nhà cung cấp</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Trạng thái PO</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Ngày tạo</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Ngày giao DK</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Tổng đơn</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Đã trả</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Còn lại</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Thanh toán</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {data.rows.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center text-muted-foreground">
                    Không có công nợ nào chưa thanh toán
                  </td>
                </tr>
              ) : (
                data.rows.map(row => (
                  <PORow key={row.id} row={row} onPaymentSuccess={onRefresh} />
                ))
              )}
            </tbody>
            {data.rows.length > 0 && (
              <tfoot>
                <tr className="bg-muted/40 font-semibold border-t">
                  <td colSpan={6} className="px-4 py-3 text-right text-sm">Tổng cộng</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(data.rows.reduce((s,r)=>s+r.total_amount,0))}</td>
                  <td className="px-4 py-3 text-right text-emerald-600">{formatCurrency(data.rows.reduce((s,r)=>s+r.paid_amount,0))}</td>
                  <td className="px-4 py-3 text-right text-red-600">{formatCurrency(data.totalDebt)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  )
}
