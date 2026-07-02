import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { POTable } from '@/components/purchase-orders/po-table'
import { getPurchaseOrders, getSuppliers } from '@/lib/actions/purchase-order.actions'
import { getCompanySettings } from '@/lib/actions/company-settings.actions'
import { getProducts } from '@/lib/data/products'
import type { CompanySettings } from '@/types'

export default async function PurchaseOrdersPage() {
  let data: any[] = []
  let total = 0
  let suppliers: any[] = []
  let products: { id: string; name: string; master_sku: string; cost?: number | null }[] = []
  let companySettings: CompanySettings | null = null

  try {
    const [poResult, supplierResult, productResult, settingsResult] = await Promise.all([
      getPurchaseOrders({ pageSize: 50 }),
      getSuppliers(),
      getProducts({ limit: 200 }),
      getCompanySettings(),
    ])
    data = poResult.data
    total = poResult.total
    suppliers = supplierResult
    products = productResult.data.map((p: any) => ({ id: p.id, name: p.name, master_sku: p.master_sku, cost: p.cost }))
    companySettings = settingsResult
  } catch {
    // Supabase not configured
  }

  return (
    <DashboardLayout titleKey="nav.purchaseOrders">
      <POTable initialData={data} total={total} suppliers={suppliers} products={products} companySettings={companySettings} />
    </DashboardLayout>
  )
}
