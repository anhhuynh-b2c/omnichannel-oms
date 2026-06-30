import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { InventoryService, InsufficientStockError } from '@/lib/services/inventory.service'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { channel, customer, items, discount, shippingFee, notes } = body

    const supabase = await createClient()

    // Resolve channel id
    const { data: channelRow } = await supabase
      .from('channels')
      .select('id')
      .eq('name', channel)
      .single()

    const channelId = channelRow?.id ?? null

    // Upsert customer
    let customerId: string | null = null
    if (customer.name || customer.phone) {
      const { data: existing } = await supabase
        .from('customers')
        .select('id')
        .eq('phone', customer.phone)
        .maybeSingle()

      if (existing) {
        customerId = existing.id
        await supabase.from('customers').update({
          name: customer.name,
          address: customer.address,
        }).eq('id', existing.id)
      } else {
        const { data: newCustomer } = await supabase
          .from('customers')
          .insert({ name: customer.name, phone: customer.phone, address: customer.address })
          .select('id')
          .single()
        customerId = newCustomer?.id ?? null
      }
    }

    const subtotal = items.reduce((s: number, i: any) => s + i.price * i.qty, 0)
    const total = Math.max(0, subtotal - (discount ?? 0) + (shippingFee ?? 0))
    const orderNumber = `POS-${Date.now()}`

    // Create order
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .insert({
        order_number: orderNumber,
        channel_id: channelId,
        customer_id: customerId,
        status: 'CONFIRMED',
        total_amount: total,
        notes: notes ?? '',
      })
      .select('id')
      .single()

    if (orderErr) throw orderErr

    // Insert order items
    const orderItems = items.map((i: any) => ({
      order_id: order.id,
      product_id: i.productId,
      quantity: i.qty,
      unit_price: i.price,
    }))
    await supabase.from('order_items').insert(orderItems)

    // Deduct inventory atomically for each item
    for (const item of items) {
      await InventoryService.deductStock(item.productId, item.qty, order.id, 'SALE')
    }

    return NextResponse.json({ success: true, orderId: order.id, orderNumber })
  } catch (err: any) {
    if (err instanceof InsufficientStockError) {
      return NextResponse.json({ error: 'Không đủ hàng trong kho' }, { status: 422 })
    }
    console.error('[sale/checkout]', err)
    return NextResponse.json({ error: err.message ?? 'Lỗi hệ thống' }, { status: 500 })
  }
}
