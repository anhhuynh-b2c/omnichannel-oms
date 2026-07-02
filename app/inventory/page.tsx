import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { InventoryTable } from '@/components/inventory/inventory-table'
import { getInventory } from '@/lib/data/inventory'
import { getSuppliers } from '@/lib/actions/purchase-order.actions'

export default async function InventoryPage() {
  let data: any[] = []
  let total = 0
  let suppliers: any[] = []

  try {
    const [invResult, supplierResult] = await Promise.all([
      getInventory({ limit: 50 }),
      getSuppliers(),
    ])
    data = invResult.data
    total = invResult.total
    suppliers = supplierResult
  } catch {
    // Supabase not configured — show empty state
  }

  return (
    <DashboardLayout titleKey="nav.inventory">
      <InventoryTable initialData={data} total={total} suppliers={suppliers} />
    </DashboardLayout>
  )
}
