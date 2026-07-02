'use client'

import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, ArrowUpCircle, ArrowDownCircle, CreditCard } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/format'

interface TxRow {
  id: string
  kind: 'inventory' | 'payment'
  created_at: string
  type: string
  type_label: string
  description: string
  sku: string | null
  qty_change: number | null
  amount: number | null
  reference: string | null
  notes: string | null
}

interface TxData {
  rows: TxRow[]
  total: number
  page: number
  pageSize: number
}

const TYPE_COLORS: Record<string, string> = {
  SALE:         'text-blue-600',
  PURCHASE:     'text-emerald-600',
  RETURN:       'text-orange-500',
  ADJUSTMENT:   'text-purple-600',
  CANCELLATION: 'text-red-500',
  PAYMENT:      'text-teal-600',
}

function formatDate(d: string) {
  return new Date(d).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })
}

export function TransactionHistory({
  data,
  loading,
  onPageChange,
}: {
  data: TxData | null
  loading: boolean
  onPageChange: (page: number) => void
}) {
  if (loading) return <Skeleton className="h-96 rounded-xl" />
  if (!data) return null

  const totalPages = Math.ceil(data.total / data.pageSize)

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Thời gian</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Loại</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Mô tả</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">SKU</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Số lượng</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Số tiền</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tham chiếu</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                    Không có giao dịch nào trong kỳ
                  </td>
                </tr>
              ) : (
                data.rows.map(row => (
                  <tr key={row.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap text-xs">{formatDate(row.created_at)}</td>
                    <td className="px-4 py-3">
                      <span className={`font-medium flex items-center gap-1.5 ${TYPE_COLORS[row.type] ?? 'text-foreground'}`}>
                        {row.kind === 'payment' && <CreditCard className="w-3.5 h-3.5" />}
                        {row.type_label}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium max-w-48 truncate">{row.description}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{row.sku ?? '—'}</td>
                    <td className="px-4 py-3 text-right">
                      {row.qty_change != null ? (
                        <span className={`inline-flex items-center gap-1 font-mono font-medium ${row.qty_change > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                          {row.qty_change > 0
                            ? <ArrowUpCircle className="w-3.5 h-3.5" />
                            : <ArrowDownCircle className="w-3.5 h-3.5" />}
                          {row.qty_change > 0 ? '+' : ''}{row.qty_change}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {row.amount != null
                        ? <span className="text-teal-600">{formatCurrency(row.amount)}</span>
                        : '—'}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{row.reference ?? '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{row.notes ?? '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20">
            <p className="text-sm text-muted-foreground">
              {data.total} giao dịch · Trang {data.page}/{totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={data.page <= 1} onClick={() => onPageChange(data.page - 1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" disabled={data.page >= totalPages} onClick={() => onPageChange(data.page + 1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
