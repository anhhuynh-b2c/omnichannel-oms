import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { CategoriesTable } from '@/components/categories/categories-table'
import { getCategories } from '@/lib/actions/category.actions'

export default async function CategoriesPage() {
  let data: any[] = []
  try {
    data = await getCategories()
  } catch (e) {
    console.error('[CategoriesPage]', e)
  }
  return (
    <DashboardLayout titleKey="nav.categories">
      <CategoriesTable initialData={data} />
    </DashboardLayout>
  )
}
