'use client'

import { useState, useEffect, useCallback } from 'react'
import { StatCard } from '@/components/shared/stat-card'
import { ChannelComparisonChart } from '@/components/reports/channel-comparison-chart'
import { RevenueTrendChart } from '@/components/reports/revenue-trend-chart'
import { OrderQualityChart } from '@/components/reports/order-quality-chart'
import { InventoryHealthChart } from '@/components/reports/inventory-health-chart'
import { TimeRangePicker, type TimeRange, getDateRange } from '@/components/reports/time-range-picker'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/lib/utils/format'
import { TrendingUp, ShoppingCart, XCircle, Package } from 'lucide-react'
import { FinancialsChart } from '@/components/reports/financials-chart'

interface ReportData {
  revenueByChannel: { channel: string; revenue: number; orders: number; prev_revenue: number }[]
  revenueTrend: Record<string, any>[]
  orderQuality: {
    total_orders: number
    cancelled: number
    returned: number
    cancel_rate: number
    return_rate: number
    by_channel: { channel: string; cancel_rate: number; return_rate: number }[]
  }
  inventoryHealth: {
    total_skus: number
    healthy: number
    low_stock: number
    out_of_stock: number
    dead_stock: number
    avg_turnover_days: number
    top_dead_stock: { name: string; sku: string; stock: number; last_sold_days: number }[]
    turnover_by_category: { category: string; avg_days: number }[]
  }
  financials?: {
    summary: { totalRevenue: number; totalCogs: number; totalGrossProfit: number; overallMargin: number }
    byChannel: { channel: string; revenue: number; cogs: number; grossProfit: number; margin: number }[]
    byCategory: { category: string; revenue: number; cogs: number; grossProfit: number; margin: number }[]
    trend: { date: string; revenue: number; cogs: number; grossProfit: number }[]
    supplierDebt: { totalDebt: number; unpaidCount: number }
  }
}

export function ReportsContent() {
  const [timeRange, setTimeRange] = useState<TimeRange>({ type: 'this_month' })
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async (range: TimeRange) => {
    setLoading(true)
    try {
      const { from, to } = getDateRange(range)
      const params = new URLSearchParams({
        from: from.toISOString(),
        to: to.toISOString(),
      })
      const res = await fetch(`/api/reports?${params}`)
      if (!res.ok) throw new Error('Failed to fetch')
      const json = await res.json()
      setData(json)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData(timeRange) }, [timeRange, fetchData])

  const totalRevenue = data?.revenueByChannel.reduce((s, c) => s + c.revenue, 0) ?? 0
  const totalPrevRevenue = data?.revenueByChannel.reduce((s, c) => s + c.prev_revenue, 0) ?? 0
  const revenueChange = totalPrevRevenue > 0
    ? Math.round(((totalRevenue - totalPrevRevenue) / totalPrevRevenue) * 1000) / 10
    : 0

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Báo cáo</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Phân tích hiệu suất kinh doanh theo kênh và thời gian
            </p>
          </div>
          <TimeRangePicker value={timeRange} onChange={setTimeRange} />
        </div>

        {/* KPI summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border p-6 space-y-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
            ))
          ) : (
            <>
              <StatCard
                title="Doanh thu"
                value={formatCurrency(totalRevenue)}
                change={revenueChange}
                changeLabel="vs kỳ trước"
                icon={TrendingUp}
                iconColor="text-blue-600"
                iconBg="bg-blue-50 dark:bg-blue-950"
              />
              <StatCard
                title="Tổng đơn hàng"
                value={(data?.orderQuality.total_orders ?? 0).toLocaleString()}
                icon={ShoppingCart}
                iconColor="text-emerald-600"
                iconBg="bg-emerald-50 dark:bg-emerald-950"
              />
              <StatCard
                title="Tỉ lệ hủy đơn"
                value={`${data?.orderQuality.cancel_rate ?? 0}%`}
                icon={XCircle}
                iconColor="text-red-600"
                iconBg="bg-red-50 dark:bg-red-950"
              />
              <StatCard
                title="SKU tồn chết"
                value={`${data?.inventoryHealth.dead_stock ?? 0} SKUs`}
                icon={Package}
                iconColor="text-amber-600"
                iconBg="bg-amber-50 dark:bg-amber-950"
              />
            </>
          )}
        </div>

        {/* Revenue trend */}
        {loading ? (
          <div className="rounded-xl border p-6"><Skeleton className="h-64 w-full" /></div>
        ) : (
          <RevenueTrendChart data={data?.revenueTrend ?? []} />
        )}

        {/* Channel comparison */}
        {loading ? (
          <div className="rounded-xl border p-6"><Skeleton className="h-64 w-full" /></div>
        ) : (
          <ChannelComparisonChart data={data?.revenueByChannel ?? []} />
        )}

        {/* Order quality */}
        {loading ? (
          <div className="rounded-xl border p-6"><Skeleton className="h-56 w-full" /></div>
        ) : (
          <OrderQualityChart data={data?.orderQuality.by_channel ?? []} />
        )}

        {/* Financials */}
        {!loading && data?.financials && (
          <FinancialsChart data={data.financials} />
        )}
        {loading && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[0,1,2,3].map(i => <div key={i} className="rounded-xl border p-4"><Skeleton className="h-16 w-full" /></div>)}
            </div>
            <div className="rounded-xl border p-6"><Skeleton className="h-56 w-full" /></div>
          </div>
        )}

        {/* Inventory health */}
        <div>
          <h2 className="text-base font-semibold mb-3">Hiệu suất tồn kho</h2>
          {loading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-xl border p-6"><Skeleton className="h-48 w-full" /></div>
              <div className="rounded-xl border p-6"><Skeleton className="h-48 w-full" /></div>
              <div className="rounded-xl border p-6 lg:col-span-2"><Skeleton className="h-40 w-full" /></div>
            </div>
          ) : (
            <InventoryHealthChart data={data?.inventoryHealth ?? {
              total_skus: 0, healthy: 0, low_stock: 0, out_of_stock: 0, dead_stock: 0,
              avg_turnover_days: 0, top_dead_stock: [], turnover_by_category: [],
            }} />
          )}
        </div>
    </div>
  )
}
