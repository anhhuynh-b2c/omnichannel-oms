/**
 * INTEGRATION MANAGER
 * Orchestrates all channel integrations:
 *   - SKU resolution (channel_sku → product_id)
 *   - Order import pipeline
 *   - Inventory push (OMS → marketplace)
 */

import { createServiceClient } from '@/lib/supabase/server'
import { OrderService } from '@/lib/services/order.service'
import { inventoryQueue } from '@/lib/queue/inventory-queue'
import { ProductDedupService, type IncomingProduct } from '@/lib/services/product-dedup.service'
import { generateOrderNumber } from '@/lib/utils/order-number'
import type { OrderStatus } from '@/types'

interface ImportedOrder {
  channel_id: string
  /** External marketplace order ID (e.g. Shopee order_sn) — stored for traceability */
  order_number: string
  total_amount: number
  status: string
  order_date: string
  customer_name: string
  customer_phone?: string
  customer_email?: string
  customer_address?: string
  items: Array<{
    channel_sku: string
    master_product_id?: string
    quantity: number
    price: number
    subtotal: number
  }>
}

export class IntegrationManager {
  /**
   * Build a Map<channel_sku, product_id> for a given channel.
   * Loaded once per sync cycle and passed to each order transformer.
   */
  static async buildSkuMap(channelId: string): Promise<Map<string, string>> {
    const supabase = await createServiceClient()
    const { data } = await supabase
      .from('channel_sku_mapping')
      .select('channel_sku, product_id')
      .eq('channel_id', channelId)

    const map = new Map<string, string>()
    for (const row of data ?? []) {
      map.set(row.channel_sku, row.product_id)
    }
    return map
  }

  /**
   * Upsert a batch of imported orders from any channel.
   * Skips orders that already exist (idempotent).
   */
  static async importOrders(orders: ImportedOrder[]): Promise<{
    imported: number
    skipped: number
    errors: string[]
  }> {
    const supabase = await createServiceClient()
    let imported = 0
    let skipped = 0
    const errors: string[] = []

    // Cache channel names to avoid repeated lookups
    const channelNameCache = new Map<string, string>()
    const getChannelName = async (channelId: string) => {
      if (!channelNameCache.has(channelId)) {
        const { data } = await supabase.from('channels').select('name').eq('id', channelId).single()
        channelNameCache.set(channelId, data?.name ?? 'ORD')
      }
      return channelNameCache.get(channelId)!
    }

    for (const order of orders) {
      try {
        // Check for existing order by external ID
        const { data: existing } = await supabase
          .from('orders')
          .select('id')
          .eq('external_order_id', order.order_number)
          .single()

        if (existing) { skipped++; continue }

        // Upsert customer
        let customerId: string
        const { data: existingCustomer } = await supabase
          .from('customers')
          .select('id')
          .eq('phone', order.customer_phone ?? '')
          .single()

        if (existingCustomer) {
          customerId = existingCustomer.id
        } else {
          const { data: newCustomer } = await supabase
            .from('customers')
            .insert({
              name: order.customer_name,
              phone: order.customer_phone,
              email: order.customer_email,
              address: order.customer_address,
            })
            .select('id')
            .single()
          customerId = newCustomer!.id
        }

        // Create order with internal number + external ID for traceability
        const channelName = await getChannelName(order.channel_id)
        const internalOrderNumber = await generateOrderNumber(supabase, channelName)

        const { data: newOrder } = await supabase
          .from('orders')
          .insert({
            channel_id: order.channel_id,
            customer_id: customerId,
            order_number: internalOrderNumber,
            external_order_id: order.order_number,
            total_amount: order.total_amount,
            status: 'PENDING',
            order_date: order.order_date,
          })
          .select('id')
          .single()

        if (!newOrder) { errors.push(`Failed to create order ${order.order_number}`); continue }

        // Create order items (only items with resolved SKUs)
        const validItems = order.items.filter(i => i.master_product_id)
        if (validItems.length > 0) {
          await supabase.from('order_items').insert(
            validItems.map(item => ({
              order_id: newOrder.id,
              product_id: item.master_product_id!,
              quantity: item.quantity,
              price: item.price,
              subtotal: item.subtotal,
            }))
          )
        }

        // Apply status transition if not PENDING
        if (order.status !== 'PENDING') {
          await OrderService.updateStatus(newOrder.id, order.status as OrderStatus)
        }

        imported++
      } catch (err) {
        errors.push(`Order ${order.order_number}: ${(err as Error).message}`)
      }
    }

    return { imported, skipped, errors }
  }

  /**
   * Push stock level from OMS to a channel via its service class.
   * Each channel implementation varies — this is the common interface.
   */
  static async pushInventoryUpdate(
    channelId: string,
    updates: Array<{ channel_sku: string; quantity: number }>
  ): Promise<void> {
    // Load integration credentials
    const supabase = await createServiceClient()
    const { data: integration } = await supabase
      .from('integrations')
      .select('api_key, secret_key, webhook_url, channels(name)')
      .eq('channel_id', channelId)
      .eq('status', 'CONNECTED')
      .single()

    if (!integration) throw new Error('Channel not connected')

    const channelName = (integration.channels as unknown as { name: string } | null)?.name
    if (!channelName) throw new Error('Channel name not found')

    // Đẩy vào queue thay vì gọi trực tiếp — tránh rate limit 429
    await inventoryQueue.add({
      channelId,
      channelName: channelName as 'Shopee' | 'TikTok Shop' | 'Lazada' | 'Facebook' | 'Instagram',
      batchId: `${channelId}-${Date.now()}`,
      updates: updates.map(u => ({
        channelSku: u.channel_sku,
        quantity: u.quantity,
        productId: u.channel_sku, // sẽ được resolve trong worker
      })),
    })

    console.log(`[IntegrationManager] Queued ${updates.length} stock updates for ${channelName}`)
  }

  /**
   * Sync a product catalog from a channel with full dedup logic.
   *
   * For each incoming product:
   *   - MATCH_EXACT  → link channel_sku to existing product (no duplicate created)
   *   - MATCH_FUZZY  → added to `pendingReview` list, returned to caller for human decision
   *   - NO_MATCH     → create brand-new product + inventory row
   *
   * Returns a summary the caller can log or surface in the UI.
   */
  static async syncProducts(
    channelId: string,
    incomingProducts: Array<
      IncomingProduct & {
        price: number
        cost: number
        category: string
        initial_stock?: number
      }
    >
  ): Promise<{
    linked: number
    created: number
    pendingReview: Array<{
      incoming: IncomingProduct
      candidates: import('@/lib/services/product-dedup.service').DedupCandidate[]
    }>
    errors: string[]
  }> {
    const supabase = await createServiceClient()
    let linked = 0
    let created = 0
    const pendingReview: Array<{
      incoming: IncomingProduct
      candidates: import('@/lib/services/product-dedup.service').DedupCandidate[]
    }> = []
    const errors: string[] = []

    for (const item of incomingProducts) {
      try {
        const dedupResult = await ProductDedupService.check(item)

        if (dedupResult.outcome === 'MATCH_EXACT' && dedupResult.matched) {
          // Already exists — just ensure the SKU mapping is recorded
          await ProductDedupService.resolveExact(
            item,
            dedupResult.matched.product.id,
            dedupResult.matched.strategy
          )
          linked++
          continue
        }

        if (dedupResult.outcome === 'MATCH_FUZZY') {
          // Persist to DB so the review page can surface it
          await ProductDedupService.logFuzzyMatch(item)
          pendingReview.push({ incoming: item, candidates: dedupResult.candidates ?? [] })
          continue
        }

        // NO_MATCH — safe to create a new product
        const masterSku = item.platform_sku ?? item.channel_sku
        const { data: newProduct, error } = await supabase
          .from('products')
          .insert({
            name: item.name,
            master_sku: masterSku,
            category: item.category,
            price: item.price,
            cost: item.cost,
            status: 'ACTIVE',
          })
          .select('id')
          .single()

        if (error || !newProduct) {
          errors.push(`Failed to create product ${item.channel_sku}: ${error?.message}`)
          continue
        }

        // Create inventory row
        await supabase.from('inventory').insert({
          product_id: newProduct.id,
          stock_quantity: item.initial_stock ?? 0,
          reorder_point: 10,
          safety_stock: 20,
        })

        await ProductDedupService.logNewProduct(item, newProduct.id)
        created++
      } catch (err) {
        errors.push(`${item.channel_sku}: ${(err as Error).message}`)
      }
    }

    return { linked, created, pendingReview, errors }
  }
}
