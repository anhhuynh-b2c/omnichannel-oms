'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { LowStockAlert } from '@/types'
import { formatNumber } from '@/lib/utils/format'
import { AlertTriangle, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LowStockTableProps {
  data: LowStockAlert[]
  loading?: boolean
}

export function LowStockTable({ data, loading }: LowStockTableProps) {
  const router = useRouter()
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">Low Stock Alerts</CardTitle>
            {!loading && data.length > 0 && (
              <span className="px-1.5 py-0.5 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded text-xs font-medium">
                {data.length}
              </span>
            )}
          </div>
          <Link href="/inventory" className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors">
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left font-medium text-muted-foreground text-xs uppercase tracking-wide px-4 py-2.5">Product</th>
                <th className="text-right font-medium text-muted-foreground text-xs uppercase tracking-wide px-4 py-2.5">Stock</th>
                <th className="text-right font-medium text-muted-foreground text-xs uppercase tracking-wide px-4 py-2.5">Safety</th>
                <th className="text-right font-medium text-muted-foreground text-xs uppercase tracking-wide px-4 py-2.5">Reorder</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b last:border-0">
                      {Array.from({ length: 4 }).map((_, j) => (
                        <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                      ))}
                    </tr>
                  ))
                : data.map(item => (
                    <tr
                        key={item.product_id}
                        onClick={() => router.push('/inventory')}
                        className={cn(
                          'border-b last:border-0 cursor-pointer',
                          item.stock_quantity === 0
                            ? 'bg-red-50/60 dark:bg-red-950/20 hover:bg-red-50 dark:hover:bg-red-950/30'
                            : 'bg-orange-50/40 dark:bg-orange-950/10 hover:bg-orange-50/60 dark:hover:bg-orange-950/20'
                        )}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className={cn(
                              'w-3.5 h-3.5 mt-0.5 shrink-0',
                              item.stock_quantity === 0 ? 'text-red-500' : 'text-orange-500'
                            )} />
                            <div>
                              <p className="font-medium text-sm leading-tight">{item.product_name}</p>
                              <p className="text-xs text-muted-foreground font-mono">{item.master_sku}</p>
                            </div>
                          </div>
                        </td>
                        <td className={cn(
                          'px-4 py-3 text-right font-bold',
                          item.stock_quantity === 0 ? 'text-red-600' : 'text-orange-600'
                        )}>
                          {formatNumber(item.stock_quantity)}
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{formatNumber(item.safety_stock)}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{formatNumber(item.reorder_point)}</td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
