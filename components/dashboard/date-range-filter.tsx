'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'

const PRESETS = [
  { label: '7 ngày', value: '7' },
  { label: '30 ngày', value: '30' },
  { label: '90 ngày', value: '90' },
  { label: '1 năm', value: '365' },
]

export function DateRangeFilter({ current }: { current: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function select(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('range', value)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
      {PRESETS.map(p => (
        <Button
          key={p.value}
          size="sm"
          variant={current === p.value ? 'default' : 'ghost'}
          className="h-7 px-3 text-xs"
          onClick={() => select(p.value)}
        >
          {p.label}
        </Button>
      ))}
    </div>
  )
}
