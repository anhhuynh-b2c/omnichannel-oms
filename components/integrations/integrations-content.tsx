'use client'

import { IntegrationCard } from '@/components/integrations/integration-card'
import { SetupGuide } from '@/components/integrations/setup-guide'
import { Card, CardContent } from '@/components/ui/card'
import { Info } from 'lucide-react'
import type { ChannelName } from '@/types'
import { useI18n } from '@/lib/i18n/context'

interface Channel {
  id: string
  name: string
  icon: string | null
  status: string
}

export function IntegrationsContent({ channels }: { channels: Channel[] }) {
  const { t } = useI18n()

  const stats = [
    { label: t('integrations.connected'), value: channels.filter(c => c.status === 'CONNECTED').length, color: 'text-emerald-600' },
    { label: t('integrations.available'), value: channels.length, color: 'text-blue-600' },
    { label: t('integrations.pendingSetup'), value: channels.filter(c => c.status !== 'CONNECTED').length, color: 'text-orange-600' },
  ]

  const archItems = [
    { title: t('integrations.arch.skuMapping'), desc: t('integrations.arch.skuMappingDesc') },
    { title: t('integrations.arch.orderSync'), desc: t('integrations.arch.orderSyncDesc') },
    { title: t('integrations.arch.webhook'), desc: t('integrations.arch.webhookDesc') },
    { title: t('integrations.arch.serviceLayer'), desc: t('integrations.arch.serviceLayerDesc') },
  ]

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 text-sm">
        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-blue-800 dark:text-blue-300">{t('integrations.bannerTitle')}</p>
          <p className="text-blue-700 dark:text-blue-400 mt-0.5">{t('integrations.bannerDesc')}</p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        {stats.map(stat => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-sm text-muted-foreground mt-0.5">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Channel Cards */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
          {t('integrations.salesChannels')}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {channels.filter(c => c.name !== 'Direct').map(channel => (
            <IntegrationCard
              key={channel.id}
              id={channel.id}
              name={channel.name as ChannelName}
              icon={channel.icon ?? ''}
              status={channel.status as any}
            />
          ))}
        </div>
      </div>

      {/* Setup Guide */}
      <SetupGuide />

      {/* Architecture Note */}
      <Card className="border-dashed">
        <CardContent className="p-5">
          <h3 className="text-sm font-semibold mb-3">{t('integrations.arch.title')}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-muted-foreground">
            {archItems.map(item => (
              <div key={item.title} className="bg-muted/40 rounded-lg p-3">
                <p className="font-medium text-foreground mb-1">{item.title}</p>
                <p>{item.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
