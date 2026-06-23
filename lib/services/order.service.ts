import type { OrderStatus } from '@/types'
import { createServiceClient } from '@/lib/supabase/server'
import { InventoryService, InsufficientStockError } from './inventory.service'

const DEDUCT_ON_TRANSITION: Partial<Record<OrderStatus, OrderStatus>> = {
  CONFIRMED: 'PENDING',
}

const RESTORE_ON_TRANSITION: Partial<Record<OrderStatus, OrderStatus>> = {
  CANCELLED: 'CONFIRMED',
}

export class OrderService {
  static async updateStatus(orderId: string, newStatus: OrderStatus): Promise<void> {
    const supabase = await createServiceClient()

    const { data: order, error: fetchErr } = await supabase
      .from('orders')
      .select('id, status, order_items(product_id, quantity)')
      .eq('id', orderId)
      .single()

    if (fetchErr || !order) throw new Error('Order not found')

    const currentStatus = order.status as OrderStatus

    // Transition: PENDING → CONFIRMED  →  deduct inventory (atomic, no race condition)
    if (newStatus === 'CONFIRMED' && currentStatus === 'PENDING') {
      const items = order.order_items as { product_id: string; quantity: number }[]
      for (const item of items) {
        try {
          await InventoryService.deductStock(item.product_id, item.quantity, orderId, 'SALE')
        } catch (err) {
          if (err instanceof InsufficientStockError) {
            throw new Error(`Không đủ hàng để xác nhận đơn (sản phẩm ${item.product_id})`)
          }
          throw err
        }
      }
    }

    // Transition: CONFIRMED → CANCELLED  →  restore inventory
    if (newStatus === 'CANCELLED' && currentStatus === 'CONFIRMED') {
      for (const item of (order.order_items as { product_id: string; quantity: number }[])) {
        await InventoryService.restoreStock(item.product_id, item.quantity, orderId, 'CANCELLATION')
      }
    }

    const { error: updateErr } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId)

    if (updateErr) throw updateErr
  }
}
