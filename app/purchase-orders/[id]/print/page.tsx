import { getPurchaseOrderById } from '@/lib/actions/purchase-order.actions'
import { getCompanySettings } from '@/lib/actions/company-settings.actions'
import { POPrintView } from '@/components/purchase-orders/po-print-view'
import { notFound } from 'next/navigation'

export default async function POPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  let po: any = null
  let company: any = null
  try {
    ;[po, company] = await Promise.all([getPurchaseOrderById(id), getCompanySettings()])
  } catch {
    notFound()
  }
  if (!po) notFound()
  return <POPrintView po={po} company={company} />
}
