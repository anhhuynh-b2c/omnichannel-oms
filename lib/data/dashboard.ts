import { createClient } from '@/lib/supabase/server'

export async function getDashboardKPI(days = 30) {
  const supabase = await createClient()

  const thirtyDaysAgo = new Date(Date.now() - days * 86400000).toISOString()
  const sixtyDaysAgo = new Date(Date.now() - days * 2 * 86400000).toISOString()

  const [current30, previous30, lowStockResult, pendingResult] = await Promise.all([
    supabase.from('orders').select('total_amount').gte('created_at', thirtyDaysAgo).neq('status', 'CANCELLED'),
    supabase.from('orders').select('total_amount').gte('created_at', sixtyDaysAgo).lt('created_at', thirtyDaysAgo).neq('status', 'CANCELLED'),
    supabase.from('inventory').select('id', { count: 'exact', head: true }).in('inventory_status', ['LOW_STOCK', 'OUT_OF_STOCK']),
    supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'PENDING'),
  ])

  const currentRevenue = (current30.data ?? []).reduce((s, o) => s + (o.total_amount ?? 0), 0)
  const prevRevenue = (previous30.data ?? []).reduce((s, o) => s + (o.total_amount ?? 0), 0)
  const revenueChange = prevRevenue > 0 ? ((currentRevenue - prevRevenue) / prevRevenue) * 100 : 0
  const newOrders = current30.data?.length ?? 0
  const prevOrders = previous30.data?.length ?? 0
  const ordersChange = prevOrders > 0 ? ((newOrders - prevOrders) / prevOrders) * 100 : 0

  return {
    total_revenue: currentRevenue,
    revenue_change: Math.round(revenueChange * 10) / 10,
    new_orders: newOrders,
    orders_change: Math.round(ordersChange * 10) / 10,
    low_stock_count: lowStockResult.count ?? 0,
    pending_orders: pendingResult.count ?? 0,
  }
}

export async function getRevenueByChannel(days = 30) {
  const supabase = await createClient()
  const thirtyDaysAgo = new Date(Date.now() - days * 86400000).toISOString()

  const { data } = await supabase
    .from('orders')
    .select('total_amount, channels(name)')
    .gte('created_at', thirtyDaysAgo)
    .neq('status', 'CANCELLED')

  const map: Record<string, number> = {}
  for (const o of data ?? []) {
    const name = (o.channels as any)?.name ?? 'Unknown'
    map[name] = (map[name] ?? 0) + (o.total_amount ?? 0)
  }

  return Object.entries(map)
    .map(([channel, revenue]) => ({ channel, revenue }))
    .sort((a, b) => b.revenue - a.revenue)
}

export async function getSalesTrend(days: number) {
  const supabase = await createClient()
  const since = new Date(Date.now() - days * 86400000).toISOString()

  const { data } = await supabase
    .from('orders')
    .select('total_amount, order_date, created_at')
    .gte('created_at', since)
    .neq('status', 'CANCELLED')

  const map: Record<string, { revenue: number; orders: number }> = {}
  for (const o of data ?? []) {
    const date = ((o.order_date ?? o.created_at ?? '') as string).split('T')[0]
    if (!map[date]) map[date] = { revenue: 0, orders: 0 }
    map[date].revenue += o.total_amount ?? 0
    map[date].orders += 1
  }

  const result = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000)
    const date = d.toISOString().split('T')[0]
    result.push({ date, revenue: map[date]?.revenue ?? 0, orders: map[date]?.orders ?? 0 })
  }
  return result
}

export async function getTopProducts(limit = 10, days = 30) {
  const supabase = await createClient()
  const thirtyDaysAgo = new Date(Date.now() - days * 86400000).toISOString()

  const { data } = await supabase
    .from('order_items')
    .select('quantity, unit_price, products(id, name, master_sku), orders!inner(created_at, status)')
    .gte('orders.created_at', thirtyDaysAgo)
    .neq('orders.status', 'CANCELLED')

  const map: Record<string, { product_id: string; product_name: string; master_sku: string; sold_qty: number; revenue: number }> = {}
  for (const item of data ?? []) {
    const p = (item as any).products
    if (!p) continue
    if (!map[p.id]) map[p.id] = { product_id: p.id, product_name: p.name, master_sku: p.master_sku, sold_qty: 0, revenue: 0 }
    map[p.id].sold_qty += item.quantity ?? 0
    map[p.id].revenue += (item.quantity ?? 0) * (item.unit_price ?? 0)
  }

  return Object.values(map)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit)
}

export async function getLowStockAlerts(limit = 10) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('inventory')
    .select('stock_quantity, safety_stock, reorder_point, products(id, name, master_sku)')
    .in('inventory_status', ['LOW_STOCK', 'OUT_OF_STOCK'])
    .order('stock_quantity', { ascending: true })
    .limit(limit)

  return (data ?? []).map(inv => {
    const p = (inv as any).products
    return {
      product_id: p?.id ?? '',
      product_name: p?.name ?? '',
      master_sku: p?.master_sku ?? '',
      stock_quantity: inv.stock_quantity,
      safety_stock: inv.safety_stock,
      reorder_point: inv.reorder_point,
    }
  })
}

export async function getChannelsWithStatus() {
  const supabase = await createClient()
  const { data } = await supabase.from('channels').select('id, name, icon, status').order('name')
  return data ?? []
}
