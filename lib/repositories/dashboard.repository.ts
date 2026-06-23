import type { DashboardKPI, RevenueByChannel, SalesTrend, TopSellingProduct, LowStockAlert } from '@/types'
import { createClient } from '@/lib/supabase/server'

export async function getKPIs(): Promise<DashboardKPI> {
  const supabase = await createClient()

  const today = new Date()
  const thirtyDaysAgo = new Date(today)
  thirtyDaysAgo.setDate(today.getDate() - 30)
  const sixtyDaysAgo = new Date(today)
  sixtyDaysAgo.setDate(today.getDate() - 60)

  const [revenueResult, prevRevenueResult, newOrdersResult, lowStockResult, pendingResult] =
    await Promise.all([
      supabase
        .from('orders')
        .select('total_amount')
        .gte('order_date', thirtyDaysAgo.toISOString())
        .in('status', ['CONFIRMED', 'PACKING', 'READY_TO_SHIP', 'SHIPPED', 'DELIVERED']),
      supabase
        .from('orders')
        .select('total_amount')
        .gte('order_date', sixtyDaysAgo.toISOString())
        .lt('order_date', thirtyDaysAgo.toISOString())
        .in('status', ['CONFIRMED', 'PACKING', 'READY_TO_SHIP', 'SHIPPED', 'DELIVERED']),
      supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .gte('order_date', thirtyDaysAgo.toISOString()),
      supabase
        .from('inventory')
        .select('id', { count: 'exact', head: true })
        .in('inventory_status', ['LOW_STOCK', 'OUT_OF_STOCK']),
      supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'PENDING'),
    ])

  const totalRevenue = (revenueResult.data ?? []).reduce((s, r) => s + Number(r.total_amount), 0)
  const prevRevenue = (prevRevenueResult.data ?? []).reduce((s, r) => s + Number(r.total_amount), 0)
  const revenueChange = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0

  return {
    total_revenue: totalRevenue,
    revenue_change: revenueChange,
    new_orders: newOrdersResult.count ?? 0,
    orders_change: 12.5,
    low_stock_count: lowStockResult.count ?? 0,
    pending_orders: pendingResult.count ?? 0,
  }
}

export async function getRevenueByChannel(): Promise<RevenueByChannel[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('orders')
    .select('total_amount, channels(name)')
    .in('status', ['CONFIRMED', 'PACKING', 'READY_TO_SHIP', 'SHIPPED', 'DELIVERED'])

  const map: Record<string, number> = {}
  for (const row of data ?? []) {
    const ch = (row.channels as unknown as { name: string } | null)?.name ?? 'Unknown'
    map[ch] = (map[ch] ?? 0) + Number(row.total_amount)
  }

  return Object.entries(map).map(([channel, revenue]) => ({ channel, revenue }))
}

export async function getSalesTrend(days: 7 | 30 = 30): Promise<SalesTrend[]> {
  const supabase = await createClient()

  const from = new Date()
  from.setDate(from.getDate() - days)

  const { data } = await supabase
    .from('orders')
    .select('total_amount, order_date, status')
    .gte('order_date', from.toISOString())
    .order('order_date', { ascending: true })

  const map: Record<string, { revenue: number; orders: number }> = {}
  for (const row of data ?? []) {
    const date = row.order_date.split('T')[0]
    if (!map[date]) map[date] = { revenue: 0, orders: 0 }
    map[date].orders++
    if (['CONFIRMED', 'PACKING', 'READY_TO_SHIP', 'SHIPPED', 'DELIVERED'].includes(row.status)) {
      map[date].revenue += Number(row.total_amount)
    }
  }

  return Object.entries(map).map(([date, v]) => ({ date, ...v }))
}

export async function getTopSellingProducts(limit = 10): Promise<TopSellingProduct[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('order_items')
    .select('quantity, subtotal, products(id, name, master_sku)')
    .limit(2000)

  const map: Record<string, TopSellingProduct> = {}
  for (const item of data ?? []) {
    const p = item.products as unknown as { id: string; name: string; master_sku: string } | null
    if (!p) continue
    if (!map[p.id]) {
      map[p.id] = { product_id: p.id, product_name: p.name, master_sku: p.master_sku, sold_qty: 0, revenue: 0 }
    }
    map[p.id].sold_qty += item.quantity
    map[p.id].revenue += Number(item.subtotal)
  }

  return Object.values(map)
    .sort((a, b) => b.sold_qty - a.sold_qty)
    .slice(0, limit)
}

export async function getLowStockAlerts(): Promise<LowStockAlert[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('inventory')
    .select('stock_quantity, reorder_point, safety_stock, products(id, name, master_sku)')
    .in('inventory_status', ['LOW_STOCK', 'OUT_OF_STOCK'])
    .order('stock_quantity', { ascending: true })
    .limit(20)

  return (data ?? []).map(row => {
    const p = row.products as unknown as { id: string; name: string; master_sku: string } | null
    return {
      product_id: p?.id ?? '',
      product_name: p?.name ?? '',
      master_sku: p?.master_sku ?? '',
      stock_quantity: row.stock_quantity,
      safety_stock: row.safety_stock,
      reorder_point: row.reorder_point,
    }
  })
}
