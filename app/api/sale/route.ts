import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { InventoryService, InsufficientStockError } from '@/lib/services/inventory.service'
import { generateOrderNumber } from '@/lib/utils/order-number'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { channel, customer, items, discount, shippingFee, platformFee, paymentMethod, notes, vatRate } = body

    const supabase = await createServiceClient()

    // Resolve staff name server-side (bypass RLS)
    let staffName: string | null = null
    try {
      const userClient = await createClient()
      const { data: { user } } = await userClient.auth.getUser()
      if (user) {
        const { data: u } = await supabase.from('users').select('name').eq('email', user.email!).maybeSingle()
        staffName = u?.name ?? user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email?.split('@')[0] ?? null
      }
    } catch { /* ignore */ }

    // Resolve channel id — upsert if missing so POS never breaks on unknown channel name
    let channelId: string | null = null
    {
      const { data: existing } = await supabase
        .from('channels')
        .select('id')
        .eq('name', channel)
        .maybeSingle()

      if (existing) {
        channelId = existing.id
      } else {
        const { data: created } = await supabase
          .from('channels')
          .insert({ name: channel, icon: '🏪', status: 'CONNECTED' })
          .select('id')
          .single()
        channelId = created?.id ?? null
      }
    }

    if (!channelId) {
      return NextResponse.json({ error: 'Không thể xác định kênh bán' }, { status: 422 })
    }

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
          address: customer.address || null,
          ...(customer.email ? { email: customer.email } : {}),
          ...(customer.city ? { city: customer.city } : {}),
          ...(customer.district ? { district: customer.district } : {}),
          ...(customer.customer_group ? { customer_group: customer.customer_group } : {}),
        }).eq('id', existing.id)
      } else {
        const { data: newCustomer } = await supabase
          .from('customers')
          .insert({
            name: customer.name,
            phone: customer.phone || null,
            address: customer.address || null,
            email: customer.email || null,
            city: customer.city || null,
            district: customer.district || null,
            customer_group: customer.customer_group || 'REGULAR',
            source_channel: channel ?? null,
          })
          .select('id')
          .single()
        customerId = newCustomer?.id ?? null
      }
    }

    const subtotal = items.reduce((s: number, i: any) => s + i.price * i.qty, 0)
    const vatAmount = Math.round(subtotal * (vatRate ?? 0) / 100)
    const total = Math.max(0, subtotal - (discount ?? 0) - (platformFee ?? 0) + vatAmount + (shippingFee ?? 0))

    const orderNumber = await generateOrderNumber(supabase, channel)

    // Create order
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .insert({
        order_number: orderNumber,
        channel_id: channelId,
        customer_id: customerId,
        status: 'CONFIRMED',
        total_amount: total,
        vat_rate: vatRate ?? 0,
        discount_amount: discount ?? 0,
        shipping_fee: shippingFee ?? 0,
        platform_fee: platformFee ?? 0,
        payment_method: paymentMethod ?? 'CASH',
        notes: notes ?? '',
        created_by_name: staffName || null,
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
      subtotal: i.price * i.qty,
    }))
    await supabase.from('order_items').insert(orderItems)

    // Deduct inventory atomically for each item
    for (const item of items) {
      await InventoryService.deductStock(item.productId, item.qty, order.id, 'SALE')
    }

    // Audit log — get user from session cookie
    try {
      const userClient = await createClient()
      const { data: { user } } = await userClient.auth.getUser()
      if (user) {
        await supabase.from('audit_logs').insert({
          user_id: user.id,
          user_email: user.email ?? 'unknown',
          user_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
          action: 'CREATE',
          resource_type: 'order',
          resource_id: order.id,
          resource_label: orderNumber,
          new_data: {
            channel,
            total,
            item_count: items.length,
            payment_method: paymentMethod ?? 'CASH',
          },
        })
      }
    } catch { /* audit failure must not break checkout */ }

    return NextResponse.json({ success: true, orderId: order.id, orderNumber })
  } catch (err: any) {
    if (err instanceof InsufficientStockError) {
      return NextResponse.json({ error: 'Không đủ hàng trong kho' }, { status: 422 })
    }
    console.error('[sale/checkout]', err)
    return NextResponse.json({ error: err.message ?? 'Lỗi hệ thống' }, { status: 500 })
  }
}
