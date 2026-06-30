import { createClient } from '@/lib/supabase/server'

export async function getInventory(params?: {
  search?: string
  status?: string
  page?: number
  limit?: number
}) {
  const supabase = await createClient()
  const limit = params?.limit ?? 50
  const page = params?.page ?? 1
  const from = (page - 1) * limit
  const to = from + limit - 1

  let query = supabase
    .from('inventory')
    .select(`
      id, stock_quantity, reorder_point, safety_stock, inventory_status, updated_at,
      products(id, name, master_sku, category, price)
    `, { count: 'exact' })
    .order('updated_at', { ascending: false })
    .range(from, to)

  if (params?.status && params.status !== 'all') {
    query = query.eq('inventory_status', params.status)
  }

  const { data, error, count } = await query
  if (error) throw error

  if (params?.search) {
    const q = params.search.toLowerCase()
    const filtered = (data ?? []).filter((row: any) =>
      row.products?.name?.toLowerCase().includes(q) ||
      row.products?.master_sku?.toLowerCase().includes(q)
    )
    return { data: filtered, total: filtered.length }
  }

  return { data: data ?? [], total: count ?? 0 }
}

export async function adjustInventory(productId: string, delta: number) {
  const supabase = await createClient()

  const { data: inv, error: fetchErr } = await supabase
    .from('inventory')
    .select('stock_quantity, safety_stock')
    .eq('product_id', productId)
    .single()

  if (fetchErr || !inv) throw new Error('Inventory not found')

  const newQty = Math.max(0, inv.stock_quantity + delta)
  const newStatus = newQty === 0
    ? 'OUT_OF_STOCK'
    : newQty <= inv.safety_stock
      ? 'LOW_STOCK'
      : 'IN_STOCK'

  const { error } = await supabase
    .from('inventory')
    .update({ stock_quantity: newQty, inventory_status: newStatus })
    .eq('product_id', productId)

  if (error) throw error
  return { newStock: newQty }
}
