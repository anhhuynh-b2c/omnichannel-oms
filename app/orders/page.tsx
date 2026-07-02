import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { OrdersTable } from '@/components/orders/orders-table'
import { getOrders, getChannels, getOrderStatusCounts } from '@/lib/data/orders'

export default async function OrdersPage() {
  let data: any[] = []
  let total = 0
  let channels: any[] = []
  let statusCounts: Record<string, number> = {}

  try {
    const [ordersResult, channelsResult, counts] = await Promise.all([
      getOrders({ limit: 100 }),
      getChannels(),
      getOrderStatusCounts(),
    ])
    data = ordersResult.data
    total = ordersResult.total
    channels = channelsResult
    statusCounts = counts
  } catch {
    // Supabase not configured — show empty state
  }

  return (
    <DashboardLayout titleKey="nav.orders">
      <OrdersTable initialData={data} total={total} channels={channels} statusCounts={statusCounts} />
    </DashboardLayout>
  )
}
