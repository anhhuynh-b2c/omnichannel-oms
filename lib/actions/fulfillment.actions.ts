'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/server'
import { assertRole } from '@/lib/auth/server'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PackagingMaterial {
  id: string
  name: string
  sku: string
  unit: string
  stock_quantity: number
  reorder_point: number
  safety_stock: number
  stock_status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'
  notes: string | null
  created_at: string
  updated_at: string
}

export interface BomEntry {
  id: string
  product_id: string
  material_id: string
  qty_per_unit: number
  min_order_qty: number
  max_order_qty: number | null
  notes: string | null
  packaging_materials: Pick<PackagingMaterial, 'id' | 'name' | 'sku' | 'unit' | 'stock_quantity' | 'stock_status'>
}

// ── Materials CRUD ─────────────────────────────────────────────────────────────

export async function getMaterials(params?: { search?: string; status?: string; page?: number; pageSize?: number }) {
  const supabase = await createServiceClient()
  const page = params?.page ?? 1
  const pageSize = params?.pageSize ?? 50
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('packaging_materials')
    .select('*', { count: 'exact' })
    .order('name')

  if (params?.search) {
    query = query.or(`name.ilike.%${params.search}%,sku.ilike.%${params.search}%`)
  }
  if (params?.status && params.status !== 'ALL') {
    query = query.eq('stock_status', params.status)
  }

  const { data, error, count } = await query.range(from, to)
  if (error) throw new Error(error.message)
  return { data: data ?? [], total: count ?? 0 }
}

export async function createMaterial(input: {
  name: string
  sku: string
  unit: string
  stock_quantity: number
  reorder_point: number
  safety_stock: number
  notes?: string
}) {
  await assertRole(['ADMIN', 'WAREHOUSE_STAFF'])
  const supabase = await createServiceClient()
  const { error } = await supabase.from('packaging_materials').insert(input)
  if (error) throw new Error(error.message)
  revalidatePath('/fulfillment')
}

export async function updateMaterial(id: string, input: Partial<{
  name: string
  sku: string
  unit: string
  reorder_point: number
  safety_stock: number
  notes: string
}>) {
  await assertRole(['ADMIN', 'WAREHOUSE_STAFF'])
  const supabase = await createServiceClient()
  const { error } = await supabase.from('packaging_materials').update(input).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/fulfillment')
}

export async function adjustMaterialStock(id: string, qtyChange: number, reason: string, note?: string) {
  await assertRole(['ADMIN', 'WAREHOUSE_STAFF'])
  const supabase = await createServiceClient()

  const { data: mat, error: fetchErr } = await supabase
    .from('packaging_materials')
    .select('stock_quantity')
    .eq('id', id)
    .single()
  if (fetchErr) throw new Error(fetchErr.message)

  const newQty = mat.stock_quantity + qtyChange
  if (newQty < 0) throw new Error('Số lượng tồn kho không thể âm')

  const { error: updateErr } = await supabase
    .from('packaging_materials')
    .update({ stock_quantity: newQty })
    .eq('id', id)
  if (updateErr) throw new Error(updateErr.message)

  await supabase.from('packaging_material_movements').insert({
    material_id: id,
    qty_change: qtyChange,
    reason,
    note,
  })

  revalidatePath('/fulfillment')
}

// ── BOM CRUD ──────────────────────────────────────────────────────────────────

export async function getBomForProduct(productId: string): Promise<BomEntry[]> {
  const supabase = await createServiceClient()
  const { data, error } = await supabase
    .from('product_packaging_bom')
    .select(`*, packaging_materials(id, name, sku, unit, stock_quantity, stock_status)`)
    .eq('product_id', productId)
    .order('min_order_qty')
  if (error) throw new Error(error.message)
  return (data ?? []) as BomEntry[]
}

export async function getAllBom() {
  const supabase = await createServiceClient()
  const { data, error } = await supabase
    .from('product_packaging_bom')
    .select(`
      *,
      packaging_materials(id, name, sku, unit, stock_quantity, stock_status),
      products(id, name, master_sku)
    `)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function upsertBomEntry(input: {
  product_id: string
  material_id: string
  qty_per_unit: number
  min_order_qty: number
  max_order_qty?: number | null
  notes?: string
}) {
  await assertRole(['ADMIN', 'WAREHOUSE_STAFF'])
  const supabase = await createServiceClient()
  const { error } = await supabase
    .from('product_packaging_bom')
    .upsert(input, { onConflict: 'product_id,material_id,min_order_qty' })
  if (error) throw new Error(error.message)
  revalidatePath('/fulfillment')
}

export async function deleteBomEntry(id: string) {
  await assertRole(['ADMIN', 'WAREHOUSE_STAFF'])
  const supabase = await createServiceClient()
  const { error } = await supabase.from('product_packaging_bom').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/fulfillment')
}

// ── Deduct materials for an order ─────────────────────────────────────────────
// Called when an order moves to FULFILLING status
export async function deductMaterialsForOrder(orderId: string) {
  await assertRole(['ADMIN', 'WAREHOUSE_STAFF'])
  const supabase = await createServiceClient()

  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .select(`id, order_items(product_id, quantity)`)
    .eq('id', orderId)
    .single()
  if (orderErr) throw new Error(orderErr.message)

  const items: { product_id: string; quantity: number }[] = (order as any).order_items ?? []

  for (const item of items) {
    const bom = await getBomForProduct(item.product_id)
    const qty = item.quantity

    for (const rule of bom) {
      const minQty = rule.min_order_qty
      const maxQty = rule.max_order_qty

      const applies = qty >= minQty && (maxQty == null || qty <= maxQty)
      if (!applies) continue

      const deduct = rule.qty_per_unit * qty
      await adjustMaterialStock(
        rule.material_id,
        -deduct,
        'FULFILLMENT',
        `Đơn hàng #${orderId}`,
      )
    }
  }

  revalidatePath('/fulfillment')
  revalidatePath('/orders')
}
