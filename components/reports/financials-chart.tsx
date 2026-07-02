'use client'

import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts'
import { formatCurrency } from '@/lib/utils/format'
import { TrendingUp, TrendingDown, DollarSign, ShoppingBag, Percent, AlertCircle } from 'lucide-react'

interface FinancialsData {
  summary: {
    totalRevenue: number
    totalCogs: number
    totalGrossProfit: number
    overallMargin: number
  }
  byChannel: {
    channel: string
    revenue: number
    cogs: number
    grossProfit: number
    margin: number
  }[]
  byCategory: {
    category: string
    revenue: number
    cogs: number
    grossProfit: number
    margin: number
  }[]
  trend: {
    date: string
    revenue: number
    cogs: number
    grossProfit: number
  }[]
  supplierDebt: { totalDebt: number; unpaidCount: number }
}

function fmt(v: number) { return formatCurrency(v) }
function fmtShort(v: number) {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}B`
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(0)}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`
  return String(v)
}

const MARGIN_COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899']

function SummaryCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string; sub?: string; icon: React.ElementType; color: string
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-1 text-xl font-bold tracking-tight">{value}</p>
          {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
        </div>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
      </div>
    </div>
  )
}

export function FinancialsChart({ data }: { data: FinancialsData }) {
  const { summary, byChannel, byCategory, trend, supplierDebt } = data

  return (
    <div className="space-y-6">
      {/* Section header */}
      <div className="flex items-center gap-2">
        <div className="w-1 h-5 bg-emerald-500 rounded-full" />
        <h2 className="text-base font-semibold">Tài chính & Kế toán</h2>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard
          label="Doanh thu"
          value={fmt(summary.totalRevenue)}
          icon={DollarSign}
          color="bg-blue-500"
        />
        <SummaryCard
          label="Giá vốn (COGS)"
          value={fmt(summary.totalCogs)}
          sub={`${summary.totalRevenue > 0 ? Math.round(summary.totalCogs / summary.totalRevenue * 100) : 0}% doanh thu`}
          icon={ShoppingBag}
          color="bg-orange-500"
        />
        <SummaryCard
          label="Lợi nhuận gộp"
          value={fmt(summary.totalGrossProfit)}
          sub={`Biên: ${summary.overallMargin}%`}
          icon={summary.totalGrossProfit >= 0 ? TrendingUp : TrendingDown}
          color={summary.totalGrossProfit >= 0 ? 'bg-emerald-500' : 'bg-red-500'}
        />
        <SummaryCard
          label="Công nợ NCC"
          value={fmt(supplierDebt.totalDebt)}
          sub={`${supplierDebt.unpaidCount} đơn chưa thanh toán`}
          icon={AlertCircle}
          color={supplierDebt.totalDebt > 0 ? 'bg-amber-500' : 'bg-slate-400'}
        />
      </div>

      {/* Revenue vs COGS vs Gross Profit trend */}
      {trend.length > 0 && (
        <div className="rounded-xl border bg-card p-5">
          <h3 className="text-sm font-semibold mb-4">Doanh thu / Giá vốn / Lợi nhuận gộp theo thời gian</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={trend} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={fmtShort} tick={{ fontSize: 11 }} width={52} />
              <Tooltip formatter={(v: any) => fmt(Number(v))} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="revenue" name="Doanh thu" stroke="#3b82f6" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="cogs" name="Giá vốn" stroke="#f97316" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="grossProfit" name="Lợi nhuận gộp" stroke="#10b981" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Gross profit by channel + by category side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* By channel */}
        {byChannel.length > 0 && (
          <div className="rounded-xl border bg-card p-5">
            <h3 className="text-sm font-semibold mb-4">Lợi nhuận gộp theo kênh</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={byChannel} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="channel" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={fmtShort} tick={{ fontSize: 11 }} width={52} />
                <Tooltip formatter={(v: any) => fmt(Number(v))} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="revenue" name="Doanh thu" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                <Bar dataKey="cogs" name="Giá vốn" fill="#f97316" radius={[3, 3, 0, 0]} />
                <Bar dataKey="grossProfit" name="Lợi nhuận gộp" fill="#10b981" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Margin by category */}
        {byCategory.length > 0 && (
          <div className="rounded-xl border bg-card p-5">
            <h3 className="text-sm font-semibold mb-4">Biên lợi nhuận theo danh mục</h3>
            <div className="space-y-2.5 mt-2">
              {byCategory.slice(0, 6).map((cat, i) => (
                <div key={cat.category}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium truncate max-w-32">{cat.category}</span>
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <span>{fmtShort(cat.grossProfit)}</span>
                      <span className={`font-semibold w-12 text-right ${cat.margin >= 20 ? 'text-emerald-600' : cat.margin >= 10 ? 'text-amber-600' : 'text-red-500'}`}>
                        {cat.margin}%
                      </span>
                    </div>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, Math.max(0, cat.margin))}%`,
                        backgroundColor: MARGIN_COLORS[i % MARGIN_COLORS.length],
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3 text-center">
              Xanh lá ≥ 20% · Vàng 10–20% · Đỏ &lt; 10%
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
