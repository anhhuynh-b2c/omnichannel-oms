import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { generateOrderNumber } from '@/lib/utils/order-number'
import { parseShopeeExcel, STATUS_PRIORITY, type ShopeeOrderRow } from '@/lib/importers/shopee'
import type { OrderStatus } from '@/types'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })

    const buffer = await file.arrayBuffer()
    const rows = parseShopeeExcel(buffer)

    if (rows.length === 0) {
      return NextResponse.json({ error: 'File không có dữ liệu hoặc sai định dạng' }, { status: 400 })
    }

    const supabase = await createServiceClient()

    // Resolve Shopee channel id
    let channelId: string
    {
      const { data: ch } = await supabase.from('channels').select('id').eq('name', 'Shopee').maybeSingle()
      if (ch) {
        channelId = ch.id
      } else {
        const { data: created } = await supabase
          .from('channels').insert({ name: 'Shopee', icon: '🛒', status: 'CONNECTED' }).select('id').single()
        channelId = created!.id
      }
    }

    // Build SKU → product_id lookup
    const skus = [...new Set(rows.map(r => r.sku).filter(Boolean))]
    const { data: products } = await supabase
      .from('products')
      .select('id, master_sku')
      .in('master_sku', skus)

    const skuMap = new Map<string, string>((products ?? []).map(p => [p.master_sku, p.id]))

    // Group rows by external_order_id (one Shopee order can have multiple product rows)
    const orderMap = new Map<string, ShopeeOrderRow[]>()
    for (const row of rows) {
      const arr = orderMap.get(row.externalOrderId) ?? []
      arr.push(row)
      orderMap.set(row.externalOrderId, arr)
    }

    const results = {
      imported: 0,
      updated: 0,
      skipped_sku: [] as string[],   // orders skipped due to missing SKU
      skipped_duplicate: 0,
    }

    for (const [externalOrderId, orderRows] of orderMap) {
      const first = orderRows[0]

      // Check for missing SKUs in this order
      const missingSku = orderRows.find(r => r.sku && !skuMap.has(r.sku))
      if (missingSku) {
        results.skipped_sku.push(`${externalOrderId} (SKU: ${missingSku.sku})`)
        continue
      }

      // Check if order already exists
      const { data: existing } = await supabase
        .from('orders')
        .select('id, status')
        .eq('external_order_id', externalOrderId)
        .maybeSingle()

      if (existing) {
        // Update status only if new status has higher priority
        const currentPriority = STATUS_PRIORITY[existing.status as OrderStatus] ?? 0
        const newPriority = STATUS_PRIORITY[first.status] ?? 0
        if (newPriority > currentPriority) {
          await supabase.from('orders').update({ status: first.status }).eq('id', existing.id)
          results.updated++
        } else {
          results.skipped_duplicate++
        }
        continue
      }

      // Upsert customer by Shopee username (phone is masked so not reliable)
      let customerId: string | null = null
      {
        const { data: existing } = await supabase
          .from('customers')
          .select('id')
          .eq('shopee_username', first.buyerUsername)
          .maybeSingle()

        if (existing) {
          customerId = existing.id
        } else {
          const { data: created } = await supabase.from('customers').insert({
            name: first.recipientName || first.buyerUsername,
            phone: first.phone || null,
            address: first.address || null,
            city: first.province || null,
            district: first.district || null,
            shopee_username: first.buyerUsername || null,
            source_channel: 'Shopee',
            customer_group: 'REGULAR',
          }).select('id').single()
          customerId = created?.id ?? null
        }
      }

      const totalAmount = first.buyerPaid
      const orderNumber = await generateOrderNumber(supabase, 'Shopee')

      const { data: order, error: orderErr } = await supabase.from('orders').insert({
        order_number: orderNumber,
        external_order_id: externalOrderId,
        channel_id: channelId,
        customer_id: customerId,
        status: first.status,
        total_amount: totalAmount,
        vat_rate: 0,
        discount_amount: orderRows.reduce((s, r) => s + r.sellerDiscount, 0),
        shipping_fee: 0,
        platform_fee: orderRows.reduce((s, r) => s + r.platformFee, 0),
        payment_method: first.paymentMethod || 'OTHER',
        tracking_number: first.trackingNumber || null,
        notes: first.note || null,
        order_date: first.orderDate || new Date().toISOString(),
        created_by_name: 'Shopee Import',
      }).select('id').single()

      if (orderErr) {
        results.skipped_sku.push(`${externalOrderId} (DB error: ${orderErr.message})`)
        continue
      }

      // Insert order items
      const items = orderRows.map(r => ({
        order_id: order.id,
        product_id: skuMap.get(r.sku)!,
        quantity: r.quantity,
        unit_price: r.finalPrice,
        subtotal: r.finalPrice * r.quantity,
      }))
      await supabase.from('order_items').insert(items)

      results.imported++
    }

    return NextResponse.json({ ok: true, ...results })
  } catch (e) {
    console.error('[shopee-import]', e)
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
