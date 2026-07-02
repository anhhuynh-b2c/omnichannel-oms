'use client'

import { useState, useEffect, useCallback } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { TimeRangePicker, type TimeRange, getDateRange } from '@/components/reports/time-range-picker'
import { PLReport } from '@/components/accountant/pl-report'
import { SupplierDebt } from '@/components/accountant/supplier-debt'
import { TransactionHistory } from '@/components/accountant/transaction-history'
import { Button } from '@/components/ui/button'
import { Download, FileText, Table2, TrendingUp, ArrowLeftRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/utils/format'
import { toast } from 'sonner'

type Tab = 'pl' | 'debt' | 'transactions'

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'pl',           label: 'Lãi & Lỗ (P&L)',     icon: TrendingUp },
  { id: 'debt',         label: 'Công nợ NCC',          icon: FileText },
  { id: 'transactions', label: 'Lịch sử giao dịch',   icon: ArrowLeftRight },
]

// ── CSV export helpers ──────────────────────────────────────────────────────
function downloadCSV(filename: string, rows: string[][], headers: string[]) {
  const bom = '﻿'
  const csv = [headers, ...rows]
    .map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function exportPLAsCSV(data: any, period: string) {
  downloadCSV(`PL_${period}.csv`, [
    ['Doanh thu', String(data.revenue)],
    ['Giá vốn hàng bán (COGS)', String(data.cogs)],
    ['Lợi nhuận gộp', String(data.grossProfit)],
    ['Biên lợi nhuận (%)', data.margin.toFixed(2)],
    [],
    ['Ngày', 'Doanh thu'],
    ...(data.trend ?? []).map((t: any) => [t.date, String(t.revenue)]),
  ], ['Chỉ tiêu', 'Giá trị'])
}

function exportDebtAsCSV(data: any, period: string) {
  downloadCSV(`CongNo_NCC_${period}.csv`,
    data.rows.map((r: any) => [
      r.po_number,
      r.supplier_name,
      r.status,
      new Date(r.created_at).toLocaleDateString('vi-VN'),
      r.expected_date ? new Date(r.expected_date).toLocaleDateString('vi-VN') : '',
      String(r.total_amount),
      String(r.paid_amount),
      String(r.outstanding),
      r.payment_status,
    ]),
    ['Số PO', 'Nhà cung cấp', 'Trạng thái PO', 'Ngày tạo', 'Ngày giao DK', 'Tổng đơn (VND)', 'Đã trả (VND)', 'Còn lại (VND)', 'Trạng thái TT']
  )
}

function exportTransactionsAsCSV(data: any, period: string) {
  downloadCSV(`GiaoDich_${period}.csv`,
    data.rows.map((r: any) => [
      new Date(r.created_at).toLocaleString('vi-VN'),
      r.products?.name ?? '',
      r.products?.master_sku ?? '',
      r.movement_type,
      String(r.qty_change),
      r.notes ?? '',
    ]),
    ['Thời gian', 'Sản phẩm', 'SKU', 'Loại giao dịch', 'Số lượng', 'Ghi chú']
  )
}

function printAsPDF() {
  window.print()
}

// ────────────────────────────────────────────────────────────────────────────
export function AccountantContent() {
  const [tab, setTab] = useState<Tab>('pl')
  const [timeRange, setTimeRange] = useState<TimeRange>({ type: 'this_month' })
  const [plData, setPlData] = useState<any>(null)
  const [debtData, setDebtData] = useState<any>(null)
  const [txData, setTxData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [txPage, setTxPage] = useState(1)

  const periodLabel = (() => {
    const { from, to } = getDateRange(timeRange)
    return `${from.toLocaleDateString('vi-VN')}_${to.toLocaleDateString('vi-VN')}`.replace(/\//g, '-')
  })()

  const fetchData = useCallback(async (range: TimeRange, page = 1) => {
    setLoading(true)
    try {
      const { from, to } = getDateRange(range)
      const params = new URLSearchParams({ from: from.toISOString(), to: to.toISOString() })

      const [plRes, debtRes, txRes] = await Promise.all([
        fetch(`/api/accountant?${params}&type=pl`).then(r => r.json()),
        fetch(`/api/accountant?${params}&type=supplier_debt`).then(r => r.json()),
        fetch(`/api/accountant?${params}&type=transactions&page=${page}`).then(r => r.json()),
      ])

      setPlData(plRes)
      setDebtData(debtRes)
      setTxData(txRes)
    } catch {
      toast.error('Không thể tải dữ liệu kế toán')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    setTxPage(1)
    fetchData(timeRange, 1)
  }, [timeRange, fetchData])

  async function handleTxPageChange(page: number) {
    setTxPage(page)
    setLoading(true)
    try {
      const { from, to } = getDateRange(timeRange)
      const params = new URLSearchParams({ from: from.toISOString(), to: to.toISOString() })
      const res = await fetch(`/api/accountant?${params}&type=transactions&page=${page}`).then(r => r.json())
      setTxData(res)
    } finally {
      setLoading(false)
    }
  }

  function handleExportCSV() {
    if (tab === 'pl' && plData) exportPLAsCSV(plData, periodLabel)
    else if (tab === 'debt' && debtData) exportDebtAsCSV(debtData, periodLabel)
    else if (tab === 'transactions' && txData) exportTransactionsAsCSV(txData, periodLabel)
    else toast.info('Không có dữ liệu để xuất')
  }

  return (
    <DashboardLayout>
      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
        }
      `}</style>

      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
          <div>
            <h1 className="text-xl font-bold">Kế toán</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Báo cáo tài chính & giao dịch</p>
          </div>
          <div className="flex items-center gap-2">
            <TimeRangePicker value={timeRange} onChange={setTimeRange} />
            <Button variant="outline" size="sm" className="gap-2" onClick={handleExportCSV}>
              <Table2 className="w-4 h-4" />
              Excel (CSV)
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={printAsPDF}>
              <Download className="w-4 h-4" />
              PDF
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-muted/50 rounded-xl p-1 w-fit no-print">
          {TABS.map(t => {
            const Icon = t.icon
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                  tab === t.id
                    ? 'bg-background shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            )
          })}
        </div>

        {/* Content */}
        <div className="print-area">
          {tab === 'pl' && <PLReport data={plData} loading={loading} />}
          {tab === 'debt' && (
            <SupplierDebt
              data={debtData}
              loading={loading}
              onRefresh={() => fetchData(timeRange, txPage)}
            />
          )}
          {tab === 'transactions' && (
            <TransactionHistory
              data={txData}
              loading={loading}
              onPageChange={handleTxPageChange}
            />
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
