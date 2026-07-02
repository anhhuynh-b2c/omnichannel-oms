import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { IntegrationsContent } from '@/components/integrations/integrations-content'
import { getChannelsWithStatus } from '@/lib/data/dashboard'

export default async function IntegrationsPage() {
  let channels: Awaited<ReturnType<typeof getChannelsWithStatus>> = []
  try {
    channels = await getChannelsWithStatus()
  } catch {
    // Supabase not configured
  }

  return (
    <DashboardLayout titleKey="nav.integrations">
      <IntegrationsContent channels={channels} />
    </DashboardLayout>
  )
}
