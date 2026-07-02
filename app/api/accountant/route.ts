import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = req.nextUrl
  const from = searchParams.get('from') ?? new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
  const to = searchParams.get('to') ?? new Date().toISOString()
  const type = searchParams.get('type') ?? 'pl'

  if (type === 'pl') {
    // Revenue from delivered/completed orders
    const { data: orders } = await supabase
      .from('orders')
      .select('total_amount, status, order_date')
      .gte('order_date', from)
      .lte('order_date', to)
      .not('status', 'in', '(CANCELLED,RETURNED,REFUNDED)')

    const revenue = orders?.reduce((s, o) => s + Number(o.total_amount ?? 0), 0) ?? 0

    // COGS from order items × product cost
    const { data: items } = await supabase
      .from('order_items')
      .select('quantity, subtotal, product_id, orders!inner(order_date, status)')
      .gte('orders.order_date', from)
      .lte('orders.order_date', to)
      .not('orders.status', 'in', '(CANCELLED,RETURNED,REFUNDED)')

    // Get costs for all products
    const productIds = [...new Set((items ?? []).map(i => i.product_id).filter(Boolean))]
    let costMap: Record<string, number> = {}
    if (productIds.length > 0) {
      const { data: products } = await supabase
        .from('products')
        .select('id, cost')
        .in('id', productIds)
      costMap = Object.fromEntries((products ?? []).map(p => [p.id, Number(p.cost ?? 0)]))
    }

    const cogs = (items ?? []).reduce((s, i) => s + (Number(i.quantity ?? 0) * (costMap[i.product_id] ?? 0)), 0)
    const grossProfit = revenue - cogs
    const margin = revenue > 0 ? (grossProfit / revenue) * 100 : 0

    // Daily trend for chart
    const { data: trendOrders } = await supabase
      .from('orders')
      .select('order_date, total_amount')
      .gte('order_date', from)
      .lte('order_date', to)
      .not('status', 'in', '(CANCELLED,RETURNED,REFUNDED)')
      .order('order_date')

    const dailyMap: Record<string, number> = {}
    for (const o of trendOrders ?? []) {
      const day = o.order_date.slice(0, 10)
      dailyMap[day] = (dailyMap[day] ?? 0) + Number(o.total_amount ?? 0)
    }
    const trend = Object.entries(dailyMap).map(([date, rev]) => ({ date, revenue: rev }))

    return NextResponse.json({ revenue, cogs, grossProfit, margin, trend })
  }

  if (type === 'supplier_debt') {
    // Include RECEIVED too — goods arrived but may not be paid yet
    const { data: pos } = await supabase
      .from('purchase_orders')
      .select(`
        id, po_number, status, created_at, expected_date, vat_rate, shipping_fee,
        suppliers(id, supplier_name),
        purchase_order_items(quantity, cost),
        po_payments(amount)
      `)
      .in('status', ['DRAFT', 'PENDING', 'APPROVED', 'RECEIVED'])
      .order('created_at', { ascending: false })

    const rows = (pos ?? []).map((po, idx) => {
      const items = (po.purchase_order_items as any[]) ?? []
      const subtotal = items.reduce((s: number, i: any) => s + Number(i.quantity ?? 0) * Number(i.cost ?? 0), 0)
      const vatRate = Number((po as any).vat_rate ?? 0)
      const shippingFee = Number((po as any).shipping_fee ?? 0)
      const total = subtotal * (1 + vatRate / 100) + shippingFee

      const paid = ((po as any).po_payments as any[] ?? [])
        .reduce((s: number, p: any) => s + Number(p.amount ?? 0), 0)
      const outstanding = Math.max(0, total - paid)

      let paymentStatus: 'UNPAID' | 'PARTIAL' | 'PAID' = 'UNPAID'
      if (paid >= total && total > 0) paymentStatus = 'PAID'
      else if (paid > 0) paymentStatus = 'PARTIAL'

      return {
        id: po.id,
        po_number: (po as any).po_number ?? `PO-${String(idx + 1).padStart(4, '0')}`,
        status: po.status,
        created_at: po.created_at,
        expected_date: po.expected_date,
        supplier_name: (po.suppliers as any)?.supplier_name ?? 'N/A',
        supplier_id: (po.suppliers as any)?.id,
        total_amount: total,
        paid_amount: paid,
        outstanding,
        payment_status: paymentStatus,
        items_count: items.length,
      }
    }).filter(r => r.payment_status !== 'PAID') // hide fully-paid ones

    const totalDebt = rows.reduce((s, r) => s + r.outstanding, 0)
    const totalPOs = rows.length
    const overdueCount = rows.filter(r =>
      r.expected_date && new Date(r.expected_date) < new Date() && r.payment_status !== 'PAID'
    ).length

    return NextResponse.json({ rows, totalDebt, totalPOs, overdueCount })
  }

  if (type === 'transactions') {
    const page = parseInt(searchParams.get('page') ?? '1')
    const pageSize = 50

    // Fetch inventory movements + payments in parallel
    const [
      { data: movements, error: movErr },
      { data: payments, error: payErr },
    ] = await Promise.all([
      supabase
        .from('inventory_movements')
        .select(`id, qty_change, movement_type, created_at, notes, products(name, master_sku)`)
        .gte('created_at', from)
        .lte('created_at', to),
      supabase
        .from('po_payments')
        .select(`id, amount, payment_date, method, reference_number, notes, created_at, purchase_order_id`)
        .gte('created_at', from)
        .lte('created_at', to),
    ])

    if (movErr) console.error('[transactions] inventory_movements error:', movErr.message)
    if (payErr) console.error('[transactions] po_payments error:', payErr.message)

    // For payments: fetch PO details separately to avoid nested join issues
    let poMap: Record<string, { po_number: string; supplier_name: string }> = {}
    if (payments && payments.length > 0) {
      const poIds = [...new Set(payments.map(p => p.purchase_order_id).filter(Boolean))]
      const { data: pos } = await supabase
        .from('purchase_orders')
        .select(`id, po_number, suppliers(supplier_name)`)
        .in('id', poIds)
      for (const po of pos ?? []) {
        poMap[po.id] = {
          po_number: (po as any).po_number ?? '',
          supplier_name: (po.suppliers as any)?.supplier_name ?? 'NCC',
        }
      }
    }

    // Normalize to unified format
    const inventoryRows = (movements ?? []).map(m => ({
      id: m.id,
      kind: 'inventory' as const,
      created_at: m.created_at,
      type: m.movement_type,
      type_label: ({
        SALE: 'Bán hàng', PURCHASE: 'Nhập hàng', RETURN: 'Trả hàng',
        ADJUSTMENT: 'Điều chỉnh', CANCELLATION: 'Hủy đơn',
      } as Record<string, string>)[m.movement_type] ?? m.movement_type,
      description: (m.products as any)?.name ?? '—',
      sku: (m.products as any)?.master_sku ?? null,
      qty_change: m.qty_change,
      amount: null as number | null,
      reference: null as string | null,
      notes: m.notes ?? null,
    }))

    const paymentRows = (payments ?? []).map(p => {
      const po = poMap[(p as any).purchase_order_id] ?? {}
      return {
        id: p.id,
        kind: 'payment' as const,
        created_at: p.created_at,
        type: 'PAYMENT',
        type_label: 'Thanh toán NCC',
        description: `${po.po_number || 'PO'} — ${po.supplier_name || 'NCC'}`,
        sku: null as string | null,
        qty_change: null as number | null,
        amount: Number(p.amount),
        reference: p.reference_number ?? null,
        notes: p.notes ?? null,
      }
    })

    // Merge, sort by created_at desc, paginate in memory
    const all = [...inventoryRows, ...paymentRows].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

    const total = all.length
    const rows = all.slice((page - 1) * pageSize, page * pageSize)

    return NextResponse.json({ rows, total, page, pageSize })
  }

  return NextResponse.json({ error: 'Unknown type' }, { status: 400 })
}
