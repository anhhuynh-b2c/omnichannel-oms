import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { ProductsTable } from '@/components/products/products-table'
import { getProducts } from '@/lib/data/products'

export default async function ProductsPage() {
  let data: any[] = []
  let total = 0

  try {
    const result = await getProducts({ limit: 50 })
    data = result.data
    total = result.total
  } catch {
    // Supabase not configured — show empty state
  }

  return (
    <DashboardLayout titleKey="nav.products">
      <ProductsTable initialData={data} total={total} />
    </DashboardLayout>
  )
}
