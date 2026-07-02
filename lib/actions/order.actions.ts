'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/server'
import { OrderService } from '@/lib/services/order.service'
import { createAuditLog } from '@/lib/audit'
import { assertRole } from '@/lib/auth/server'
import type { OrderStatus } from '@/types'

export async function getOrderById(orderId: string) {
  const supabase = await createServiceClient()
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      channels(id, name, icon),
      customers(id, name, phone, email, address),
      order_items(
        id, quantity, unit_price, subtotal,
        products(id, name, master_sku, image_url)
      )
    `)
    .eq('id', orderId)
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function updateTrackingNumber(orderId: string, trackingNumber: string) {
  await assertRole(['ADMIN', 'WAREHOUSE_STAFF', 'SALES_STAFF'])
  const supabase = await createServiceClient()
  const { error } = await supabase
    .from('orders')
    .update({ tracking_number: trackingNumber, shipped_at: new Date().toISOString() })
    .eq('id', orderId)
  if (error) throw new Error(error.message)
  revalidatePath('/orders')
}

export async function updateCustomer(
  customerId: string,
  fields: { name?: string; phone?: string; email?: string; address?: string }
) {
  const supabase = await createServiceClient()
  const { error } = await supabase.from('customers').update(fields).eq('id', customerId)
  if (error) throw new Error(error.message)
}

export async function updateOrder(
  orderId: string,
  fields: {
    notes?: string
    discount_amount?: number
    shipping_fee?: number
    payment_method?: string
    items?: { id: string; quantity: number; unit_price: number }[]
  }
) {
  await assertRole(['ADMIN', 'WAREHOUSE_STAFF', 'SALES_STAFF'])
  const supabase = await createServiceClient()

  // Recalculate total if items provided
  let total_amount: number | undefined
  if (fields.items) {
    const subtotal = fields.items.reduce((s, i) => s + i.quantity * i.unit_price, 0)
    const discount = fields.discount_amount ?? 0
    const shipping = fields.shipping_fee ?? 0
    total_amount = Math.max(0, subtotal - discount) + shipping

    // Update each item's quantity
    for (const item of fields.items) {
      const { error } = await supabase
        .from('order_items')
        .update({ quantity: item.quantity, subtotal: item.quantity * item.unit_price })
        .eq('id', item.id)
      if (error) throw new Error(error.message)
    }
  }

  const updatePayload: Record<string, unknown> = {}
  if (fields.notes !== undefined) updatePayload.notes = fields.notes
  if (fields.discount_amount !== undefined) updatePayload.discount_amount = fields.discount_amount
  if (fields.shipping_fee !== undefined) updatePayload.shipping_fee = fields.shipping_fee
  if (fields.payment_method !== undefined) updatePayload.payment_method = fields.payment_method
  if (total_amount !== undefined) updatePayload.total_amount = total_amount

  if (Object.keys(updatePayload).length > 0) {
    const { error } = await supabase.from('orders').update(updatePayload).eq('id', orderId)
    if (error) throw new Error(error.message)
  }

  await createAuditLog({
    action: 'UPDATE',
    resourceType: 'order',
    resourceId: orderId,
    newData: updatePayload,
  })

  revalidatePath('/orders')
}

export async function bulkUpdateOrderStatus(orderIds: string[], newStatus: OrderStatus) {
  await assertRole(['ADMIN', 'WAREHOUSE_STAFF', 'SALES_STAFF'])
  const supabase = await createServiceClient()
  const { error } = await supabase
    .from('orders')
    .update({ status: newStatus })
    .in('id', orderIds)
  if (error) throw new Error(error.message)

  for (const id of orderIds) {
    await createAuditLog({
      action: 'UPDATE',
      resourceType: 'order',
      resourceId: id,
      newData: { status: newStatus },
    })
  }
  revalidatePath('/orders')
  revalidatePath('/')
}

export async function updateOrderStatus(orderId: string, newStatus: OrderStatus) {
  await assertRole(['ADMIN', 'WAREHOUSE_STAFF', 'SALES_STAFF'])
  const supabase = await createServiceClient()
  const { data: old } = await supabase.from('orders').select('status, order_number').eq('id', orderId).single()

  await OrderService.updateStatus(orderId, newStatus)

  await createAuditLog({
    action: 'UPDATE',
    resourceType: 'order',
    resourceId: orderId,
    resourceLabel: old?.order_number,
    oldData: { status: old?.status },
    newData: { status: newStatus },
  })

  revalidatePath('/orders')
  revalidatePath('/inventory')
  revalidatePath('/')
}

export async function getOrders(params?: {
  search?: string
  status?: string
  channel?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  pageSize?: number
}) {
  const supabase = await createServiceClient()
  const page = params?.page ?? 1
  const pageSize = params?.pageSize ?? 10
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('orders')
    .select(`
      *,
      channels(id, name, icon),
      customers(id, name, phone, email)
    `, { count: 'exact' })
    .order('order_date', { ascending: false })

  if (params?.search) {
    query = query.or(`order_number.ilike.%${params.search}%`)
  }
  if (params?.status && params.status !== 'ALL') {
    query = query.eq('status', params.status)
  }
  if (params?.channel && params.channel !== 'ALL') {
    query = query.eq('channel_id', params.channel)
  }
  if (params?.dateFrom) query = query.gte('order_date', params.dateFrom)
  if (params?.dateTo) query = query.lte('order_date', params.dateTo)

  const { data, error, count } = await query.range(from, to)
  if (error) throw new Error(error.message)

  return { data: data ?? [], total: count ?? 0, page, pageSize, totalPages: Math.ceil((count ?? 0) / pageSize) }
}
