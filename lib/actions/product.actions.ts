'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/server'
import { createAuditLog } from '@/lib/audit'
import { assertRole } from '@/lib/auth/server'
import type { ProductFormData } from '@/types'

export async function createProduct(data: ProductFormData) {
  await assertRole(['ADMIN'])
  const supabase = await createServiceClient()
  const { initial_stock, default_safety_stock, ...productRow } = data
  const { data: product, error } = await supabase
    .from('products')
    .insert(productRow)
    .select()
    .single()

  if (error) {
    if (error.code === '23505') throw new Error(`SKU "${data.master_sku}" already exists. Please use a different SKU.`)
    throw new Error(error.message)
  }

  const safetyStock = data.default_safety_stock ?? 5
  const stockQty = data.initial_stock ?? 0
  await supabase.from('inventory').insert({
    product_id: product.id,
    stock_quantity: stockQty,
    reorder_point: Math.max(1, safetyStock * 2),
    safety_stock: safetyStock,
    inventory_status: stockQty === 0 ? 'OUT_OF_STOCK' : stockQty <= safetyStock ? 'LOW_STOCK' : 'IN_STOCK',
  })

  await createAuditLog({
    action: 'CREATE',
    resourceType: 'product',
    resourceId: product.id,
    resourceLabel: `${product.name} (${product.master_sku})`,
    newData: { ...productRow, initial_stock: stockQty },
  })

  revalidatePath('/products')
  revalidatePath('/inventory')
  return product
}

export async function updateProduct(id: string, data: Partial<ProductFormData>) {
  await assertRole(['ADMIN'])
  const supabase = await createServiceClient()
  const { stock_quantity, initial_stock, default_safety_stock, ...productRow } = data

  const { data: old } = await supabase.from('products').select('name, master_sku').eq('id', id).single()

  const { error } = await supabase.from('products').update(productRow).eq('id', id)
  if (error) throw new Error(error.message)

  if (stock_quantity !== undefined) {
    const safetyStock = default_safety_stock ?? 5
    const status = stock_quantity === 0 ? 'OUT_OF_STOCK' : stock_quantity <= safetyStock ? 'LOW_STOCK' : 'IN_STOCK'
    await supabase.from('inventory')
      .update({ stock_quantity, inventory_status: status })
      .eq('product_id', id)
  }

  await createAuditLog({
    action: 'UPDATE',
    resourceType: 'product',
    resourceId: id,
    resourceLabel: old ? `${old.name} (${old.master_sku})` : id,
    newData: { ...productRow, ...(stock_quantity !== undefined ? { stock_quantity } : {}) },
  })

  revalidatePath('/products')
  revalidatePath('/inventory')
}

export async function deleteProduct(id: string) {
  await assertRole(['ADMIN'])
  const supabase = await createServiceClient()
  const { data: old } = await supabase.from('products').select('name, master_sku').eq('id', id).single()

  const { error } = await supabase.from('products').delete().eq('id', id)
  if (error) throw new Error(error.message)

  await createAuditLog({
    action: 'DELETE',
    resourceType: 'product',
    resourceId: id,
    resourceLabel: old ? `${old.name} (${old.master_sku})` : id,
    oldData: old ?? undefined,
  })

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
