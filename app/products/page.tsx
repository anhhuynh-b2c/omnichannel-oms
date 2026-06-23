import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { ProductsTable } from '@/components/products/products-table'
import { MOCK_PRODUCTS_WITH_INVENTORY } from '@/lib/mock-data'

export default function ProductsPage() {
  // Using mock data — swap with: await getProducts() once Supabase is configured
  const { data, total } = MOCK_PRODUCTS_WITH_INVENTORY

  return (
    <DashboardLayout titleKey="nav.products">
      <ProductsTable initialData={data} total={total} />
    </DashboardLayout>
  )
}
