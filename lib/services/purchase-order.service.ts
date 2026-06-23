import { createServiceClient } from '@/lib/supabase/server'
import { InventoryService } from './inventory.service'

export class PurchaseOrderService {
  static async receivePurchaseOrder(purchaseOrderId: string): Promise<void> {
    const supabase = await createServiceClient()

    const { data: po, error: fetchErr } = await supabase
      .from('purchase_orders')
      .select('id, status, purchase_order_items(product_id, quantity)')
      .eq('id', purchaseOrderId)
      .single()

    if (fetchErr || !po) throw new Error('Purchase order not found')
    if (po.status !== 'APPROVED') throw new Error('Purchase order must be APPROVED before receiving')

    for (const item of (po.purchase_order_items as { product_id: string; quantity: number }[])) {
      await InventoryService.receiveStock(item.product_id, item.quantity, purchaseOrderId)
    }

    const { error: updateErr } = await supabase
      .from('purchase_orders')
      .update({ status: 'RECEIVED' })
      .eq('id', purchaseOrderId)

    if (updateErr) throw updateErr
  }
}
