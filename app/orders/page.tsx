import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { OrdersTable } from '@/components/orders/orders-table'
import { MOCK_ORDERS, MOCK_CHANNELS } from '@/lib/mock-data'

export default function OrdersPage() {
  return (
    <DashboardLayout titleKey="nav.orders">
      <OrdersTable
        initialData={MOCK_ORDERS.data as any}
        total={MOCK_ORDERS.total}
        channels={MOCK_CHANNELS}
      />
    </DashboardLayout>
  )
}
