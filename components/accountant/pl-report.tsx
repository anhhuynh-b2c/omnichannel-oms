'use client'

import { TrendingUp, TrendingDown, DollarSign, ShoppingBag, BarChart3 } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { formatCurrency } from '@/lib/utils/format'
import { Skeleton } from '@/components/ui/skeleton'

interface PLData {
  revenue: number
  cogs: number
  grossProfit: number
  margin: number
  trend: { date: string; revenue: number }[]
}

function MetricCard({
  label,
  value,
  sub,
  positive,
  icon: Icon,
  color,
}: {
  label: string
  value: string
  sub?: string
  positive?: boolean
  icon: React.ElementType
  color: string
}) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-bold tracking-tight">{value}</p>
          {sub && (
            <p className={`mt-1 text-xs font-medium flex items-center gap-1 ${positive ? 'text-emerald-600' : 'text-red-500'}`}>
              {positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {sub}
            </p>
          )}
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
    </div>
  )
}

function formatDate(d: string) {
  const [, m, day] = d.split('-')
  return `${day}/${m}`
}

export function PLReport({ data, loading }: { data: PLData | null; loading: boolean }) {
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[0, 1, 2].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          label="Doanh thu"
          value={formatCurrency(data.revenue)}
          icon={DollarSign}
          color="bg-blue-500"
        />
        <MetricCard
          label="Giá vốn hàng bán (COGS)"
          value={formatCurrency(data.cogs)}
          icon={ShoppingBag}
          color="bg-orange-500"
        />
        <MetricCard
          label="Lợi nhuận gộp"
          value={formatCurrency(data.grossProfit)}
          sub={`Biên lợi nhuận: ${data.margin.toFixed(1)}%`}
          positive={data.grossProfit >= 0}
          icon={BarChart3}
          color={data.grossProfit >= 0 ? 'bg-emerald-500' : 'bg-red-500'}
        />
      </div>

      {/* P&L breakdown bar */}
      <div className="rounded-xl border bg-card p-5">
        <h3 className="text-sm font-semibold mb-4">Cơ cấu doanh thu</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground w-40">Doanh thu</span>
            <div className="flex-1 bg-muted rounded-full h-5 overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full" style={{ width: '100%' }} />
            </div>
            <span className="text-sm font-medium w-32 text-right">{formatCurrency(data.revenue)}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground w-40">Giá vốn (COGS)</span>
            <div className="flex-1 bg-muted rounded-full h-5 overflow-hidden">
              <div
                className="h-full bg-orange-400 rounded-full"
                style={{ width: `${data.revenue > 0 ? (data.cogs / data.revenue) * 100 : 0}%` }}
              />
            </div>
            <span className="text-sm font-medium w-32 text-right">{formatCurrency(data.cogs)}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground w-40">Lợi nhuận gộp</span>
            <div className="flex-1 bg-muted rounded-full h-5 overflow-hidden">
              <div
                className={`h-full rounded-full ${data.grossProfit >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`}
                style={{ width: `${data.revenue > 0 ? Math.abs(data.grossProfit / data.revenue) * 100 : 0}%` }}
              />
            </div>
            <span className="text-sm font-medium w-32 text-right">{formatCurrency(data.grossProfit)}</span>
          </div>
        </div>
      </div>

      {/* Revenue trend chart */}
      {data.trend.length > 0 && (
        <div className="rounded-xl border bg-card p-5">
          <h3 className="text-sm font-semibold mb-4">Xu hướng doanh thu theo ngày</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data.trend} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={v => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} width={48} />
              <Tooltip
                formatter={(v: any) => [formatCurrency(Number(v)), 'Doanh thu']}
                labelFormatter={(d: any) => formatDate(String(d))}
              />
              <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} fill="url(#revGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
