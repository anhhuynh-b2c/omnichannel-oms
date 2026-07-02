import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { SuppliersTable } from '@/components/suppliers/suppliers-table'
import { getSupplierList } from '@/lib/actions/supplier.actions'

export default async function SuppliersPage() {
  let data: any[] = []
  try {
    data = await getSupplierList()
  } catch {
    // Supabase not configured
  }
  return (
    <DashboardLayout titleKey="nav.suppliers">
      <SuppliersTable initialData={data} />
    </DashboardLayout>
  )
}
