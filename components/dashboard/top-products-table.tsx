'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { TopSellingProduct } from '@/types'
import { formatCurrency, formatNumber } from '@/lib/utils/format'
import { ArrowRight } from 'lucide-react'

interface TopProductsTableProps {
  data: TopSellingProduct[]
  loading?: boolean
}

export function TopProductsTable({ data, loading }: TopProductsTableProps) {
  const router = useRouter()
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Top Selling Products</CardTitle>
          <Link href="/products" className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors">
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left font-medium text-muted-foreground text-xs uppercase tracking-wide px-4 py-2.5">#</th>
                <th className="text-left font-medium text-muted-foreground text-xs uppercase tracking-wide px-4 py-2.5">Product</th>
                <th className="text-left font-medium text-muted-foreground text-xs uppercase tracking-wide px-4 py-2.5">SKU</th>
                <th className="text-right font-medium text-muted-foreground text-xs uppercase tracking-wide px-4 py-2.5">Sold</th>
                <th className="text-right font-medium text-muted-foreground text-xs uppercase tracking-wide px-4 py-2.5">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b last:border-0">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <Skeleton className="h-4 w-full" />
                        </td>
                      ))}
                    </tr>
                  ))
                : data.map((p, i) => (
                    <tr key={p.product_id} className="border-b last:border-0 hover:bg-muted/20 cursor-pointer" onClick={() => router.push('/products')}>
                        <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{i + 1}</td>
                        <td className="px-4 py-3 font-medium max-w-[200px] truncate">{p.product_name}</td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{p.master_sku}</td>
                        <td className="px-4 py-3 text-right font-medium">{formatNumber(p.sold_qty)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-blue-600 dark:text-blue-400">
                          {formatCurrency(p.revenue)}
                        </td>
                      </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
