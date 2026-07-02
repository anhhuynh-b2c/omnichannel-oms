'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { GitMerge, Plus, Package, CheckCircle2, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { DedupCandidate } from '@/lib/services/product-dedup.service'
import { ChannelIcon } from '@/components/shared/channel-icon'

interface PendingReviewItem {
  log_id: string
  channel_sku: string
  incoming_name: string
  incoming_category: string | null
  channel: { id: string; name: string; icon: string }
  created_at: string
  candidates: DedupCandidate[]
}

interface SyncReviewListProps {
  initialItems: PendingReviewItem[]
  userId: string
}

function ConfidenceBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100)
  const color =
    pct >= 80 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
    pct >= 65 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
  return (
    <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', color)}>
      {pct}% tương đồng
    </span>
  )
}

function ReviewCard({
  item,
  userId,
  onResolved,
}: {
  item: PendingReviewItem
  userId: string
  onResolved: (logId: string) => void
}) {
  const [isPending, startTransition] = useTransition()
  const [chosen, setChosen] = useState<string | null>(null)

  const resolve = (chosenProductId?: string) => {
    setChosen(chosenProductId ?? 'dismiss')
    startTransition(async () => {
      try {
        const body = chosenProductId
          ? {
              log_id: item.log_id,
              user_id: userId,
              chosen_product_id: chosenProductId,
              incoming: {
                channel_sku: item.channel_sku,
                channel_id: item.channel.id,
                name: item.incoming_name,
                category: item.incoming_category ?? undefined,
              },
            }
          : { log_id: item.log_id, user_id: userId }

        const res = await fetch('/api/products/dedup/resolve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)

        toast.success(
          chosenProductId
            ? 'Đã liên kết sản phẩm thành công'
            : 'Đã bỏ qua — sản phẩm sẽ được tạo mới'
        )
        onResolved(item.log_id)
      } catch (err) {
        toast.error((err as Error).message)
        setChosen(null)
      }
    })
  }

  const syncedAt = new Date(item.created_at).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  return (
    <Card className="border-amber-200 dark:border-amber-800/50">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <ChannelIcon icon={item.channel.icon} size={24} className="shrink-0" />
            <div className="min-w-0">
              <CardTitle className="text-sm font-semibold truncate">
                {item.incoming_name}
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                {item.channel.name} · SKU: <span className="font-mono">{item.channel_sku}</span>
                {item.incoming_category && ` · ${item.incoming_category}`}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            {syncedAt}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
          Sản phẩm có thể trùng trong ERP
        </p>

        <div className="space-y-2">
          {item.candidates.map((candidate) => (
            <div
              key={candidate.product.id}
              className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2.5"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Package className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{candidate.product.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {candidate.product.master_sku}
                    {candidate.product.category && ` · ${candidate.product.category}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <ConfidenceBadge score={candidate.confidence} />
                <Button
                  size="sm"
                  variant="default"
                  className="h-7 text-xs gap-1"
                  disabled={isPending}
                  onClick={() => resolve(candidate.product.id)}
                >
                  {isPending && chosen === candidate.product.id ? (
                    <span className="animate-pulse">Đang xử lý…</span>
                  ) : (
                    <>
                      <GitMerge className="w-3 h-3" />
                      Dùng cái này
                    </>
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="pt-1 flex justify-end">
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1 text-muted-foreground"
            disabled={isPending}
            onClick={() => resolve(undefined)}
          >
            {isPending && chosen === 'dismiss' ? (
              <span className="animate-pulse">Đang xử lý…</span>
            ) : (
              <>
                <Plus className="w-3 h-3" />
                Tạo sản phẩm mới
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export function SyncReviewList({ initialItems, userId }: SyncReviewListProps) {
  const [items, setItems] = useState(initialItems)

  const handleResolved = (logId: string) => {
    setItems(prev => prev.filter(i => i.log_id !== logId))
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
        <CheckCircle2 className="w-12 h-12 text-emerald-500" />
        <p className="text-lg font-medium">Không có gì cần duyệt</p>
        <p className="text-sm text-muted-foreground">
          Tất cả sản phẩm từ các sàn đã được xử lý tự động.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {items.map(item => (
        <ReviewCard
          key={item.log_id}
          item={item}
          userId={userId}
          onResolved={handleResolved}
        />
      ))}
    </div>
  )
}
