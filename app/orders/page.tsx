import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { OrdersTable } from '@/components/orders/orders-table'
import { getOrders, getChannels } from '@/lib/data/orders'

export default async function OrdersPage() {
  let data: any[] = []
  let total = 0
  let channels: any[] = []

  try {
    const [ordersResult, channelsResult] = await Promise.all([
      getOrders({ limit: 50 }),
      getChannels(),
    ])
    data = ordersResult.data
    total = ordersResult.total
    channels = channelsResult
  } catch {
    // Supabase not configured — show empty state
  }

  return (
    <DashboardLayout titleKey="nav.orders">
      <OrdersTable initialData={data} total={total} channels={channels} />
    </DashboardLayout>
  )
}
