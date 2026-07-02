import Link from 'next/link'
import { AlertTriangle, GitMerge } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { ProductsTable } from '@/components/products/products-table'
import { getProducts } from '@/lib/data/products'
import { getMaterials } from '@/lib/actions/fulfillment.actions'
import { createServiceClient } from '@/lib/supabase/server'

export default async function ProductsPage() {
  let data: any[] = []
  let total = 0
  let pendingCount = 0
  let materials: any[] = []

  try {
    const [prodResult, matResult] = await Promise.all([
      getProducts({ limit: 50 }),
      getMaterials({ pageSize: 200 }),
    ])
    data = prodResult.data
    total = prodResult.total
    materials = matResult.data
  } catch (e) {
    console.error('[ProductsPage] fetch failed:', e)
  }

  try {
    const supabase = await createServiceClient()
    const { count } = await supabase
      .from('product_sync_log')
      .select('id', { count: 'exact', head: true })
      .eq('outcome', 'MATCH_FUZZY')
      .is('resolved_at', null)
    pendingCount = count ?? 0
  } catch {
    // non-critical — ignore if table doesn't exist yet
  }

  return (
    <DashboardLayout titleKey="nav.products">
      {pendingCount > 0 && (
        <Link
          href="/products/sync-review"
          className="flex items-center justify-between gap-3 mb-4 rounded-lg border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30 px-4 py-3 text-sm hover:bg-amber-100 dark:hover:bg-amber-950/50 transition-colors"
        >
          <div className="flex items-center gap-2.5 text-amber-800 dark:text-amber-300">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              <strong>{pendingCount} sản phẩm</strong> từ sàn có thể trùng với sản phẩm trong ERP — cần duyệt thủ công.
            </span>
          </div>
          <span className="flex items-center gap-1 text-amber-700 dark:text-amber-400 font-medium shrink-0">
            <GitMerge className="w-3.5 h-3.5" />
            Duyệt ngay
          </span>
        </Link>
      )}
      <ProductsTable initialData={data} total={total} materials={materials} />
    </DashboardLayout>
  )
}
