import { cn } from '@/lib/utils'
import type { ChannelName } from '@/types'
import { CHANNEL_ICONS } from '@/constants'
import { ChannelIcon } from '@/components/shared/channel-icon'

interface ChannelBadgeProps {
  name: string
  className?: string
  showIcon?: boolean
}

export function ChannelBadge({ name, className, showIcon = true }: ChannelBadgeProps) {
  const icon = CHANNEL_ICONS[name as ChannelName] ?? '🏪'

  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-foreground',
      className
    )}>
      {showIcon && <ChannelIcon icon={icon} size={14} />}
      <span>{name}</span>
    </span>
  )
}
