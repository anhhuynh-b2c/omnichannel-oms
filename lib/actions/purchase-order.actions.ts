'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient, createClient } from '@/lib/supabase/server'
import { PurchaseOrderService } from '@/lib/services/purchase-order.service'
import { createAuditLog } from '@/lib/audit'
import { assertRole } from '@/lib/auth/server'
import type { PurchaseOrderStatus } from '@/types'

async function generatePONumber(supabase: Awaited<ReturnType<typeof createServiceClient>>) {
  const now = new Date()
  const dd = String(now.getDate()).padStart(2, '0')
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const yyyy = now.getFullYear()
  const prefix = `PO-${dd}${mm}${yyyy}-`

  const { count } = await supabase
    .from('purchase_orders')
    .select('id', { count: 'exact', head: true })
    .like('po_number', `${prefix}%`)

  const seq = String((count ?? 0) + 1).padStart(3, '0')
  return `${prefix}${seq}`
}

export async function createPurchaseOrder(data: {
  supplier_id: string
  expected_date: string
  notes?: string
  requisitioner?: string
  shipped_via?: string
  fob_point?: string
  payment_terms?: string
  ship_to_name?: string
  ship_to_address?: string
  vat_rate?: number
  shipping_fee?: number
  items: { product_id: string; quantity: number; cost: number }[]
}) {
  await assertRole(['ADMIN', 'WAREHOUSE_STAFF'])
  const supabase = await createServiceClient()
  const { items, ...poData } = data

  // Resolve creator name
  let created_by_name: string | null = null
  try {
    const userClient = await createClient()
    const { data: { user } } = await userClient.auth.getUser()
    if (user) {
      const { data: u } = await supabase.from('users').select('name').eq('email', user.email!).maybeSingle()
      created_by_name = u?.name ?? user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email?.split('@')[0] ?? null
    }
  } catch { /* ignore */ }

  const po_number = await generatePONumber(supabase)

  const { data: po, error } = await supabase
    .from('purchase_orders')
    .insert({ ...poData, po_number, created_by_name })
    .select()
    .single()

  if (error) throw new Error(error.message)

  const { error: itemErr } = await supabase.from('purchase_order_items').insert(
    items.map(i => ({ ...i, purchase_order_id: po.id }))
  )
  if (itemErr) throw new Error(itemErr.message)

  await createAuditLog({
    action: 'CREATE',
    resourceType: 'purchase_order',
    resourceId: po.id,
    resourceLabel: po.po_number,
    newData: { ...poData, po_number, item_count: items.length },
  })

  revalidatePath('/purchase-orders')
  return po
}

export async function updatePOStatus(poId: string, status: PurchaseOrderStatus, approvedBy?: string) {
  await assertRole(['ADMIN', 'WAREHOUSE_STAFF'])
  const supabase = await createServiceClient()
  const { data: old } = await supabase.from('purchase_orders').select('status, po_number').eq('id', poId).single()

  if (status === 'RECEIVED') {
    await PurchaseOrderService.receivePurchaseOrder(poId)
  } else {
    const updateData: Record<string, unknown> = { status }
    if (status === 'APPROVED' && approvedBy) updateData.approved_by = approvedBy
    const { error } = await supabase
      .from('purchase_orders')
      .update(updateData)
      .eq('id', poId)
    if (error) throw new Error(error.message)
  }

  await createAuditLog({
    action: 'UPDATE',
    resourceType: 'purchase_order',
    resourceId: poId,
    resourceLabel: old?.po_number,
    oldData: { status: old?.status },
    newData: { status, ...(approvedBy ? { approved_by: approvedBy } : {}) },
  })

  revalidatePath('/purchase-orders')
  revalidatePath('/inventory')
  revalidatePath('/')
}

export async function updatePurchaseOrder(id: string, data: {
  supplier_id: string
  expected_date: string
  notes?: string
  requisitioner?: string
  shipped_via?: string
  fob_point?: string
  payment_terms?: string
  ship_to_name?: string
  ship_to_address?: string
  vat_rate?: number
  shipping_fee?: number
  items: { product_id: string; quantity: number; cost: number }[]
}) {
  await assertRole(['ADMIN', 'WAREHOUSE_STAFF'])
  const supabase = await createServiceClient()
  const { items, ...poData } = data

  const { error } = await supabase
    .from('purchase_orders')
    .update(poData)
    .eq('id', id)
    .eq('status', 'DRAFT')
  if (error) throw new Error(error.message)

  await supabase.from('purchase_order_items').delete().eq('purchase_order_id', id)
  const { error: itemErr } = await supabase.from('purchase_order_items').insert(
    items.map(i => ({ ...i, purchase_order_id: id }))
  )
  if (itemErr) throw new Error(itemErr.message)

  await createAuditLog({
    action: 'UPDATE',
    resourceType: 'purchase_order',
    resourceId: id,
    resourceLabel: data.supplier_id,
    newData: { ...poData, item_count: items.length },
  })

  revalidatePath('/purchase-orders')
}

export async function bulkUpdatePOStatus(ids: string[], status: PurchaseOrderStatus) {
  await assertRole(['ADMIN', 'WAREHOUSE_STAFF'])
  const supabase = await createServiceClient()
  const { error } = await supabase
    .from('purchase_orders')
    .update({ status })
    .in('id', ids)
  if (error) throw new Error(error.message)
  revalidatePath('/purchase-orders')
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

export async function getPurchaseOrderById(id: string) {
  const supabase = await createServiceClient()
  const { data, error } = await supabase
    .from('purchase_orders')
    .select(`
      *,
      suppliers(id, supplier_name, phone, email, address),
      purchase_order_items(id, quantity, cost, products(id, name, master_sku, unit))
    `)
    .eq('id', id)
    .single()
  if (error) throw new Error(error.message)
  return data
}
