'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/server'
import { createAuditLog } from '@/lib/audit'
import { assertRole } from '@/lib/auth/server'

export async function getInventory(params?: {
  search?: string
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
    .from('inventory')
    .select(`
      *,
      products(id, name, master_sku, category, price, cost, status)
    `, { count: 'exact' })
    .order('inventory_status', { ascending: true })

  if (params?.search) {
    query = query.or(`products.name.ilike.%${params.search}%,products.master_sku.ilike.%${params.search}%`)
  }
  if (params?.status && params.status !== 'ALL') {
    query = query.eq('inventory_status', params.status)
  }

  const { data, error, count } = await query.range(from, to)
  if (error) throw new Error(error.message)

  return { data: data ?? [], total: count ?? 0, page, pageSize, totalPages: Math.ceil((count ?? 0) / pageSize) }
}

export async function adjustInventory(
  productId: string,
  qtyChange: number,
  note?: string
) {
  await assertRole(['ADMIN', 'WAREHOUSE_STAFF'])
  const supabase = await createServiceClient()

  const { data: inv, error: fetchErr } = await supabase
    .from('inventory')
    .select('id, stock_quantity')
    .eq('product_id', productId)
    .single()

  if (fetchErr || !inv) throw new Error('Inventory record not found')

  const newQty = inv.stock_quantity + qtyChange
  if (newQty < 0) throw new Error('Stock cannot go below zero')

  const { error: updateErr } = await supabase
    .from('inventory')
    .update({ stock_quantity: newQty })
    .eq('id', inv.id)

  if (updateErr) throw new Error(updateErr.message)

  await supabase.from('inventory_movements').insert({
    product_id: productId,
    qty_change: qtyChange,
    movement_type: 'ADJUSTMENT',
    reference_id: null,
  })

  await createAuditLog({
    action: 'UPDATE',
    resourceType: 'inventory',
    resourceId: productId,
    oldData: { stock_quantity: inv.stock_quantity },
    newData: { stock_quantity: newQty, qty_change: qtyChange },
    metadata: note ? { note } : undefined,
  })

  revalidatePath('/inventory')
  revalidatePath('/')
}

export async function getInventoryMovements(productId: string) {
  const supabase = await createServiceClient()
  const { data, error } = await supabase
    .from('inventory_movements')
    .select('*')
    .eq('product_id', productId)
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) throw new Error(error.message)
  return data ?? []
}
