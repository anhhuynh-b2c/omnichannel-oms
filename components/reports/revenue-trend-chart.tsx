'use client'

import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CHANNEL_COLORS } from '@/constants'
import { formatCurrency } from '@/lib/utils/format'

const CHANNELS = ['Shopee', 'TikTok Shop', 'Lazada', 'Facebook', 'POS'] as const

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="bg-background border rounded-lg shadow-lg p-3 text-sm space-y-1">
        <p className="font-medium mb-1">{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} className="text-muted-foreground">
            {p.name}: <span className="font-semibold text-foreground">{formatCurrency(p.value)}</span>
          </p>
        ))}
      </div>
    )
  }
  return null
}

const FALLBACK_COLORS: Record<string, string> = {
  Shopee: '#EE4D2D',
  'TikTok Shop': '#6366f1',
  Lazada: '#0F146D',
  Facebook: '#1877F2',
  POS: '#10b981',
}

export function RevenueTrendChart({ data }: { data: Record<string, any>[] }) {
  const [active, setActive] = useState<string[]>([...CHANNELS])

  const toggle = (ch: string) =>
    setActive(prev => prev.includes(ch) ? prev.filter(c => c !== ch) : [...prev, ch])

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle className="text-base">Xu hướng doanh thu theo kênh</CardTitle>
            <p className="text-xs text-muted-foreground">6 tháng gần nhất</p>
          </div>
          <div className="flex flex-wrap gap-1">
            {CHANNELS.map(ch => (
              <Button
                key={ch}
                variant={active.includes(ch) ? 'default' : 'outline'}
                size="sm"
                className="h-6 text-xs px-2"
                style={active.includes(ch) ? { backgroundColor: FALLBACK_COLORS[ch], borderColor: FALLBACK_COLORS[ch] } : {}}
                onClick={() => toggle(ch)}
              >
                {ch}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} className="fill-muted-foreground" />
            <YAxis tickFormatter={v => `${(v / 1_000_000).toFixed(0)}M`} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} className="fill-muted-foreground" />
            <Tooltip content={<CustomTooltip />} />
            {CHANNELS.filter(ch => active.includes(ch)).map(ch => (
              <Line
                key={ch}
                type="monotone"
                dataKey={ch}
                stroke={FALLBACK_COLORS[ch]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
