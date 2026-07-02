'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { CalendarDays, ChevronDown, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export type TimeRange =
  | { type: 'today' }
  | { type: '7d' }
  | { type: '30d' }
  | { type: 'this_week' }
  | { type: 'this_month' }
  | { type: 'this_quarter' }
  | { type: 'this_year' }
  | { type: 'custom'; from: string; to: string }

export function getDateRange(range: TimeRange): { from: Date; to: Date } {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  switch (range.type) {
    case 'today':
      return { from: today, to: now }
    case '7d':
      return { from: new Date(today.getTime() - 6 * 86400000), to: now }
    case '30d':
      return { from: new Date(today.getTime() - 29 * 86400000), to: now }
    case 'this_week': {
      const day = today.getDay()
      const monday = new Date(today.getTime() - ((day === 0 ? 6 : day - 1) * 86400000))
      return { from: monday, to: now }
    }
    case 'this_month':
      return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now }
    case 'this_quarter': {
      const q = Math.floor(now.getMonth() / 3)
      return { from: new Date(now.getFullYear(), q * 3, 1), to: now }
    }
    case 'this_year':
      return { from: new Date(now.getFullYear(), 0, 1), to: now }
    case 'custom':
      return { from: new Date(range.from), to: new Date(range.to + 'T23:59:59') }
  }
}

const PRESETS: { label: string; value: TimeRange }[] = [
  { label: 'Hôm nay',   value: { type: 'today' } },
  { label: '7 ngày qua', value: { type: '7d' } },
  { label: '30 ngày qua', value: { type: '30d' } },
  { label: 'Tuần này',  value: { type: 'this_week' } },
  { label: 'Tháng này', value: { type: 'this_month' } },
  { label: 'Quý này',   value: { type: 'this_quarter' } },
  { label: 'Năm này',   value: { type: 'this_year' } },
]

function formatLabel(range: TimeRange): string {
  const found = PRESETS.find(p => p.value.type === range.type)
  if (found) return found.label
  if (range.type === 'custom') {
    const fmt = (s: string) => {
      const [y, m, d] = s.split('-')
      return `${d}/${m}/${y}`
    }
    return `${fmt(range.from)} – ${fmt(range.to)}`
  }
  return ''
}

interface TimeRangePickerProps {
  value: TimeRange
  onChange: (range: TimeRange) => void
}

export function TimeRangePicker({ value, onChange }: TimeRangePickerProps) {
  const [open, setOpen] = useState(false)
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function applyCustom() {
    if (customFrom && customTo && customFrom <= customTo) {
      onChange({ type: 'custom', from: customFrom, to: customTo })
      setOpen(false)
    }
  }

  return (
    <div ref={ref} className="relative">
      <Button
        variant="outline"
        size="sm"
        className="h-9 gap-2 pr-3 font-normal"
        onClick={() => setOpen(o => !o)}
      >
        <CalendarDays className="w-4 h-4 text-muted-foreground" />
        <span>{formatLabel(value)}</span>
        <ChevronDown className={cn('w-3.5 h-3.5 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </Button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-64 rounded-xl border bg-background shadow-lg p-1">
          {/* Presets */}
          <div className="py-1">
            {PRESETS.map(preset => (
              <button
                key={preset.value.type}
                className={cn(
                  'w-full text-left px-3 py-1.5 text-sm rounded-lg hover:bg-muted transition-colors',
                  value.type === preset.value.type && 'bg-muted font-medium text-foreground'
                )}
                onClick={() => { onChange(preset.value); setOpen(false) }}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="border-t my-1" />

          {/* Custom range */}
          <div className="px-2 py-2 space-y-2">
            <p className="text-xs font-medium text-muted-foreground px-1">Tùy chỉnh</p>
            <div className="grid grid-cols-2 gap-1.5">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Từ ngày</label>
                <input
                  type="date"
                  value={customFrom}
                  max={customTo || undefined}
                  onChange={e => setCustomFrom(e.target.value)}
                  className="w-full h-8 px-2 text-xs rounded-lg border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Đến ngày</label>
                <input
                  type="date"
                  value={customTo}
                  min={customFrom || undefined}
                  onChange={e => setCustomTo(e.target.value)}
                  className="w-full h-8 px-2 text-xs rounded-lg border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>
            <Button
              size="sm"
              className="w-full h-7 text-xs"
              disabled={!customFrom || !customTo || customFrom > customTo}
              onClick={applyCustom}
            >
              Áp dụng
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
