import { type LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string
  change?: number
  changeLabel?: string
  icon: LucideIcon
  iconColor?: string
  iconBg?: string
  loading?: boolean
  href?: string
}

export function StatCard({
  title,
  value,
  change,
  changeLabel,
  icon: Icon,
  iconColor = 'text-blue-600',
  iconBg = 'bg-blue-50 dark:bg-blue-950',
  loading,
  href,
}: StatCardProps) {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-10 w-10 rounded-lg" />
          </div>
        </CardContent>
      </Card>
    )
  }

  const isPositive = change !== undefined && change >= 0

  const card = (
    <Card className={cn('hover:shadow-md transition-shadow h-full', href && 'cursor-pointer hover:border-primary/40')}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            {change !== undefined && (
              <div className="flex items-center gap-1 text-xs">
                {isPositive ? (
                  <TrendingUp className="w-3 h-3 text-emerald-500" />
                ) : (
                  <TrendingDown className="w-3 h-3 text-red-500" />
                )}
                <span className={cn(isPositive ? 'text-emerald-600' : 'text-red-600', 'font-medium')}>
                  {isPositive ? '+' : ''}{change.toFixed(1)}%
                </span>
                <span className="text-muted-foreground">{changeLabel ?? 'vs last period'}</span>
              </div>
            )}
          </div>
          <div className={cn('p-2.5 rounded-lg', iconBg)}>
            <Icon className={cn('w-5 h-5', iconColor)} />
          </div>
        </div>
      </CardContent>
    </Card>
  )

  if (href) {
    return <Link href={href} className="block">{card}</Link>
  }
  return card
}
