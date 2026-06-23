'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/server'
import type { ProductFormData } from '@/types'

export async function createProduct(data: ProductFormData) {
  const supabase = await createServiceClient()
  const { data: product, error } = await supabase
    .from('products')
    .insert(data)
    .select()
    .single()

  if (error) throw new Error(error.message)

  // Create inventory record
  await supabase.from('inventory').insert({
    product_id: product.id,
    stock_quantity: 0,
    reorder_point: 10,
    safety_stock: 20,
  })

  revalidatePath('/products')
  revalidatePath('/inventory')
  return product
}

export async function updateProduct(id: string, data: Partial<ProductFormData>) {
  const supabase = await createServiceClient()
  const { error } = await supabase
    .from('products')
    .update(data)
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/products')
}

export async function deleteProduct(id: string) {
  const supabase = await createServiceClient()
  const { error } = await supabase.from('products').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/products')
  revalidatePath('/inventory')
}

export async function getProducts(params?: {
  search?: string
  status?: string
  category?: string
  page?: number
  pageSize?: number
}) {
  const supabase = await createServiceClient()
  const page = params?.page ?? 1
  const pageSize = params?.pageSize ?? 10
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('products')
    .select(`
      *,
      inventory(stock_quantity, reorder_point, safety_stock, inventory_status)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })

  if (params?.search) {
    query = query.or(`name.ilike.%${params.search}%,master_sku.ilike.%${params.search}%`)
  }
  if (params?.status && params.status !== 'ALL') {
    query = query.eq('status', params.status)
  }
  if (params?.category && params.category !== 'ALL') {
    query = query.eq('category', params.category)
  }

  const { data, error, count } = await query.range(from, to)
  if (error) throw new Error(error.message)

  return { data: data ?? [], total: count ?? 0, page, pageSize, totalPages: Math.ceil((count ?? 0) / pageSize) }
}
