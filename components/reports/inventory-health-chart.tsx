'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle } from 'lucide-react'

interface InventoryHealth {
  total_skus: number
  healthy: number
  low_stock: number
  out_of_stock: number
  dead_stock: number
  avg_turnover_days: number
  top_dead_stock: { name: string; sku: string; stock: number; last_sold_days: number }[]
  turnover_by_category: { category: string; avg_days: number }[]
}

const PIE_COLORS = ['#10b981', '#f59e0b', '#ef4444', '#6366f1']

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload?.length) {
    return (
      <div className="bg-background border rounded-lg shadow-lg p-3 text-sm">
        <p className="font-medium">{payload[0].name}</p>
        <p className="text-muted-foreground">{payload[0].value} SKUs</p>
      </div>
    )
  }
  return null
}

export function InventoryHealthChart({ data }: { data: InventoryHealth }) {
  const pieData = [
    { name: 'Bình thường', value: data.healthy },
    { name: 'Sắp hết', value: data.low_stock },
    { name: 'Hết hàng', value: data.out_of_stock },
    { name: 'Tồn chết', value: data.dead_stock },
  ]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Phân bổ tình trạng tồn kho</CardTitle>
          <p className="text-xs text-muted-foreground">Tổng {data.total_skus} SKUs</p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend formatter={v => <span className="text-xs text-muted-foreground">{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Vòng quay hàng theo danh mục</CardTitle>
          <p className="text-xs text-muted-foreground">Số ngày trung bình để bán hết</p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.turnover_by_category} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}d`} className="fill-muted-foreground" />
              <YAxis type="category" dataKey="category" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={60} className="fill-muted-foreground" />
              <Tooltip formatter={(v: any) => [`${v} ngày`, 'Vòng quay']} />
              <Bar dataKey="avg_days" fill="#3b82f6" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <CardTitle className="text-base">Hàng tồn chết — cần xử lý</CardTitle>
          </div>
          <p className="text-xs text-muted-foreground">Sản phẩm chưa có đơn trong hơn 30 ngày</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data.top_dead_stock.map(item => (
              <div key={item.sku} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <p className="text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.sku}</p>
                </div>
                <div className="flex items-center gap-3 text-right">
                  <div>
                    <p className="text-xs text-muted-foreground">Tồn kho</p>
                    <p className="text-sm font-semibold">{item.stock}</p>
                  </div>
                  <Badge variant="destructive" className="text-xs">
                    {item.last_sold_days} ngày
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
