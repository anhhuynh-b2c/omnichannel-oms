import { createClient } from '@/lib/supabase/server'
import type { OrderStatus } from '@/types'

export async function getOrders(params?: {
  search?: string
  status?: string
  channel?: string
  page?: number
  limit?: number
}) {
  const supabase = await createClient()
  const limit = params?.limit ?? 50
  const page = params?.page ?? 1
  const from = (page - 1) * limit
  const to = from + limit - 1

  let query = supabase
    .from('orders')
    .select(`
      id, order_number, status, total_amount, created_at, notes,
      channels(name),
      customers(name, phone),
      order_items(quantity, unit_price, products(name, master_sku))
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (params?.status && params.status !== 'all') {
    query = query.eq('status', params.status)
  }
  if (params?.channel && params.channel !== 'all') {
    query = query.eq('channels.name', params.channel)
  }

  const { data, error, count } = await query
  if (error) throw error

  if (params?.search) {
    const q = params.search.toLowerCase()
    const filtered = (data ?? []).filter((o: any) =>
      o.order_number?.toLowerCase().includes(q) ||
      o.customers?.name?.toLowerCase().includes(q) ||
      o.customers?.phone?.includes(q)
    )
    return { data: filtered, total: filtered.length }
  }

  return { data: data ?? [], total: count ?? 0 }
}

export async function getChannels() {
  const supabase = await createClient()
  const { data, error } = await supabase.from('channels').select('id, name').order('name')
  if (error) throw error
  return data ?? []
}

export async function createManualOrder(params: {
  channelId: string
  customerId?: string
  customerName: string
  customerPhone: string
  customerAddress: string
  items: { productId: string; quantity: number; unitPrice: number }[]
  discount: number
  notes: string
}) {
  const supabase = await createClient()

  const subtotal = params.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0)
  const total = Math.max(0, subtotal - params.discount)

  const orderNumber = `MAN-${Date.now()}`

  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .insert({
      order_number: orderNumber,
      channel_id: params.channelId,
      customer_id: params.customerId ?? null,
      status: 'PENDING',
      total_amount: total,
      notes: params.notes,
    })
    .select('id')
    .single()

  if (orderErr) throw orderErr

  const orderItems = params.items.map(i => ({
    order_id: order.id,
    product_id: i.productId,
    quantity: i.quantity,
    unit_price: i.unitPrice,
  }))

  const { error: itemsErr } = await supabase.from('order_items').insert(orderItems)
  if (itemsErr) throw itemsErr

  return { id: order.id, orderNumber }
}
