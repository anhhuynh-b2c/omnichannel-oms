import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { FulfillmentTabs } from '@/components/fulfillment/fulfillment-tabs'
import { getMaterials } from '@/lib/actions/fulfillment.actions'
import { getProducts } from '@/lib/actions/product.actions'

export default async function FulfillmentPage() {
  let materials: any[] = []
  let materialsTotal = 0
  let products: any[] = []

  try {
    const [matResult, prodResult] = await Promise.all([
      getMaterials({ pageSize: 200 }),
      getProducts({ pageSize: 200, status: 'ACTIVE' }),
    ])
    materials = matResult.data
    materialsTotal = matResult.total
    products = prodResult.data.map((p: any) => ({
      id: p.id,
      name: p.name,
      master_sku: p.master_sku,
      category: p.category,
    }))
  } catch {
    // Supabase not configured
  }

  return (
    <DashboardLayout titleKey="nav.fulfillment">
      <FulfillmentTabs
        materials={materials}
        materialsTotal={materialsTotal}
        products={products}
      />
    </DashboardLayout>
  )
}
