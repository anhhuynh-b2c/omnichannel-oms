import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { CustomersTable } from '@/components/customers/customers-table'
import { getCustomerList } from '@/lib/actions/customer.actions'

export default async function CustomersPage() {
  let data: any[] = []
  try {
    data = await getCustomerList()
  } catch {
    // Supabase not configured
  }
  return (
    <DashboardLayout titleKey="nav.customers">
      <CustomersTable initialData={data} />
    </DashboardLayout>
  )
}
