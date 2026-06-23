import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { POTable } from '@/components/purchase-orders/po-table'
import { MOCK_PURCHASE_ORDERS, MOCK_SUPPLIERS } from '@/lib/mock-data'

export default function PurchaseOrdersPage() {
  return (
    <DashboardLayout titleKey="nav.purchaseOrders">
      <POTable
        initialData={MOCK_PURCHASE_ORDERS as any}
        total={MOCK_PURCHASE_ORDERS.length}
        suppliers={MOCK_SUPPLIERS}
      />
    </DashboardLayout>
  )
}
