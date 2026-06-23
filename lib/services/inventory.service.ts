import type { MovementType } from '@/types'
import { createServiceClient } from '@/lib/supabase/server'

export class InsufficientStockError extends Error {
  constructor(public productId: string, public requested: number) {
    super(`Insufficient stock for product ${productId} (requested ${requested})`)
    this.name = 'InsufficientStockError'
  }
}

export class InventoryNotFoundError extends Error {
  constructor(public productId: string) {
    super(`Inventory not found for product ${productId}`)
    this.name = 'InventoryNotFoundError'
  }
}

export class InventoryService {
  /**
   * Atomic stock deduction via DB function — no race condition.
   * The UPDATE + INSERT happen in a single statement inside PostgreSQL.
   * If two webhooks arrive simultaneously for the same SKU, PostgreSQL
   * serialises them at row level; the second one fails cleanly if stock
   * would go negative.
   */
  static async deductStock(
    productId: string,
    quantity: number,
    referenceId: string,
    movementType: MovementType = 'SALE'
  ): Promise<{ newStock: number }> {
    const supabase = await createServiceClient()

    const { data, error } = await supabase.rpc('deduct_stock', {
      p_product_id: productId,
      p_quantity:   quantity,
      p_reference:  referenceId,
      p_movement:   movementType,
    })

    if (error) {
      if (error.message.includes('INSUFFICIENT_STOCK')) {
        throw new InsufficientStockError(productId, quantity)
      }
      if (error.message.includes('INVENTORY_NOT_FOUND')) {
        throw new InventoryNotFoundError(productId)
      }
      throw error
    }

    return { newStock: data as number }
  }

  static async restoreStock(
    productId: string,
    quantity: number,
    referenceId: string,
    movementType: MovementType = 'CANCELLATION'
  ): Promise<{ newStock: number }> {
    const supabase = await createServiceClient()

    const { data, error } = await supabase.rpc('restore_stock', {
      p_product_id: productId,
      p_quantity:   quantity,
      p_reference:  referenceId,
      p_movement:   movementType,
    })

    if (error) {
      if (error.message.includes('INVENTORY_NOT_FOUND')) {
        throw new InventoryNotFoundError(productId)
      }
      throw error
    }

    return { newStock: data as number }
  }

  static async receiveStock(
    productId: string,
    quantity: number,
    purchaseOrderId: string
  ): Promise<{ newStock: number }> {
    const supabase = await createServiceClient()

    const { data, error } = await supabase.rpc('receive_stock', {
      p_product_id: productId,
      p_quantity:   quantity,
      p_po_id:      purchaseOrderId,
    })

    if (error) {
      if (error.message.includes('INVENTORY_NOT_FOUND')) {
        throw new InventoryNotFoundError(productId)
      }
      throw error
    }

    return { newStock: data as number }
  }
}
