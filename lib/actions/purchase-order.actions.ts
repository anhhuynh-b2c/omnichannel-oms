'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/server'
import { PurchaseOrderService } from '@/lib/services/purchase-order.service'
import type { PurchaseOrderStatus } from '@/types'

export async function createPurchaseOrder(data: {
  supplier_id: string
  expected_date: string
  items: { product_id: string; quantity: number; cost: number }[]
}) {
  const supabase = await createServiceClient()
  const { items, ...poData } = data

  const { data: po, error } = await supabase
    .from('purchase_orders')
    .insert(poData)
    .select()
    .single()

  if (error) throw new Error(error.message)

  const { error: itemErr } = await supabase.from('purchase_order_items').insert(
    items.map(i => ({ ...i, purchase_order_id: po.id }))
  )
  if (itemErr) throw new Error(itemErr.message)

  revalidatePath('/purchase-orders')
  return po
}

export async function updatePOStatus(poId: string, status: PurchaseOrderStatus) {
  if (status === 'RECEIVED') {
    await PurchaseOrderService.receivePurchaseOrder(poId)
  } else {
    const supabase = await createServiceClient()
    const { error } = await supabase
      .from('purchase_orders')
      .update({ status })
      .eq('id', poId)
    if (error) throw new Error(error.message)
  }
  revalidatePath('/purchase-orders')
  revalidatePath('/inventory')
  revalidatePath('/')
}

export async function getPurchaseOrders(params?: {
  status?: string
  page?: number
  pageSize?: number
}) {
  const supabase = await createServiceClient()
  const page = params?.page ?? 1
  const pageSize = params?.pageSize ?? 10
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('purchase_orders')
    .select(`
      *,
      suppliers(id, supplier_name, phone, email),
      purchase_order_items(id, quantity, cost, products(id, name, master_sku))
    `, { count: 'exact' })
    .order('created_at', { ascending: false })

  if (params?.status && params.status !== 'ALL') {
    query = query.eq('status', params.status)
  }

  const { data, error, count } = await query.range(from, to)
  if (error) throw new Error(error.message)

  return { data: data ?? [], total: count ?? 0, page, pageSize, totalPages: Math.ceil((count ?? 0) / pageSize) }
}

export async function getSuppliers() {
  const supabase = await createServiceClient()
  const { data } = await supabase.from('suppliers').select('*').order('supplier_name')
  return data ?? []
}
