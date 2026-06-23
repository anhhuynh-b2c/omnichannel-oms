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
import type { OrderStatus } from '@/types'

interface ImportedOrder {
  channel_id: string
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

    for (const order of orders) {
      try {
        // Check for existing order
        const { data: existing } = await supabase
          .from('orders')
          .select('id')
          .eq('order_number', order.order_number)
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

        // Create order
        const { data: newOrder } = await supabase
          .from('orders')
          .insert({
            channel_id: order.channel_id,
            customer_id: customerId,
            order_number: order.order_number,
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
}
