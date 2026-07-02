/**
 * PRODUCT DEDUPLICATION SERVICE
 *
 * Prevents duplicate products when syncing from platforms (Shopee, Lazada, TikTok, etc.)
 * or importing via CSV/API alongside manually-entered ERP products.
 *
 * Match priority (highest confidence first):
 *   1. channel_sku_mapping  — channel_sku already mapped → guaranteed same product
 *   2. barcode              — physical barcode is unique per product
 *   3. normalized master_sku — strip whitespace + uppercase before comparing
 *   4. name + category      — soft match, returns candidates for human review only
 *
 * Callers receive a DedupResult that tells them exactly what to do:
 *   - MATCH_EXACT   → skip create, optionally update channel_sku_mapping
 *   - MATCH_FUZZY   → surface candidates to user before doing anything
 *   - NO_MATCH      → safe to create new product
 */

import { createServiceClient } from '@/lib/supabase/server'
import type { Product } from '@/types'

// ─── Types ───────────────────────────────────────────────────────────────────

export type DedupStrategy =
  | 'CHANNEL_SKU_MAPPING'
  | 'BARCODE'
  | 'NORMALIZED_SKU'
  | 'NAME_CATEGORY'

export type DedupOutcome = 'MATCH_EXACT' | 'MATCH_FUZZY' | 'NO_MATCH'

export interface IncomingProduct {
  /** The SKU used on the source channel (e.g. Shopee model_sku) */
  channel_sku: string
  channel_id: string
  /** Best-guess master SKU from the platform, may be dirty */
  platform_sku?: string
  name: string
  category?: string
  barcode?: string
}

export interface DedupCandidate {
  product: Pick<Product, 'id' | 'name' | 'master_sku' | 'category' | 'barcode'>
  strategy: DedupStrategy
  /** 0–1 score; exact matches are always 1.0 */
  confidence: number
}

export interface DedupResult {
  outcome: DedupOutcome
  /** Set when outcome is MATCH_EXACT — the authoritative product to use */
  matched?: DedupCandidate
  /** Set when outcome is MATCH_FUZZY — surfaced for human review */
  candidates?: DedupCandidate[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalizeSku(sku: string): string {
  return sku.trim().toUpperCase().replace(/[\s\-_.]/g, '')
}

/**
 * Simple trigram-based similarity — avoids pulling in a heavy library.
 * Returns a value in [0, 1].
 */
function similarityScore(a: string, b: string): number {
  const s1 = a.toLowerCase()
  const s2 = b.toLowerCase()
  if (s1 === s2) return 1

  const trigrams = (s: string): Set<string> => {
    const set = new Set<string>()
    for (let i = 0; i < s.length - 2; i++) set.add(s.slice(i, i + 3))
    return set
  }

  const t1 = trigrams(s1)
  const t2 = trigrams(s2)
  if (t1.size === 0 || t2.size === 0) return 0

  let intersection = 0
  for (const t of t1) if (t2.has(t)) intersection++

  return (2 * intersection) / (t1.size + t2.size)
}

// Threshold for surfacing a name-similarity candidate
const FUZZY_THRESHOLD = 0.55

// ─── Service ─────────────────────────────────────────────────────────────────

export class ProductDedupService {
  /**
   * Main entry point.
   *
   * Returns a DedupResult telling the caller whether to:
   *   - Reuse an existing product (MATCH_EXACT)
   *   - Ask a human before doing anything (MATCH_FUZZY)
   *   - Create a new product (NO_MATCH)
   */
  static async check(incoming: IncomingProduct): Promise<DedupResult> {
    const supabase = await createServiceClient()

    // ── 1. Channel SKU mapping (highest confidence) ──────────────────────────
    const { data: mapping } = await supabase
      .from('channel_sku_mapping')
      .select('product_id, products(id, name, master_sku, category, barcode)')
      .eq('channel_id', incoming.channel_id)
      .eq('channel_sku', incoming.channel_sku)
      .single()

    if (mapping?.products) {
      const p = mapping.products as unknown as Pick<Product, 'id' | 'name' | 'master_sku' | 'category' | 'barcode'>
      return {
        outcome: 'MATCH_EXACT',
        matched: { product: p, strategy: 'CHANNEL_SKU_MAPPING', confidence: 1 },
      }
    }

    // ── 2. Barcode ────────────────────────────────────────────────────────────
    if (incoming.barcode) {
      const { data: byBarcode } = await supabase
        .from('products')
        .select('id, name, master_sku, category, barcode')
        .eq('barcode', incoming.barcode)
        .single()

      if (byBarcode) {
        return {
          outcome: 'MATCH_EXACT',
          matched: { product: byBarcode, strategy: 'BARCODE', confidence: 1 },
        }
      }
    }

    // ── 3. Normalized SKU ─────────────────────────────────────────────────────
    if (incoming.platform_sku) {
      const normalizedIncoming = normalizeSku(incoming.platform_sku)

      const { data: allProducts } = await supabase
        .from('products')
        .select('id, name, master_sku, category, barcode')
        .eq('status', 'ACTIVE')

      const skuMatch = (allProducts ?? []).find(
        p => normalizeSku(p.master_sku) === normalizedIncoming
      )

      if (skuMatch) {
        return {
          outcome: 'MATCH_EXACT',
          matched: { product: skuMatch, strategy: 'NORMALIZED_SKU', confidence: 1 },
        }
      }

      // ── 4. Name + Category fuzzy ───────────────────────────────────────────
      const candidates: DedupCandidate[] = (allProducts ?? [])
        .map(p => {
          const nameScore = similarityScore(incoming.name, p.name)
          // Boost score if categories also match
          const catBoost =
            incoming.category && p.category
              ? similarityScore(incoming.category, p.category) * 0.2
              : 0
          return { product: p, score: Math.min(1, nameScore + catBoost) }
        })
        .filter(({ score }) => score >= FUZZY_THRESHOLD)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .map(({ product, score }) => ({
          product,
          strategy: 'NAME_CATEGORY' as DedupStrategy,
          confidence: score,
        }))

      if (candidates.length > 0) {
        return { outcome: 'MATCH_FUZZY', candidates }
      }
    }

    return { outcome: 'NO_MATCH' }
  }

  /**
   * Resolve an exact match: ensure channel_sku_mapping exists and log the sync event.
   * Call this after the caller confirms they want to use the matched product.
   */
  static async resolveExact(
    incoming: IncomingProduct,
    matchedProductId: string,
    strategy: DedupStrategy,
    userId?: string
  ): Promise<void> {
    const supabase = await createServiceClient()

    // Ensure channel_sku_mapping row exists
    await supabase
      .from('channel_sku_mapping')
      .upsert(
        {
          product_id: matchedProductId,
          channel_id: incoming.channel_id,
          channel_sku: incoming.channel_sku,
        },
        { onConflict: 'channel_id,channel_sku' }
      )

    // Append to sync log
    await supabase.from('product_sync_log').insert({
      channel_id: incoming.channel_id,
      channel_sku: incoming.channel_sku,
      incoming_name: incoming.name,
      incoming_category: incoming.category ?? null,
      matched_product_id: matchedProductId,
      outcome: 'MATCH_EXACT',
      strategy,
      resolved_by: userId ?? null,
      resolved_at: userId ? new Date().toISOString() : null,
    })
  }

  /**
   * Write a fuzzy-match to the sync log so it appears in the review queue.
   * Called by syncProducts() for every item that needs human review.
   */
  static async logFuzzyMatch(incoming: IncomingProduct): Promise<void> {
    const supabase = await createServiceClient()
    await supabase.from('product_sync_log').insert({
      channel_id: incoming.channel_id,
      channel_sku: incoming.channel_sku,
      incoming_name: incoming.name,
      incoming_category: incoming.category ?? null,
      outcome: 'MATCH_FUZZY',
      strategy: null,
      resolved_by: null,
      resolved_at: null,
    })
  }

  /**
   * Staff confirms a fuzzy candidate: links the channel SKU and marks the log row resolved.
   */
  static async resolveFuzzyChoice(
    logId: string,
    incoming: IncomingProduct,
    chosenProductId: string,
    userId: string
  ): Promise<void> {
    const supabase = await createServiceClient()

    await supabase
      .from('channel_sku_mapping')
      .upsert(
        {
          product_id: chosenProductId,
          channel_id: incoming.channel_id,
          channel_sku: incoming.channel_sku,
        },
        { onConflict: 'channel_id,channel_sku' }
      )

    await supabase
      .from('product_sync_log')
      .update({
        matched_product_id: chosenProductId,
        strategy: 'NAME_CATEGORY',
        resolved_by: userId,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', logId)
  }

  /**
   * Staff decides the fuzzy item is a brand-new product: dismiss the log row.
   */
  static async dismissFuzzyMatch(logId: string, userId: string): Promise<void> {
    const supabase = await createServiceClient()
    await supabase
      .from('product_sync_log')
      .update({ resolved_by: userId, resolved_at: new Date().toISOString() })
      .eq('id', logId)
  }

  /**
   * Record that a NO_MATCH product was created as brand-new.
   * Links the new product's ID in the sync log.
   */
  static async logNewProduct(
    incoming: IncomingProduct,
    newProductId: string
  ): Promise<void> {
    const supabase = await createServiceClient()

    await supabase.from('channel_sku_mapping').insert({
      product_id: newProductId,
      channel_id: incoming.channel_id,
      channel_sku: incoming.channel_sku,
    })

    await supabase.from('product_sync_log').insert({
      channel_id: incoming.channel_id,
      channel_sku: incoming.channel_sku,
      incoming_name: incoming.name,
      incoming_category: incoming.category ?? null,
      matched_product_id: newProductId,
      outcome: 'NO_MATCH',
      strategy: null,
      resolved_by: null,
    })
  }

  /**
   * Batch-check a list of incoming products in one call.
   * Useful for a full catalog sync where you want to pre-classify
   * all items before any writes.
   */
  static async checkBatch(
    items: IncomingProduct[]
  ): Promise<Array<{ incoming: IncomingProduct; result: DedupResult }>> {
    const results = await Promise.all(
      items.map(async incoming => ({
        incoming,
        result: await ProductDedupService.check(incoming),
      }))
    )
    return results
  }
}
