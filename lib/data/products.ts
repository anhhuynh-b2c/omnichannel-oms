import { createClient } from '@/lib/supabase/server'

export async function getProducts(params?: {
  search?: string
  category?: string
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
    .from('products')
    .select(`
      id, name, master_sku, category, description,
      price, cost, image_url, status, created_at,
      material, weight_g, length_cm, width_cm, height_cm, unit, barcode, default_safety_stock,
      inventory(stock_quantity, reorder_point, safety_stock, inventory_status)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (params?.search) {
    query = query.or(`name.ilike.%${params.search}%,master_sku.ilike.%${params.search}%`)
  }
  if (params?.category && params.category !== 'all') {
    query = query.eq('category', params.category)
  }
  if (params?.status && params.status !== 'all') {
    query = query.eq('status', params.status)
  }

  const { data, error, count } = await query
  if (error) throw error
  return { data: data ?? [], total: count ?? 0 }
}

export async function createProduct(values: {
  name: string
  master_sku: string
  category: string
  description?: string
  price: number
  cost_price: number
  image_url?: string
  status: string
  stock_quantity: number
  safety_stock: number
  reorder_point: number
}) {
  const supabase = await createClient()

  const { data: product, error } = await supabase
    .from('products')
    .insert({
      name: values.name,
      master_sku: values.master_sku,
      category: values.category,
      description: values.description,
      price: values.price,
      cost_price: values.cost_price,
      image_url: values.image_url,
      status: values.status,
    })
    .select('id')
    .single()

  if (error) throw error

  await supabase.from('inventory').insert({
    product_id: product.id,
    stock_quantity: values.stock_quantity,
    safety_stock: values.safety_stock,
    reorder_point: values.reorder_point,
    inventory_status: values.stock_quantity === 0
      ? 'OUT_OF_STOCK'
      : values.stock_quantity <= values.safety_stock
        ? 'LOW_STOCK'
        : 'IN_STOCK',
  })

  return product
}

export async function updateProduct(id: string, values: Partial<{
  name: string
  category: string
  description: string
  price: number
  cost_price: number
  image_url: string
  status: string
}>) {
  const supabase = await createClient()
  const { error } = await supabase.from('products').update(values).eq('id', id)
  if (error) throw error
}

export async function deleteProduct(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('products').delete().eq('id', id)
  if (error) throw error
}
