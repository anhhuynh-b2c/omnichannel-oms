'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CHANNEL_COLORS } from '@/constants'
import { formatCurrency } from '@/lib/utils/format'

interface ChannelRow {
  channel: string
  revenue: number
  orders: number
  prev_revenue: number
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="bg-background border rounded-lg shadow-lg p-3 text-sm space-y-1">
        <p className="font-medium mb-1">{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} className="text-muted-foreground">
            {p.name}: <span className="font-semibold text-foreground">
              {p.name === 'Kỳ này' || p.name === 'Kỳ trước' ? formatCurrency(p.value) : p.value + ' đơn'}
            </span>
          </p>
        ))}
      </div>
    )
  }
  return null
}

export function ChannelComparisonChart({ data }: { data: ChannelRow[] }) {
  const chartData = data.map(d => ({
    channel: d.channel,
    'Kỳ này': d.revenue,
    'Kỳ trước': d.prev_revenue,
  }))

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">So sánh doanh thu theo kênh</CardTitle>
        <p className="text-xs text-muted-foreground">30 ngày gần nhất vs 30 ngày trước</p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
            <XAxis dataKey="channel" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} className="fill-muted-foreground" />
            <YAxis tickFormatter={v => `${(v / 1_000_000).toFixed(0)}M`} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} className="fill-muted-foreground" />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
            <Legend formatter={v => <span className="text-xs text-muted-foreground">{v}</span>} />
            <Bar dataKey="Kỳ này" fill="#3b82f6" radius={[3, 3, 0, 0]} />
            <Bar dataKey="Kỳ trước" fill="#cbd5e1" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
