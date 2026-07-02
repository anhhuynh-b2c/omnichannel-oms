import Image from 'next/image'

interface ChannelIconProps {
  icon: string
  size?: number
  className?: string
}

export function ChannelIcon({ icon, size = 20, className }: ChannelIconProps) {
  if (!icon) return null;
  if (icon.startsWith('/')) {
    return (
      <Image
        src={icon}
        alt=""
        width={size}
        height={size}
        className={className}
        style={{ objectFit: 'contain' }}
      />
    )
  }
  return <span className={className}>{icon}</span>
}
