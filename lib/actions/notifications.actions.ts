'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { getNotificationPrefs } from '@/lib/actions/notification-preferences.actions'

export type NotifType = 'low_stock' | 'out_of_stock' | 'new_order' | 'order_status' | 'channel_error' | 'po_approved' | 'po_received'

export interface AppNotification {
  id: string
  type: NotifType
  title: string
  description: string
  created_at: string
  href?: string
}

// Returns notifications sorted newest-first, filtered by user's prefs
export async function getNotifications(): Promise<AppNotification[]> {
  const [supabase, prefs] = await Promise.all([
    createServiceClient(),
    getNotificationPrefs(),
  ])

  const results: AppNotification[] = []
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() // last 7 days

  await Promise.all([
    // Low stock & out of stock
    (async () => {
      if (!prefs.low_stock_alerts && !prefs.out_of_stock_alerts) return
      const { data } = await supabase
        .from('inventory')
        .select('id, product_id, stock_quantity, safety_stock, inventory_status, updated_at, products(id, name)')
        .in('inventory_status', ['LOW_STOCK', 'OUT_OF_STOCK'])
        .order('updated_at', { ascending: false })
        .limit(20)

      for (const row of data ?? []) {
        const isOut = row.inventory_status === 'OUT_OF_STOCK'
        if (isOut && !prefs.out_of_stock_alerts) continue
        if (!isOut && !prefs.low_stock_alerts) continue
        const product = Array.isArray(row.products) ? row.products[0] : row.products
        results.push({
          id: `${row.inventory_status.toLowerCase()}_${row.product_id}`,
          type: isOut ? 'out_of_stock' : 'low_stock',
          title: `${isOut ? 'Hết hàng' : 'Sắp hết hàng'}: ${product?.name ?? 'Sản phẩm'}`,
          description: `Tồn kho: ${row.stock_quantity} — dưới mức an toàn (${row.safety_stock})`,
          created_at: row.updated_at,
          href: '/inventory',
        })
      }
    })(),

    // New orders (PENDING in last 7 days)
    (async () => {
      if (!prefs.new_order_received) return
      const { data } = await supabase
        .from('orders')
        .select('id, order_number, total_amount, created_at, channels(name), order_items(id)')
        .eq('status', 'PENDING')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(10)

      for (const row of data ?? []) {
        const channel = Array.isArray(row.channels) ? row.channels[0] : row.channels
        const itemCount = Array.isArray(row.order_items) ? row.order_items.length : 0
        results.push({
          id: `new_order_${row.id}`,
          type: 'new_order',
          title: `Đơn hàng mới #${row.order_number}`,
          description: `${channel?.name ?? 'Kênh'} · ${itemCount} sản phẩm · ${Number(row.total_amount).toLocaleString('vi-VN')} đ`,
          created_at: row.created_at,
          href: '/orders',
        })
      }
    })(),

    // Order status changes (non-PENDING, last 24h)
    (async () => {
      if (!prefs.order_status_changes) return
      const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const { data } = await supabase
        .from('orders')
        .select('id, order_number, status, updated_at, channels(name)')
        .not('status', 'eq', 'PENDING')
        .gte('updated_at', last24h)
        .order('updated_at', { ascending: false })
        .limit(10)

      const STATUS_LABEL: Record<string, string> = {
        CONFIRMED: 'đã xác nhận',
        PACKING: 'đang đóng gói',
        READY_TO_SHIP: 'sẵn sàng giao',
        SHIPPED: 'đã giao vận chuyển',
        DELIVERED: 'đã giao thành công',
        CANCELLED: 'đã huỷ',
        RETURNED: 'đã hoàn trả',
        REFUNDED: 'đã hoàn tiền',
      }

      for (const row of data ?? []) {
        const channel = Array.isArray(row.channels) ? row.channels[0] : row.channels
        const label = STATUS_LABEL[row.status] ?? row.status
        results.push({
          id: `order_status_${row.id}`,
          type: 'order_status',
          title: `Đơn #${row.order_number} ${label}`,
          description: channel?.name ?? '',
          created_at: row.updated_at,
          href: '/orders',
        })
      }
    })(),

    // Channel sync errors
    (async () => {
      if (!prefs.channel_sync_errors) return
      const { data } = await supabase
        .from('channels')
        .select('id, name, updated_at')
        .eq('status', 'ERROR')

      for (const row of data ?? []) {
        results.push({
          id: `channel_error_${row.id}`,
          type: 'channel_error',
          title: `Lỗi đồng bộ ${row.name}`,
          description: 'Không thể đồng bộ dữ liệu — kiểm tra kết nối API',
          created_at: row.updated_at ?? new Date().toISOString(),
          href: '/integrations',
        })
      }
    })(),

    // PO approved / received (last 7 days)
    (async () => {
      if (!prefs.purchase_order_approved && !prefs.purchase_order_received) return
      const statuses = [
        ...(prefs.purchase_order_approved ? ['APPROVED'] : []),
        ...(prefs.purchase_order_received ? ['RECEIVED'] : []),
      ]
      const { data } = await supabase
        .from('purchase_orders')
        .select('id, po_number, status, updated_at, suppliers(supplier_name)')
        .in('status', statuses)
        .gte('updated_at', since)
        .order('updated_at', { ascending: false })
        .limit(10)

      for (const row of data ?? []) {
        const supplier = Array.isArray(row.suppliers) ? row.suppliers[0] : row.suppliers
        const isReceived = row.status === 'RECEIVED'
        if (isReceived && !prefs.purchase_order_received) continue
        if (!isReceived && !prefs.purchase_order_approved) continue
        results.push({
          id: `po_${row.status.toLowerCase()}_${row.id}`,
          type: isReceived ? 'po_received' : 'po_approved',
          title: `PO #${row.po_number} ${isReceived ? 'đã nhận hàng' : 'đã được duyệt'}`,
          description: supplier?.supplier_name ?? '',
          created_at: row.updated_at,
          href: '/purchase-orders',
        })
      }
    })(),
  ])

  return results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}
