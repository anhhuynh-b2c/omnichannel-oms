/**
 * POST /api/products/dedup/check
 *
 * Check one or more incoming products for duplicates before creating them.
 *
 * Body: { items: IncomingProduct[] }
 * Response: Array<{ incoming, result: DedupResult }>
 */

import { NextResponse } from 'next/server'
import { ProductDedupService, type IncomingProduct } from '@/lib/services/product-dedup.service'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const items: IncomingProduct[] = Array.isArray(body) ? body : body.items

    if (!items?.length) {
      return NextResponse.json({ error: 'items array required' }, { status: 400 })
    }

    const results = await ProductDedupService.checkBatch(items)
    return NextResponse.json(results)
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
