import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { SyncReviewList } from '@/components/products/sync-review-list'
import { createServiceClient } from '@/lib/supabase/server'
import { ProductDedupService } from '@/lib/services/product-dedup.service'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle } from 'lucide-react'

export default async function SyncReviewPage() {
  const supabase = await createServiceClient()

  // Get current user id for resolving actions
  const { data: { user } } = await supabase.auth.getUser()
  const userId = user?.id ?? ''

  // Fetch unresolved fuzzy matches
  const { data: pending } = await supabase
    .from('product_sync_log')
    .select('id, channel_sku, incoming_name, incoming_category, created_at, channels ( id, name, icon )')
    .eq('outcome', 'MATCH_FUZZY')
    .is('resolved_at', null)
    .order('created_at', { ascending: false })
    .limit(100)

  // Re-run dedup for each item to get fresh candidates
  const items = await Promise.all(
    (pending ?? []).map(async (row) => {
      const channel = row.channels as unknown as { id: string; name: string; icon: string }
      const dedup = await ProductDedupService.check({
        channel_sku: row.channel_sku,
        channel_id: channel.id,
        platform_sku: row.channel_sku,
        name: row.incoming_name,
        category: row.incoming_category ?? undefined,
      })
      return {
        log_id: row.id,
        channel_sku: row.channel_sku,
        incoming_name: row.incoming_name,
        incoming_category: row.incoming_category,
        channel,
        created_at: row.created_at,
        candidates: dedup.candidates ?? [],
      }
    })
  )

  return (
    <DashboardLayout title="Duyệt sản phẩm trùng lặp">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Duyệt sản phẩm nghi trùng</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Hệ thống tìm thấy các sản phẩm từ sàn có tên tương tự sản phẩm trong ERP.
              Chọn liên kết hoặc tạo mới.
            </p>
          </div>
          {items.length > 0 && (
            <Badge variant="secondary" className="gap-1.5 text-amber-700 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400">
              <AlertTriangle className="w-3.5 h-3.5" />
              {items.length} chờ duyệt
            </Badge>
          )}
        </div>

        {/* Legend */}
        {items.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800/50 dark:bg-amber-950/20 px-4 py-3 text-sm text-amber-800 dark:text-amber-300 space-y-1">
            <p className="font-medium">Cách duyệt:</p>
            <ul className="list-disc list-inside space-y-0.5 text-amber-700 dark:text-amber-400 text-xs">
              <li><strong>Dùng cái này</strong> — xác nhận đây cùng 1 sản phẩm, liên kết SKU sàn vào sản phẩm ERP đã có.</li>
              <li><strong>Tạo sản phẩm mới</strong> — xác nhận đây là sản phẩm khác, đánh dấu để tạo mới.</li>
            </ul>
          </div>
        )}

        <SyncReviewList initialItems={items} userId={userId} />
      </div>
    </DashboardLayout>
  )
}
