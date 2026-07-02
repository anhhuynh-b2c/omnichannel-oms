/**
 * POST /api/products/dedup/resolve
 *
 * Body (link to existing): { log_id, incoming, chosen_product_id, user_id }
 * Body (dismiss as new):   { log_id, user_id }
 */

import { NextResponse } from 'next/server'
import { ProductDedupService, type IncomingProduct } from '@/lib/services/product-dedup.service'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { log_id, user_id } = body

    if (!log_id || !user_id) {
      return NextResponse.json({ error: 'log_id and user_id required' }, { status: 400 })
    }

    if (body.chosen_product_id) {
      const incoming: IncomingProduct = body.incoming
      await ProductDedupService.resolveFuzzyChoice(log_id, incoming, body.chosen_product_id, user_id)
      return NextResponse.json({ ok: true, action: 'linked_existing' })
    }

    // Dismiss — staff confirmed it's a new product (they'll create it via normal flow)
    await ProductDedupService.dismissFuzzyMatch(log_id, user_id)
    return NextResponse.json({ ok: true, action: 'dismissed' })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
