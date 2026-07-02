import { Suspense } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { StatCard } from '@/components/shared/stat-card'
import { RevenueByChannelChart } from '@/components/dashboard/revenue-by-channel-chart'
import { SalesTrendChart } from '@/components/dashboard/sales-trend-chart'
import { TopProductsTable } from '@/components/dashboard/top-products-table'
import { LowStockTable } from '@/components/dashboard/low-stock-table'
import { DateRangeFilter } from '@/components/dashboard/date-range-filter'
import {
  getDashboardKPI,
  getRevenueByChannel,
  getSalesTrend,
  getTopProducts,
  getLowStockAlerts,
} from '@/lib/data/dashboard'
import { formatCurrency, formatNumber } from '@/lib/utils/format'
import { DollarSign, ShoppingCart, AlertTriangle, Clock } from 'lucide-react'

const VALID_RANGES = ['7', '30', '90', '365']

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>
}) {
  const { range } = await searchParams
  const rangeStr = VALID_RANGES.includes(range ?? '') ? (range as string) : '30'
  const days = parseInt(rangeStr, 10)

  const [kpi, revenueByChannel, salesTrend7, salesTrend30, topProducts, lowStock] = await Promise.allSettled([
    getDashboardKPI(days),
    getRevenueByChannel(days),
    getSalesTrend(7),
    getSalesTrend(days),
    getTopProducts(10, days),
    getLowStockAlerts(),
  ]).then(results => results.map(r => r.status === 'fulfilled' ? r.value : null))

  const safeKpi = (kpi as Awaited<ReturnType<typeof getDashboardKPI>> | null) ?? {
    total_revenue: 0, revenue_change: 0, new_orders: 0, orders_change: 0, low_stock_count: 0, pending_orders: 0,
  }

  return (
    <DashboardLayout titleKey="nav.dashboard">
      <div className="space-y-6">
        {/* Time Range Filter */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Dữ liệu trong <span className="font-medium text-foreground">{days} ngày</span> gần nhất
          </p>
          <Suspense>
            <DateRangeFilter current={rangeStr} />
          </Suspense>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            title="Total Revenue"
            value={formatCurrency(safeKpi.total_revenue)}
            change={safeKpi.revenue_change}
            changeLabel={`vs ${days} ngày trước`}
            icon={DollarSign}
            iconColor="text-blue-600"
            iconBg="bg-blue-50 dark:bg-blue-950"
            href="/orders"
          />
          <StatCard
            title="New Orders"
            value={formatNumber(safeKpi.new_orders)}
            change={safeKpi.orders_change}
            changeLabel={`vs ${days} ngày trước`}
            icon={ShoppingCart}
            iconColor="text-emerald-600"
            iconBg="bg-emerald-50 dark:bg-emerald-950"
            href="/orders"
          />
          <StatCard
            title="Low Stock Products"
            value={formatNumber(safeKpi.low_stock_count)}
            icon={AlertTriangle}
            iconColor="text-orange-600"
            iconBg="bg-orange-50 dark:bg-orange-950"
            href="/inventory"
          />
          <StatCard
            title="Pending Orders"
            value={formatNumber(safeKpi.pending_orders)}
            icon={Clock}
            iconColor="text-purple-600"
            iconBg="bg-purple-50 dark:bg-purple-950"
            href="/orders?status=pending"
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <RevenueByChannelChart data={(revenueByChannel as any) ?? []} />
          <SalesTrendChart data7={(salesTrend7 as any) ?? []} data30={(salesTrend30 as any) ?? []} />
        </div>

        {/* Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <TopProductsTable data={(topProducts as any) ?? []} />
          <LowStockTable data={(lowStock as any) ?? []} />
        </div>
      </div>
    </DashboardLayout>
  )
}
