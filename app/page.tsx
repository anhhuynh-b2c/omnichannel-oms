import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { StatCard } from '@/components/shared/stat-card'
import { RevenueByChannelChart } from '@/components/dashboard/revenue-by-channel-chart'
import { SalesTrendChart } from '@/components/dashboard/sales-trend-chart'
import { TopProductsTable } from '@/components/dashboard/top-products-table'
import { LowStockTable } from '@/components/dashboard/low-stock-table'
import {
  MOCK_KPI,
  MOCK_REVENUE_BY_CHANNEL,
  MOCK_SALES_TREND_7,
  MOCK_SALES_TREND_30,
  MOCK_TOP_PRODUCTS,
  MOCK_LOW_STOCK,
} from '@/lib/mock-data'
import { formatCurrency, formatNumber } from '@/lib/utils/format'
import { DollarSign, ShoppingCart, AlertTriangle, Clock } from 'lucide-react'

export default function DashboardPage() {
  const kpi = MOCK_KPI

  return (
    <DashboardLayout titleKey="nav.dashboard">
      <div className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            title="Total Revenue"
            value={formatCurrency(kpi.total_revenue)}
            change={kpi.revenue_change}
            changeLabel="vs last 30 days"
            icon={DollarSign}
            iconColor="text-blue-600"
            iconBg="bg-blue-50 dark:bg-blue-950"
          />
          <StatCard
            title="New Orders"
            value={formatNumber(kpi.new_orders)}
            change={kpi.orders_change}
            changeLabel="vs last 30 days"
            icon={ShoppingCart}
            iconColor="text-emerald-600"
            iconBg="bg-emerald-50 dark:bg-emerald-950"
          />
          <StatCard
            title="Low Stock Products"
            value={formatNumber(kpi.low_stock_count)}
            icon={AlertTriangle}
            iconColor="text-orange-600"
            iconBg="bg-orange-50 dark:bg-orange-950"
          />
          <StatCard
            title="Pending Orders"
            value={formatNumber(kpi.pending_orders)}
            icon={Clock}
            iconColor="text-purple-600"
            iconBg="bg-purple-50 dark:bg-purple-950"
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <RevenueByChannelChart data={MOCK_REVENUE_BY_CHANNEL} />
          <SalesTrendChart data7={MOCK_SALES_TREND_7} data30={MOCK_SALES_TREND_30} />
        </div>

        {/* Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <TopProductsTable data={MOCK_TOP_PRODUCTS} />
          <LowStockTable data={MOCK_LOW_STOCK} />
        </div>
      </div>
    </DashboardLayout>
  )
}
