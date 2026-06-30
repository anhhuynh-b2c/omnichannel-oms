import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { InventoryTable } from '@/components/inventory/inventory-table'
import { getInventory } from '@/lib/data/inventory'

export default async function InventoryPage() {
  let data: any[] = []
  let total = 0

  try {
    const result = await getInventory({ limit: 50 })
    data = result.data
    total = result.total
  } catch {
    // Supabase not configured — show empty state
  }

  return (
    <DashboardLayout titleKey="nav.inventory">
      <InventoryTable initialData={data} total={total} />
    </DashboardLayout>
  )
}
