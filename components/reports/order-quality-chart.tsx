'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ChannelQuality {
  channel: string
  cancel_rate: number
  return_rate: number
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="bg-background border rounded-lg shadow-lg p-3 text-sm space-y-1">
        <p className="font-medium mb-1">{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} className="text-muted-foreground">
            {p.name}: <span className="font-semibold text-foreground">{p.value.toFixed(1)}%</span>
          </p>
        ))}
      </div>
    )
  }
  return null
}

export function OrderQualityChart({ data }: { data: ChannelQuality[] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Tỉ lệ hủy & hoàn hàng theo kênh</CardTitle>
        <p className="text-xs text-muted-foreground">30 ngày gần nhất (%)</p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
            <XAxis dataKey="channel" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} className="fill-muted-foreground" />
            <YAxis tickFormatter={v => `${v}%`} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} className="fill-muted-foreground" />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
            <Legend formatter={v => <span className="text-xs text-muted-foreground">{v}</span>} />
            <Bar dataKey="cancel_rate" name="Hủy đơn" fill="#ef4444" radius={[3, 3, 0, 0]} />
            <Bar dataKey="return_rate" name="Hoàn hàng" fill="#f97316" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
