'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/server'
import { OrderService } from '@/lib/services/order.service'
import type { OrderStatus } from '@/types'

export async function updateOrderStatus(orderId: string, newStatus: OrderStatus) {
  await OrderService.updateStatus(orderId, newStatus)
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
