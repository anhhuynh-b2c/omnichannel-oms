import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { InventoryTable } from '@/components/inventory/inventory-table'
import { MOCK_INVENTORY } from '@/lib/mock-data'

export default function InventoryPage() {
  return (
    <DashboardLayout titleKey="nav.inventory">
      <InventoryTable initialData={MOCK_INVENTORY.data as any} total={MOCK_INVENTORY.total} />
    </DashboardLayout>
  )
}
