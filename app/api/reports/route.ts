import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  if (!from || !to) {
    return NextResponse.json({ error: 'from and to are required' }, { status: 400 })
  }

  const supabase = await createClient()

  const [
    revenueByChannel,
    revenueTrend,
    orderQuality,
    inventoryHealth,
    financials,
  ] = await Promise.all([
    getRevenueByChannel(supabase, from, to),
    getRevenueTrend(supabase, from, to),
    getOrderQuality(supabase, from, to),
    getInventoryHealth(supabase),
    getFinancials(supabase, from, to),
  ])

  return NextResponse.json({ revenueByChannel, revenueTrend, orderQuality, inventoryHealth, financials })
}

async function getRevenueByChannel(supabase: any, from: string, to: string) {
  // Current period
  const { data: current } = await supabase
    .from('orders')
    .select('total_amount, channels(name)')
    .gte('order_date', from)
    .lte('order_date', to)
    .not('status', 'in', '(CANCELLED,RETURNED,REFUNDED)')

  // Previous period (same duration)
  const duration = new Date(to).getTime() - new Date(from).getTime()
  const prevFrom = new Date(new Date(from).getTime() - duration).toISOString()
  const prevTo = new Date(new Date(from).getTime() - 1).toISOString()

  const { data: prev } = await supabase
    .from('orders')
    .select('total_amount, channels(name)')
    .gte('order_date', prevFrom)
    .lte('order_date', prevTo)
    .not('status', 'in', '(CANCELLED,RETURNED,REFUNDED)')

  const aggregate = (rows: any[]) => {
    const map: Record<string, { revenue: number; orders: number }> = {}
    for (const r of rows ?? []) {
      const ch = r.channels?.name ?? 'Unknown'
      if (!map[ch]) map[ch] = { revenue: 0, orders: 0 }
      map[ch].revenue += r.total_amount ?? 0
      map[ch].orders += 1
    }
    return map
  }

  const curMap = aggregate(current ?? [])
  const prevMap = aggregate(prev ?? [])

  const channels = new Set([...Object.keys(curMap), ...Object.keys(prevMap)])
  return Array.from(channels).map(ch => ({
    channel: ch,
    revenue: curMap[ch]?.revenue ?? 0,
    orders: curMap[ch]?.orders ?? 0,
    prev_revenue: prevMap[ch]?.revenue ?? 0,
  })).sort((a, b) => b.revenue - a.revenue)
}

async function getRevenueTrend(supabase: any, from: string, to: string) {
  const { data } = await supabase
    .from('orders')
    .select('total_amount, order_date, channels(name)')
    .gte('order_date', from)
    .lte('order_date', to)
    .not('status', 'in', '(CANCELLED,RETURNED,REFUNDED)')
    .order('order_date', { ascending: true })

  const rows = data ?? []
  const fromDate = new Date(from)
  const toDate = new Date(to)
  const diffDays = Math.round((toDate.getTime() - fromDate.getTime()) / 86400000)

  // Group by day if <= 90 days, by month otherwise
  const byMonth = diffDays > 90

  const map: Record<string, Record<string, number>> = {}
  for (const r of rows) {
    const d = new Date(r.order_date)
    const key = byMonth
      ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const ch = r.channels?.name ?? 'Unknown'
    if (!map[key]) map[key] = {}
    map[key][ch] = (map[key][ch] ?? 0) + (r.total_amount ?? 0)
  }

  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, channels]) => {
      const shortLabel = byMonth
        ? label.slice(0, 7)
        : label.slice(5)
      return { month: shortLabel, ...channels }
    })
}

async function getOrderQuality(supabase: any, from: string, to: string) {
  const { data } = await supabase
    .from('orders')
    .select('status, channels(name)')
    .gte('order_date', from)
    .lte('order_date', to)

  const rows = data ?? []
  const total = rows.length

  const byChannel: Record<string, { total: number; cancelled: number; returned: number }> = {}
  let totalCancelled = 0
  let totalReturned = 0

  for (const r of rows) {
    const ch = r.channels?.name ?? 'Unknown'
    if (!byChannel[ch]) byChannel[ch] = { total: 0, cancelled: 0, returned: 0 }
    byChannel[ch].total += 1
    if (r.status === 'CANCELLED') { byChannel[ch].cancelled += 1; totalCancelled++ }
    if (r.status === 'RETURNED' || r.status === 'REFUNDED') { byChannel[ch].returned += 1; totalReturned++ }
  }

  return {
    total_orders: total,
    cancelled: totalCancelled,
    returned: totalReturned,
    cancel_rate: total > 0 ? Math.round((totalCancelled / total) * 1000) / 10 : 0,
    return_rate: total > 0 ? Math.round((totalReturned / total) * 1000) / 10 : 0,
    by_channel: Object.entries(byChannel).map(([channel, d]) => ({
      channel,
      cancel_rate: d.total > 0 ? Math.round((d.cancelled / d.total) * 1000) / 10 : 0,
      return_rate: d.total > 0 ? Math.round((d.returned / d.total) * 1000) / 10 : 0,
    })),
  }
}

async function getInventoryHealth(supabase: any) {
  // Inventory status breakdown
  const { data: inv } = await supabase
    .from('inventory')
    .select('inventory_status, stock_quantity, product_id, products(name, master_sku, category, updated_at)')

  const rows = inv ?? []
  const healthy    = rows.filter((r: any) => r.inventory_status === 'IN_STOCK').length
  const low_stock  = rows.filter((r: any) => r.inventory_status === 'LOW_STOCK').length
  const out_of_stock = rows.filter((r: any) => r.inventory_status === 'OUT_OF_STOCK').length

  // Dead stock: in stock but no sale movement in last 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString()
  const { data: recentSales } = await supabase
    .from('inventory_movements')
    .select('product_id')
    .eq('movement_type', 'SALE')
    .gte('created_at', thirtyDaysAgo)

  const recentSaleIds = new Set((recentSales ?? []).map((r: any) => r.product_id))

  const deadStockRows = rows.filter((r: any) =>
    r.stock_quantity > 0 && !recentSaleIds.has(r.product_id)
  )

  // Days since last sale per product
  const { data: lastSales } = await supabase
    .from('inventory_movements')
    .select('product_id, created_at')
    .eq('movement_type', 'SALE')
    .order('created_at', { ascending: false })

  const lastSaleMap: Record<string, string> = {}
  for (const s of lastSales ?? []) {
    if (!lastSaleMap[s.product_id]) lastSaleMap[s.product_id] = s.created_at
  }

  const top_dead_stock = deadStockRows
    .map((r: any) => {
      const lastSold = lastSaleMap[r.product_id]
      const daysSince = lastSold
        ? Math.round((Date.now() - new Date(lastSold).getTime()) / 86400000)
        : 999
      return {
        name: r.products?.name ?? 'Unknown',
        sku: r.products?.master_sku ?? '',
        stock: r.stock_quantity,
        last_sold_days: daysSince,
      }
    })
    .sort((a: any, b: any) => b.last_sold_days - a.last_sold_days)
    .slice(0, 5)

  // Turnover by category: avg days between purchase and sale per category
  const categoryMap: Record<string, number[]> = {}
  for (const r of rows) {
    const cat = r.products?.category ?? 'Other'
    // Use stock_quantity as proxy: higher stock = slower turnover
    // Real turnover = (avg stock / COGS) * days — simplified here
    const qty = r.stock_quantity ?? 0
    if (!categoryMap[cat]) categoryMap[cat] = []
    categoryMap[cat].push(qty)
  }

  const turnover_by_category = Object.entries(categoryMap).map(([category, qtys]) => ({
    category,
    avg_days: Math.round(qtys.reduce((s, q) => s + q, 0) / qtys.length),
  })).sort((a, b) => a.avg_days - b.avg_days).slice(0, 6)

  return {
    total_skus: rows.length,
    healthy,
    low_stock,
    out_of_stock,
    dead_stock: deadStockRows.length,
    avg_turnover_days: 0,
    top_dead_stock,
    turnover_by_category,
  }
}

async function getFinancials(supabase: any, from: string, to: string) {
  // Fetch orders + items + product costs in the period
  const { data: orderItems } = await supabase
    .from('order_items')
    .select('quantity, subtotal, product_id, orders!inner(order_date, status, channels(name))')
    .gte('orders.order_date', from)
    .lte('orders.order_date', to)
    .not('orders.status', 'in', '(CANCELLED,RETURNED,REFUNDED)')

  const productIds = [...new Set((orderItems ?? []).map((i: any) => i.product_id).filter(Boolean))]
  let costMap: Record<string, number> = {}
  let categoryMap: Record<string, string> = {}
  if (productIds.length > 0) {
    const { data: products } = await supabase
      .from('products')
      .select('id, cost, category')
      .in('id', productIds)
    for (const p of products ?? []) {
      costMap[p.id] = Number(p.cost ?? 0)
      categoryMap[p.id] = p.category ?? 'Khác'
    }
  }

  // Gross profit by channel
  const channelMap: Record<string, { revenue: number; cogs: number }> = {}
  for (const item of orderItems ?? []) {
    const ch = (item.orders as any)?.channels?.name ?? 'Unknown'
    const cogs = Number(item.quantity ?? 0) * (costMap[item.product_id] ?? 0)
    const rev = Number(item.subtotal ?? 0)
    if (!channelMap[ch]) channelMap[ch] = { revenue: 0, cogs: 0 }
    channelMap[ch].revenue += rev
    channelMap[ch].cogs += cogs
  }
  const byChannel = Object.entries(channelMap).map(([channel, d]) => ({
    channel,
    revenue: Math.round(d.revenue),
    cogs: Math.round(d.cogs),
    grossProfit: Math.round(d.revenue - d.cogs),
    margin: d.revenue > 0 ? Math.round((d.revenue - d.cogs) / d.revenue * 1000) / 10 : 0,
  })).sort((a, b) => b.revenue - a.revenue)

  // Gross profit by category
  const catMap: Record<string, { revenue: number; cogs: number }> = {}
  for (const item of orderItems ?? []) {
    const cat = categoryMap[item.product_id] ?? 'Khác'
    const cogs = Number(item.quantity ?? 0) * (costMap[item.product_id] ?? 0)
    const rev = Number(item.subtotal ?? 0)
    if (!catMap[cat]) catMap[cat] = { revenue: 0, cogs: 0 }
    catMap[cat].revenue += rev
    catMap[cat].cogs += cogs
  }
  const byCategory = Object.entries(catMap).map(([category, d]) => ({
    category,
    revenue: Math.round(d.revenue),
    cogs: Math.round(d.cogs),
    grossProfit: Math.round(d.revenue - d.cogs),
    margin: d.revenue > 0 ? Math.round((d.revenue - d.cogs) / d.revenue * 1000) / 10 : 0,
  })).sort((a, b) => b.grossProfit - a.grossProfit)

  // COGS + revenue daily trend
  const diffDays = Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86400000)
  const byMonth = diffDays > 90
  const trendMap: Record<string, { revenue: number; cogs: number }> = {}
  for (const item of orderItems ?? []) {
    const d = new Date((item.orders as any)?.order_date ?? from)
    const key = byMonth
      ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const cogs = Number(item.quantity ?? 0) * (costMap[item.product_id] ?? 0)
    const rev = Number(item.subtotal ?? 0)
    if (!trendMap[key]) trendMap[key] = { revenue: 0, cogs: 0 }
    trendMap[key].revenue += rev
    trendMap[key].cogs += cogs
  }
  const trend = Object.entries(trendMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, d]) => ({
      date: byMonth ? date.slice(0, 7) : date.slice(5),
      revenue: Math.round(d.revenue),
      cogs: Math.round(d.cogs),
      grossProfit: Math.round(d.revenue - d.cogs),
    }))

  // Supplier debt summary
  const { data: pos } = await supabase
    .from('purchase_orders')
    .select('id, purchase_order_items(quantity, cost), po_payments(amount)')
    .in('status', ['DRAFT', 'PENDING', 'APPROVED', 'RECEIVED'])

  let totalDebt = 0
  let unpaidCount = 0
  for (const po of pos ?? []) {
    const items = (po.purchase_order_items as any[]) ?? []
    const total = items.reduce((s: number, i: any) => s + Number(i.quantity) * Number(i.cost), 0)
    const paid = ((po.po_payments as any[]) ?? []).reduce((s: number, p: any) => s + Number(p.amount), 0)
    const outstanding = Math.max(0, total - paid)
    if (outstanding > 0) { totalDebt += outstanding; unpaidCount++ }
  }

  // Overall totals
  const totalRevenue = byChannel.reduce((s, c) => s + c.revenue, 0)
  const totalCogs = byChannel.reduce((s, c) => s + c.cogs, 0)
  const totalGrossProfit = totalRevenue - totalCogs
  const overallMargin = totalRevenue > 0 ? Math.round(totalGrossProfit / totalRevenue * 1000) / 10 : 0

  return {
    summary: { totalRevenue, totalCogs, totalGrossProfit, overallMargin },
    byChannel,
    byCategory,
    trend,
    supplierDebt: { totalDebt, unpaidCount },
  }
}
