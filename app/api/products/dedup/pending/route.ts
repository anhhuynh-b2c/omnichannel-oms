/**
 * GET /api/products/dedup/pending
 * Returns all unresolved fuzzy-match log rows with fresh candidate lists.
 */

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { ProductDedupService } from '@/lib/services/product-dedup.service'

export async function GET() {
  try {
    const supabase = await createServiceClient()

    const { data: pending, error } = await supabase
      .from('product_sync_log')
      .select('id, channel_sku, incoming_name, incoming_category, created_at, channels ( id, name, icon )')
      .eq('outcome', 'MATCH_FUZZY')
      .is('resolved_at', null)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) throw error

    const results = await Promise.all(
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

    return NextResponse.json(results)
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
